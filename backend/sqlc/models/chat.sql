-- Pentest chat. Every session query is scoped by user_id: sessions are
-- private to their owner, and there is no admin view.

-- name: CreateChatSession :one
INSERT INTO chat_sessions (
  user_id,
  title,
  provider_name
) VALUES (
  $1,
  $2,
  $3
)
RETURNING *;

-- name: GetUserChatSessions :many
SELECT * FROM chat_sessions
WHERE user_id = $1
ORDER BY updated_at DESC;

-- name: GetUserChatSession :one
SELECT * FROM chat_sessions
WHERE id = $1 AND user_id = $2;

-- name: UpdateUserChatSessionTitle :one
UPDATE chat_sessions
SET title = $3
WHERE id = $1 AND user_id = $2
RETURNING *;

-- Replaces the placeholder title with a generated one, unless the user
-- renamed the session in the meantime.
-- name: ReplaceChatSessionTitle :one
UPDATE chat_sessions
SET title = $3
WHERE id = $1 AND title = $2
RETURNING *;

-- Records the provider of the latest message; also bumps updated_at so the
-- session moves to the top of the history list.
-- name: TouchChatSession :one
UPDATE chat_sessions
SET provider_name = $2
WHERE id = $1
RETURNING *;

-- name: UpdateChatSessionSummary :one
UPDATE chat_sessions
SET summary = $2, summary_through_id = $3
WHERE id = $1
RETURNING *;

-- name: DeleteUserChatSession :one
DELETE FROM chat_sessions
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: CreateChatMessage :one
INSERT INTO chat_messages (
  session_id,
  role,
  status,
  content,
  provider_name,
  model
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
)
RETURNING *;

-- name: GetChatMessages :many
SELECT * FROM chat_messages
WHERE session_id = $1
ORDER BY id ASC;

-- Messages not yet folded into the session summary, oldest first.
-- name: GetChatMessagesAfter :many
SELECT * FROM chat_messages
WHERE session_id = $1 AND id > $2
ORDER BY id ASC;

-- name: GetUserChatMessage :one
SELECT m.* FROM chat_messages m
INNER JOIN chat_sessions s ON m.session_id = s.id
WHERE m.id = $1 AND s.user_id = $2;

-- Final write of a reply. Guarded on 'streaming' so a stop and a finish
-- racing each other cannot overwrite the one that landed first.
-- name: FinishChatMessage :one
UPDATE chat_messages
SET status = $2, content = $3, model = $4
WHERE id = $1 AND status = 'streaming'
RETURNING *;

-- Replies cannot outlive the process that streams them: anything still
-- streaming at startup was cut off by a restart.
-- name: FailStreamingChatMessages :exec
UPDATE chat_messages
SET status = 'error'
WHERE status = 'streaming';

-- name: CreateChatUsage :one
INSERT INTO chat_usage (
  user_id,
  kind,
  session_id,
  message_id,
  usage_in,
  usage_out,
  cost_in,
  cost_out
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8
)
RETURNING *;

-- Addressed by the ledger row's own id, not message_id: deleting the chat
-- mid-reply nulls message_id, and the reply's tokens must still be counted.
-- name: UpdateChatUsage :exec
UPDATE chat_usage
SET usage_in = $2, usage_out = $3, cost_in = $4, cost_out = $5
WHERE id = $1;

-- A reply that failed before the provider billed anything gives the user
-- their message back.
-- name: DeleteUnbilledChatUsage :exec
DELETE FROM chat_usage
WHERE id = $1 AND usage_in = 0 AND usage_out = 0;

-- name: GetUserChatReplyStats :one
SELECT
  COUNT(*)::BIGINT AS count,
  COALESCE(MIN(created_at), NOW())::TIMESTAMPTZ AS oldest
FROM chat_usage
WHERE user_id = $1 AND kind = 'reply' AND created_at > $2;

-- name: GetUserChatTokenStats :one
SELECT
  COALESCE(SUM(usage_in + usage_out), 0)::BIGINT AS tokens,
  COALESCE(MIN(created_at), NOW())::TIMESTAMPTZ AS oldest
FROM chat_usage
WHERE user_id = $1 AND created_at > $2;
