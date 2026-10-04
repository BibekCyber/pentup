package graph

import (
	"context"
	"errors"
	"fmt"

	"pentagi/pkg/chat"
	"pentagi/pkg/graph/model"
)

// validateChatSession checks chat.use and that the caller is a logged in
// user. API tokens cannot chat, so the chat cannot be scripted into a general
// purpose LLM proxy.
func validateChatSession(ctx context.Context) (int64, error) {
	uid, _, err := validatePermission(ctx, "chat.use")
	if err != nil {
		return 0, err
	}

	isUserSession, err := validateUserType(ctx, userSessionTypes...)
	if err != nil {
		return 0, err
	}

	if !isUserSession {
		return 0, fmt.Errorf("unauthorized: non-user session is not allowed to use the chat")
	}

	return uid, nil
}

// chatError passes messages meant for the user through and replaces
// anything internal (database or provider errors) with a generic one.
func (r *Resolver) chatError(err error, action string) error {
	var userErr *chat.UserError
	if errors.As(err, &userErr) {
		return userErr
	}

	r.Logger.WithError(err).Errorf("chat: failed to %s", action)
	return fmt.Errorf("failed to %s", action)
}

func convertChatQuota(quota chat.Quota) *model.ChatQuota {
	return &model.ChatQuota{
		MessagesUsed:    quota.MessagesUsed,
		MessagesLimit:   quota.MessagesLimit,
		MessagesResetAt: quota.MessagesResetAt,
		TokensUsed:      int(quota.TokensUsed),
		TokensLimit:     int(quota.TokensLimit),
		TokensResetAt:   quota.TokensResetAt,
		MaxInputChars:   quota.MaxInputChars,
	}
}
