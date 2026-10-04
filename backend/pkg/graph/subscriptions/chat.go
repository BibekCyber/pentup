package subscriptions

import (
	"context"

	"pentagi/pkg/database"
	"pentagi/pkg/database/converter"
	"pentagi/pkg/graph/model"
)

// Chat sessions are private: session events are published to their owner
// only, and message events to subscribers of that one session, whose
// ownership the resolver checks before subscribing.

type ChatSubscriber interface {
	ChatSessionCreated(ctx context.Context) (<-chan *model.ChatSession, error)
	ChatSessionUpdated(ctx context.Context) (<-chan *model.ChatSession, error)
	ChatSessionDeleted(ctx context.Context) (<-chan *model.ChatSession, error)
	ChatMessageAdded(ctx context.Context, sessionID int64) (<-chan *model.ChatMessage, error)
	ChatMessageUpdated(ctx context.Context, sessionID int64) (<-chan *model.ChatMessage, error)
}

// ChatPublisher satisfies chat.Publisher.
type ChatPublisher interface {
	ChatSessionCreated(ctx context.Context, userID int64, session database.ChatSession)
	ChatSessionUpdated(ctx context.Context, userID int64, session database.ChatSession)
	ChatSessionDeleted(ctx context.Context, userID int64, session database.ChatSession)
	ChatMessageAdded(ctx context.Context, userID int64, message database.ChatMessage)
	ChatMessageUpdated(ctx context.Context, userID int64, message database.ChatMessage)
}

func (s *controller) NewChatSubscriber(userID int64) ChatSubscriber {
	return &chatSubscriber{userID: userID, ctrl: s}
}

func (s *controller) NewChatPublisher() ChatPublisher {
	return &chatPublisher{ctrl: s}
}

type chatSubscriber struct {
	userID int64
	ctrl   *controller
}

func (s *chatSubscriber) ChatSessionCreated(ctx context.Context) (<-chan *model.ChatSession, error) {
	return s.ctrl.chatSessionCreated.Subscribe(ctx, s.userID), nil
}

func (s *chatSubscriber) ChatSessionUpdated(ctx context.Context) (<-chan *model.ChatSession, error) {
	return s.ctrl.chatSessionUpdated.Subscribe(ctx, s.userID), nil
}

func (s *chatSubscriber) ChatSessionDeleted(ctx context.Context) (<-chan *model.ChatSession, error) {
	return s.ctrl.chatSessionDeleted.Subscribe(ctx, s.userID), nil
}

func (s *chatSubscriber) ChatMessageAdded(ctx context.Context, sessionID int64) (<-chan *model.ChatMessage, error) {
	return s.ctrl.chatMessageAdded.Subscribe(ctx, sessionID), nil
}

func (s *chatSubscriber) ChatMessageUpdated(ctx context.Context, sessionID int64) (<-chan *model.ChatMessage, error) {
	return s.ctrl.chatMessageUpdated.Subscribe(ctx, sessionID), nil
}

type chatPublisher struct {
	ctrl *controller
}

func (p *chatPublisher) ChatSessionCreated(ctx context.Context, userID int64, session database.ChatSession) {
	p.ctrl.chatSessionCreated.Publish(ctx, userID, converter.ConvertChatSession(session))
}

func (p *chatPublisher) ChatSessionUpdated(ctx context.Context, userID int64, session database.ChatSession) {
	p.ctrl.chatSessionUpdated.Publish(ctx, userID, converter.ConvertChatSession(session))
}

func (p *chatPublisher) ChatSessionDeleted(ctx context.Context, userID int64, session database.ChatSession) {
	p.ctrl.chatSessionDeleted.Publish(ctx, userID, converter.ConvertChatSession(session))
}

func (p *chatPublisher) ChatMessageAdded(ctx context.Context, userID int64, message database.ChatMessage) {
	p.ctrl.chatMessageAdded.Publish(ctx, message.SessionID, converter.ConvertChatMessage(message))
}

func (p *chatPublisher) ChatMessageUpdated(ctx context.Context, userID int64, message database.ChatMessage) {
	p.ctrl.chatMessageUpdated.Publish(ctx, message.SessionID, converter.ConvertChatMessage(message))
}
