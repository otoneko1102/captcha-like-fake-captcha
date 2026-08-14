CREATE TABLE IF NOT EXISTS tokens (
  token TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  answer TEXT,
  ip_address TEXT,
  createdAt INTEGER NOT NULL
)
