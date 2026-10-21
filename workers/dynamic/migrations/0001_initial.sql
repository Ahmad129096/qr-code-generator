CREATE TABLE owners (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE codes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  password_salt TEXT,
  password_hash TEXT,
  expires_at INTEGER,
  max_scans INTEGER NOT NULL DEFAULT 1000,
  monthly_scans INTEGER NOT NULL DEFAULT 0,
  month_key TEXT NOT NULL DEFAULT '',
  custom_domain TEXT,
  disabled_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX codes_owner_active ON codes(owner_id, expires_at);
CREATE INDEX codes_slug ON codes(slug);

CREATE TABLE custom_domains (
  host TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  verification_token TEXT NOT NULL,
  verified_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE scan_aggregates (
  code_id TEXT NOT NULL REFERENCES codes(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  country TEXT NOT NULL,
  device TEXT NOT NULL,
  scans INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (code_id, day_key, country, device)
);

CREATE TABLE abuse_reports (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE INDEX abuse_reports_status_created ON abuse_reports(status, created_at);
