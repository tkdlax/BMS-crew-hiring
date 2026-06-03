-- Webhooks, booking window, attendance confirmation, improved default templates.

IF COL_LENGTH('hire_schedule_config', 'booking_window_days') IS NULL
  ALTER TABLE hire_schedule_config ADD booking_window_days INT NOT NULL DEFAULT 7;

IF COL_LENGTH('hire_schedule_config', 'min_notice_hours') IS NULL
  ALTER TABLE hire_schedule_config ADD min_notice_hours INT NOT NULL DEFAULT 8;

IF COL_LENGTH('hire_schedule_config', 'webhook_url') IS NULL
  ALTER TABLE hire_schedule_config ADD webhook_url NVARCHAR(2000) NULL;

IF COL_LENGTH('hire_schedule_config', 'webhook_events_json') IS NULL
  ALTER TABLE hire_schedule_config ADD webhook_events_json NVARCHAR(MAX) NULL;

IF COL_LENGTH('hire_interview_bookings', 'attendance_confirmed_at') IS NULL
  ALTER TABLE hire_interview_bookings ADD attendance_confirmed_at DATETIME2 NULL;

IF COL_LENGTH('hire_interview_bookings', 'attendance_status') IS NULL
  ALTER TABLE hire_interview_bookings ADD attendance_status NVARCHAR(32) NULL;
GO

UPDATE hire_schedule_config
SET webhook_events_json = N'["application_submitted","interview_scheduled"]'
WHERE scope = 'global' AND scope_id IS NULL AND (webhook_events_json IS NULL OR webhook_events_json = N'');

-- Default templates (global) — upsert bodies with interest + confirmation tokens.
DECLARE @templates TABLE (template_key NVARCHAR(100), channel NVARCHAR(16), subject NVARCHAR(500), body NVARCHAR(MAX));
INSERT INTO @templates VALUES
('application_received', 'email', N'We received your application — {{jobTitle}}',
 N'Hi {{firstName}},\n\nThank you for applying for {{jobTitle}} at {{officeName}}. We received your interest in: {{primaryInterest}}.\n\nOur team will review your application and you will receive a link to schedule your interview shortly.\n\n— Bailey''s Moving & Storage'),
('interview_invite', 'email', N'Schedule your interview — {{jobTitle}}',
 N'Hi {{firstName}},\n\nWe would like to invite you to interview for {{jobTitle}} at {{officeName}}.\n\nLocation: {{officeLocation}}\n\nPlease pick a time that works for you:\n{{scheduleUrl}}\n\n— Bailey''s Moving & Storage Hiring'),
('interview_invite', 'sms', NULL,
 N'Bailey''s: Hi {{firstName}}, schedule your {{jobTitle}} interview at {{officeName}} here: {{scheduleUrl}}'),
('booking_confirm_email', 'email', N'Interview confirmed — {{jobTitle}}',
 N'Hi {{firstName}},\n\nYour interview for {{jobTitle}} at {{officeName}} is confirmed.\n\nWhen: {{interviewTimeLocal}}\nWhere: {{officeLocation}}\n\nWe look forward to meeting you.\n\n— Bailey''s Moving & Storage'),
('booking_confirm_sms', 'sms', NULL,
 N'Bailey''s: Hi {{firstName}}, your {{jobTitle}} interview at {{officeName}} is confirmed for {{interviewTimeLocal}}. Location: {{officeLocation}}'),
('reminder_24h_email', 'email', N'Reminder: interview tomorrow — {{jobTitle}}',
 N'Hi {{firstName}},\n\nReminder: your interview for {{jobTitle}} at {{officeName}} is scheduled for {{interviewTimeLocal}}.\n\nLocation: {{officeLocation}}\n\n— Bailey''s Moving & Storage'),
('reminder_2h_sms', 'sms', NULL,
 N'Bailey''s: Hi {{firstName}}, your {{jobTitle}} interview at {{officeName}} is today at {{interviewTimeLocal}}. Please confirm you will attend: {{confirmationUrl}}');

MERGE hire_message_templates AS target
USING @templates AS src
ON target.template_key = src.template_key AND target.channel = src.channel
  AND target.scope = 'global' AND target.scope_id IS NULL
WHEN MATCHED THEN UPDATE SET subject = src.subject, body = src.body, updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (template_key, channel, scope, scope_id, subject, body)
  VALUES (src.template_key, src.channel, 'global', NULL, src.subject, src.body);

-- Denver office hours 10:00–16:00 Mon–Fri (if office exists).
DECLARE @denverId INT = (SELECT id FROM hire_offices WHERE slug = 'denver');
IF @denverId IS NOT NULL
BEGIN
  DELETE FROM hire_availability_rules WHERE scope = 'office' AND scope_id = @denverId;
  INSERT INTO hire_availability_rules (scope, scope_id, day_of_week, start_time, end_time) VALUES
    ('office', @denverId, 1, '10:00', '16:00'),
    ('office', @denverId, 2, '10:00', '16:00'),
    ('office', @denverId, 3, '10:00', '16:00'),
    ('office', @denverId, 4, '10:00', '16:00'),
    ('office', @denverId, 5, '10:00', '16:00');
  MERGE hire_schedule_config AS target
  USING (SELECT 'office' AS scope, @denverId AS scope_id) AS src
  ON target.scope = src.scope AND target.scope_id = src.scope_id
  WHEN MATCHED THEN UPDATE SET booking_window_days = 7, min_notice_hours = 8, updated_at = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN INSERT (scope, scope_id, slot_duration_minutes, buffer_minutes,
    quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite,
    booking_window_days, min_notice_hours)
  VALUES ('office', @denverId, 30, 15, '21:00', '08:00',
    N'[{"hoursBefore":24,"templateKeyEmail":"reminder_24h_email"},{"hoursBefore":2,"templateKeySms":"reminder_2h_sms"}]',
    14, 0, 7, 8);
END
