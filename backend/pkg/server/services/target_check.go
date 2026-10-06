package services

import (
	"errors"
	"net/http"
	"slices"
	"strconv"

	"pentagi/pkg/server/logger"
	"pentagi/pkg/server/models"
	"pentagi/pkg/server/response"
	"pentagi/pkg/targetcheck"

	"github.com/gin-gonic/gin"
)

type TargetCheckService struct {
	checker *targetcheck.Service
}

func NewTargetCheckService(checker *targetcheck.Service) *TargetCheckService {
	return &TargetCheckService{checker: checker}
}

// CheckTarget is a function to validate and probe a scan target
// @Summary Check whether a scan target is valid and reachable
// @Tags Targets
// @Produce json
// @Security BearerAuth
// @Param target query string true "domain, URL, IP or cloud account identifier"
// @Success 200 {object} response.successResp{data=models.TargetCheck} "target checked successfully"
// @Failure 400 {object} response.errorResp "target parameter is missing"
// @Failure 403 {object} response.errorResp "checking targets not permitted"
// @Failure 429 {object} response.errorResp "too many target checks"
// @Failure 500 {object} response.errorResp "internal error on checking target"
// @Router /targets/check [get]
func (s *TargetCheckService) CheckTarget(c *gin.Context) {
	privs := c.GetStringSlice("prm")
	if !slices.Contains(privs, "domains.create") {
		logger.FromContext(c).Errorf("error filtering user role permissions: permission not found")
		response.Error(c, response.ErrNotPermitted, nil)
		return
	}

	target := c.Query("target")
	if target == "" {
		response.Error(c, response.ErrTargetCheckMissingTarget, nil)
		return
	}

	if s.checker == nil {
		logger.FromContext(c).Error("target checker is not configured")
		response.Error(c, response.ErrInternalServiceNotFound, nil)
		return
	}

	uid := int64(c.GetUint64("uid"))

	res, err := s.checker.Check(c.Request.Context(), uid, target)
	if err != nil {
		var limited *targetcheck.ErrRateLimited
		if errors.As(err, &limited) {
			c.Header("Retry-After", strconv.Itoa(int(limited.RetryAfter.Seconds())+1))
			response.Error(c, response.ErrTargetCheckRateLimited, err)
			return
		}
		logger.FromContext(c).WithError(err).Error("error checking target")
		response.Error(c, response.ErrInternal, err)
		return
	}

	response.Success(c, http.StatusOK, models.NewTargetCheck(res))
}
