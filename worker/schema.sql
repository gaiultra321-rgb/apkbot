-- এই ফাইলটা D1 ডাটাবেসে একবার রান করতে হবে (dashboard Console অথবা wrangler CLI দিয়ে)
CREATE TABLE IF NOT EXISTS sessions (
  chat_id     INTEGER PRIMARY KEY,
  mode        TEXT,
  step        TEXT,
  app_name    TEXT,
  splash_mode TEXT,
  build_type  TEXT,
  icon_custom INTEGER DEFAULT 0,
  perms       TEXT DEFAULT '[]',
  updated_at  INTEGER
);
