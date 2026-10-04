-- +goose Up
-- +goose StatementBegin
-- Pentest chat: a plain conversation with the user's LLM provider. No flow,
-- no container, no tools. Sessions are private to their owner.
CREATE TYPE CHAT_MESSAGE_ROLE AS ENUM ('user', 'assistant');

CREATE TYPE CHAT_MESSAGE_STATUS AS ENUM (
  'streaming',
  'done',
  -- The model judged the question outside the security scope.
  'refused',
  'error',
  'stopped'
);

CREATE TYPE CHAT_USAGE_KIND AS ENUM ('reply', 'title', 'summary');

-- summary / summary_through_id hold the rolling summary of older turns:
-- every message with id <= summary_through_id is represented by summary and
-- is no longer sent to the model verbatim.
CREATE TABLE chat_sessions (
  id                  BIGINT      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id             BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  provider_name       TEXT        NOT NULL,
  summary             TEXT        NOT NULL DEFAULT '',
  summary_through_id  BIGINT      NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX chat_sessions_user_id_updated_at_idx ON chat_sessions(user_id, updated_at DESC);

CREATE TABLE chat_messages (
  id             BIGINT              PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id     BIGINT              NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role           CHAT_MESSAGE_ROLE   NOT NULL,
  status         CHAT_MESSAGE_STATUS NOT NULL,
  content        TEXT                NOT NULL DEFAULT '',
  provider_name  TEXT                NOT NULL DEFAULT '',
  model          TEXT                NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ         NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX chat_messages_session_id_idx ON chat_messages(session_id, id);
CREATE INDEX chat_messages_streaming_idx ON chat_messages(status) WHERE status = 'streaming';

-- Append-only usage ledger behind the message rate limit and the token
-- budget. It deliberately does not cascade from sessions or messages:
-- deleting a chat must not hand a user their quota back.
CREATE TABLE chat_usage (
  id           BIGINT          PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id      BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         CHAT_USAGE_KIND NOT NULL,
  session_id   BIGINT          NULL REFERENCES chat_sessions(id) ON DELETE SET NULL,
  message_id   BIGINT          NULL REFERENCES chat_messages(id) ON DELETE SET NULL,
  usage_in     BIGINT          NOT NULL DEFAULT 0,
  usage_out    BIGINT          NOT NULL DEFAULT 0,
  cost_in      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  cost_out     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX chat_usage_user_id_created_at_idx ON chat_usage(user_id, created_at);
CREATE INDEX chat_usage_message_id_idx ON chat_usage(message_id);

CREATE TRIGGER update_chat_sessions_modified
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_chat_messages_modified
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

INSERT INTO privileges (role_id, name) VALUES
  (1, 'chat.use'),
  (2, 'chat.use')
  ON CONFLICT DO NOTHING;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM privileges WHERE name = 'chat.use';

DROP TABLE IF EXISTS chat_usage;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;

DROP TYPE IF EXISTS CHAT_USAGE_KIND;
DROP TYPE IF EXISTS CHAT_MESSAGE_STATUS;
DROP TYPE IF EXISTS CHAT_MESSAGE_ROLE;
-- +goose StatementEnd
