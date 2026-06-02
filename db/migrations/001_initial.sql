-- BMS Crew Hiring - initial schema (hire_ prefix)

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_offices')
CREATE TABLE hire_offices (
  id INT IDENTITY(1,1) PRIMARY KEY,
  slug NVARCHAR(100) NOT NULL UNIQUE,
  name NVARCHAR(200) NOT NULL,
  timezone NVARCHAR(64) NOT NULL,
  location_label NVARCHAR(500) NOT NULL,
  active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_jobs')
CREATE TABLE hire_jobs (
  id INT IDENTITY(1,1) PRIMARY KEY,
  office_id INT NOT NULL REFERENCES hire_offices(id),
  slug NVARCHAR(100) NOT NULL,
  title NVARCHAR(200) NOT NULL,
  active BIT NOT NULL DEFAULT 1,
  form_fields NVARCHAR(MAX) NULL,
  page_content NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_hire_jobs_office_slug UNIQUE (office_id, slug)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_applications')
CREATE TABLE hire_applications (
  id INT IDENTITY(1,1) PRIMARY KEY,
  job_id INT NOT NULL REFERENCES hire_jobs(id),
  first_name NVARCHAR(100) NOT NULL,
  last_name NVARCHAR(100) NOT NULL,
  email NVARCHAR(255) NOT NULL,
  phone NVARCHAR(20) NOT NULL,
  custom_fields NVARCHAR(MAX) NULL,
  status NVARCHAR(32) NOT NULL DEFAULT 'submitted',
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_application_tokens')
CREATE TABLE hire_application_tokens (
  id INT IDENTITY(1,1) PRIMARY KEY,
  application_id INT NOT NULL REFERENCES hire_applications(id),
  token NVARCHAR(128) NOT NULL UNIQUE,
  purpose NVARCHAR(32) NOT NULL DEFAULT 'schedule',
  expires_at DATETIME2 NOT NULL,
  used_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_interview_bookings')
CREATE TABLE hire_interview_bookings (
  id INT IDENTITY(1,1) PRIMARY KEY,
  application_id INT NOT NULL UNIQUE REFERENCES hire_applications(id),
  office_id INT NOT NULL REFERENCES hire_offices(id),
  starts_at DATETIME2 NOT NULL,
  ends_at DATETIME2 NOT NULL,
  applicant_timezone NVARCHAR(64) NOT NULL,
  status NVARCHAR(32) NOT NULL DEFAULT 'confirmed',
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_message_templates')
CREATE TABLE hire_message_templates (
  id INT IDENTITY(1,1) PRIMARY KEY,
  template_key NVARCHAR(100) NOT NULL,
  channel NVARCHAR(16) NOT NULL,
  scope NVARCHAR(16) NOT NULL DEFAULT 'global',
  scope_id INT NULL,
  subject NVARCHAR(500) NULL,
  body NVARCHAR(MAX) NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_hire_templates UNIQUE (template_key, channel, scope, scope_id)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_schedule_config')
CREATE TABLE hire_schedule_config (
  id INT IDENTITY(1,1) PRIMARY KEY,
  scope NVARCHAR(16) NOT NULL DEFAULT 'global',
  scope_id INT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  buffer_minutes INT NOT NULL DEFAULT 15,
  quiet_hours_start NVARCHAR(5) NOT NULL DEFAULT '21:00',
  quiet_hours_end NVARCHAR(5) NOT NULL DEFAULT '08:00',
  reminder_offsets_json NVARCHAR(MAX) NOT NULL,
  token_expiry_days INT NOT NULL DEFAULT 14,
  sms_on_invite BIT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_hire_schedule_config UNIQUE (scope, scope_id)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_availability_rules')
CREATE TABLE hire_availability_rules (
  id INT IDENTITY(1,1) PRIMARY KEY,
  scope NVARCHAR(16) NOT NULL,
  scope_id INT NULL,
  day_of_week INT NOT NULL,
  start_time NVARCHAR(5) NOT NULL,
  end_time NVARCHAR(5) NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_availability_exceptions')
CREATE TABLE hire_availability_exceptions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  scope NVARCHAR(16) NOT NULL,
  scope_id INT NULL,
  exception_date DATE NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_outbound_messages')
CREATE TABLE hire_outbound_messages (
  id INT IDENTITY(1,1) PRIMARY KEY,
  application_id INT NULL,
  office_id INT NULL,
  template_key NVARCHAR(100) NOT NULL,
  channel NVARCHAR(16) NOT NULL,
  recipient NVARCHAR(255) NOT NULL,
  status NVARCHAR(32) NOT NULL,
  provider_id NVARCHAR(255) NULL,
  error_message NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_reminder_jobs')
CREATE TABLE hire_reminder_jobs (
  id INT IDENTITY(1,1) PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES hire_interview_bookings(id),
  reminder_type NVARCHAR(100) NOT NULL,
  scheduled_for DATETIME2 NOT NULL,
  sent_at DATETIME2 NULL,
  retry_count INT NOT NULL DEFAULT 0,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_hire_reminder UNIQUE (booking_id, reminder_type)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_rate_limits')
CREATE TABLE hire_rate_limits (
  id INT IDENTITY(1,1) PRIMARY KEY,
  limit_key NVARCHAR(255) NOT NULL,
  window_start DATETIME2 NOT NULL,
  hit_count INT NOT NULL DEFAULT 1,
  CONSTRAINT UQ_hire_rate_limit UNIQUE (limit_key, window_start)
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hire_admin_sessions')
CREATE TABLE hire_admin_sessions (
  id INT IDENTITY(1,1) PRIMARY KEY,
  session_id NVARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME2 NOT NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_hire_applications_job' AND object_id = OBJECT_ID('hire_applications')
)
CREATE INDEX IX_hire_applications_job ON hire_applications(job_id);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_hire_applications_status' AND object_id = OBJECT_ID('hire_applications')
)
CREATE INDEX IX_hire_applications_status ON hire_applications(status);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_hire_tokens_token' AND object_id = OBJECT_ID('hire_application_tokens')
)
CREATE INDEX IX_hire_tokens_token ON hire_application_tokens(token);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_hire_bookings_office_time' AND object_id = OBJECT_ID('hire_interview_bookings')
)
CREATE INDEX IX_hire_bookings_office_time ON hire_interview_bookings(office_id, starts_at, ends_at);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'IX_hire_reminder_due' AND object_id = OBJECT_ID('hire_reminder_jobs')
)
CREATE INDEX IX_hire_reminder_due ON hire_reminder_jobs(scheduled_for) WHERE sent_at IS NULL;
