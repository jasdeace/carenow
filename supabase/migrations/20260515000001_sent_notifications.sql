-- Dedup table to prevent duplicate push notifications
-- when the cron window overlaps across multiple ticks
CREATE TABLE IF NOT EXISTS sent_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notification_key text NOT NULL UNIQUE,
  sent_at timestamptz DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_sent_notifications_sent_at ON sent_notifications(sent_at);
