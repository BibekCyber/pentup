package graph

import (
	"errors"

	"pentagi/pkg/controller"

	"github.com/vektah/gqlparser/v2/gqlerror"
)

// quotaGraphQLError converts a controller.QuotaError into a GraphQL error with
// extensions.code = "QUOTA_EXCEEDED" so the frontend can match on the code while
// showing the human-readable message. Non-quota errors pass through unchanged.
func quotaGraphQLError(err error) error {
	var quotaErr *controller.QuotaError
	if !errors.As(err, &quotaErr) {
		return err
	}

	return &gqlerror.Error{
		Message: quotaErr.Error(),
		Extensions: map[string]interface{}{
			"code":    "QUOTA_EXCEEDED",
			"quota":   quotaErr.Quota,
			"current": quotaErr.Current,
			"max":     quotaErr.Max,
		},
	}
}
