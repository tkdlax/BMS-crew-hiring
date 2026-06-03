-- Per-office webhook URLs (one URL per event type).

IF COL_LENGTH('hire_offices', 'webhooks_json') IS NULL
  ALTER TABLE hire_offices ADD webhooks_json NVARCHAR(MAX) NULL;
