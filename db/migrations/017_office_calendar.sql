-- Office calendar feeds, portal passwords, and time-window availability blocks

IF COL_LENGTH('hire_offices', 'calendar_feed_token') IS NULL
  ALTER TABLE hire_offices ADD calendar_feed_token NVARCHAR(64) NULL;

IF COL_LENGTH('hire_offices', 'office_password_hash') IS NULL
  ALTER TABLE hire_offices ADD office_password_hash NVARCHAR(255) NULL;

GO

UPDATE hire_offices
SET calendar_feed_token = LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''))
    + LOWER(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''))
WHERE calendar_feed_token IS NULL;

GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'UQ_hire_offices_calendar_feed_token' AND object_id = OBJECT_ID('hire_offices')
)
BEGIN
  CREATE UNIQUE INDEX UQ_hire_offices_calendar_feed_token
    ON hire_offices(calendar_feed_token)
    WHERE calendar_feed_token IS NOT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_availability_blocks')
CREATE TABLE hire_availability_blocks (
  id INT IDENTITY(1,1) PRIMARY KEY,
  scope NVARCHAR(16) NOT NULL,
  scope_id INT NOT NULL,
  starts_at DATETIME2 NOT NULL,
  ends_at DATETIME2 NOT NULL,
  note NVARCHAR(500) NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_hire_availability_blocks_scope' AND object_id = OBJECT_ID('hire_availability_blocks')
)
CREATE INDEX IX_hire_availability_blocks_scope
  ON hire_availability_blocks(scope, scope_id, starts_at);
