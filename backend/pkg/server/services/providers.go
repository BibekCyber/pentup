package services

import (
	"net/http"
	"slices"

	"pentagi/pkg/providers"
	"pentagi/pkg/server/logger"
	"pentagi/pkg/server/models"
	"pentagi/pkg/server/response"

	"github.com/gin-gonic/gin"
)

type ProviderService struct {
	providers providers.ProviderController
}

func NewProviderService(providers providers.ProviderController) *ProviderService {
	return &ProviderService{
		providers: providers,
	}
}

// GetProviders is a function to return providers list
// @Summary Retrieve providers list
// @Tags Providers
// @Produce json
// @Security BearerAuth
// @Success 200 {object} response.successResp{data=models.ProviderInfo} "providers list received successful"
// @Failure 403 {object} response.errorResp "getting providers not permitted"
// @Router /providers/ [get]
func (s *ProviderService) GetProviders(c *gin.Context) {
	privs := c.GetStringSlice("prm")
	if !slices.Contains(privs, "providers.view") {
		logger.FromContext(c).Errorf("error filtering user role permissions: permission not found")
		response.Error(c, response.ErrNotPermitted, nil)
		return
	}

	// Providers are hidden from everyone who cannot manage them: their work
	// always runs on the shared default, so there is nothing for them to pick.
	if !canManageProviders(c) {
		response.Success(c, http.StatusOK, []models.ProviderInfo{})
		return
	}

	providers, err := s.providers.GetProviders(c)
	if err != nil {
		logger.FromContext(c).Errorf("error getting providers: %v", err)
		response.Error(c, response.ErrInternal, nil)
		return
	}

	providerInfos := make([]models.ProviderInfo, len(providers))
	for i, name := range providers.ListNames() {
		providerInfos[i] = models.ProviderInfo{
			Name: name.String(),
			Type: models.ProviderType(providers[name].Type()),
		}
	}

	response.Success(c, http.StatusOK, providerInfos)
}

// canManageProviders reports whether the caller may see, choose and manage
// providers. Everyone else's flows and assistants run on the shared default.
func canManageProviders(c *gin.Context) bool {
	return slices.Contains(c.GetStringSlice("prm"), "settings.providers.admin")
}
