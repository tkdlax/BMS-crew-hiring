-- Seed data for development/testing

-- Global schedule config
IF NOT EXISTS (SELECT 1 FROM hire_schedule_config WHERE scope = 'global' AND scope_id IS NULL)
INSERT INTO hire_schedule_config (scope, scope_id, slot_duration_minutes, buffer_minutes, quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite)
VALUES ('global', NULL, 30, 15, '21:00', '08:00',
  '[{"hoursBefore":24,"templateKeyEmail":"reminder_24h_email"},{"hoursBefore":2,"templateKeySms":"reminder_2h_sms"}]',
  14, 0);

-- Offices
IF NOT EXISTS (SELECT 1 FROM hire_offices WHERE slug = 'colorado-springs')
INSERT INTO hire_offices (slug, name, timezone, location_label, active)
VALUES ('colorado-springs', 'Colorado Springs', 'America/Denver', 'Colorado Springs, CO', 1);

IF NOT EXISTS (SELECT 1 FROM hire_offices WHERE slug = 'denver')
INSERT INTO hire_offices (slug, name, timezone, location_label, active)
VALUES ('denver', 'Denver', 'America/Denver', '11755 E Peakview Ave, Centennial, CO 80111', 1);

DECLARE @cosId INT = (SELECT id FROM hire_offices WHERE slug = 'colorado-springs');
DECLARE @denverId INT = (SELECT id FROM hire_offices WHERE slug = 'denver');

-- Per-office schedule config
IF NOT EXISTS (SELECT 1 FROM hire_schedule_config WHERE scope = 'office' AND scope_id = @cosId)
INSERT INTO hire_schedule_config (scope, scope_id, slot_duration_minutes, buffer_minutes, quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite)
SELECT 'office', @cosId, slot_duration_minutes, buffer_minutes, quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite
FROM hire_schedule_config WHERE scope = 'global' AND scope_id IS NULL;

IF NOT EXISTS (SELECT 1 FROM hire_schedule_config WHERE scope = 'office' AND scope_id = @denverId)
INSERT INTO hire_schedule_config (scope, scope_id, slot_duration_minutes, buffer_minutes, quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite)
SELECT 'office', @denverId, slot_duration_minutes, buffer_minutes, quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite
FROM hire_schedule_config WHERE scope = 'global' AND scope_id IS NULL;

-- One operations job per office (interest captured on apply form)
IF NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @cosId AND slug = 'moving-operations-crew')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (@cosId, 'moving-operations-crew', 'Moving Operations Crew', 1, '[]',
  '{"heroEyebrow":"Work in Colorado Springs, CO","headline":"Get Your Colorado Career On The Move.","formTitle":"Apply to Join Our Colorado Springs Team","interestOptions":["Driver","Mover & Packer","Summer or Temporary Help","I''m new, I want to start a career"]}');

IF NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @denverId AND slug = 'moving-operations-crew')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (@denverId, 'moving-operations-crew', 'Moving Operations Crew', 1, '[]',
  '{"heroEyebrow":"Work in Denver · Centennial, CO","headline":"Get Your Colorado Career On The Move.","formTitle":"Apply to Join Our Denver Team","interestOptions":["Driver","Mover & Packer","Summer or Temporary Help","I''m new, I want to start a career"],"videos":[{"title":"Hear From Employees","youtubeId":"1WYvchjYBXU"},{"title":"Hear From A Customer","youtubeId":"-pnkJe0ALAE"}]}');

-- Availability: Mon-Fri 9-17 for each office
DECLARE @d INT = 1;
WHILE @d <= 5
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hire_availability_rules WHERE scope = 'office' AND scope_id = @cosId AND day_of_week = @d)
  INSERT INTO hire_availability_rules (scope, scope_id, day_of_week, start_time, end_time)
  VALUES ('office', @cosId, @d, '09:00', '17:00');
  IF NOT EXISTS (SELECT 1 FROM hire_availability_rules WHERE scope = 'office' AND scope_id = @denverId AND day_of_week = @d)
  INSERT INTO hire_availability_rules (scope, scope_id, day_of_week, start_time, end_time)
  VALUES ('office', @denverId, @d, '09:00', '17:00');
  SET @d = @d + 1;
END

-- Global message templates
DECLARE @templates TABLE (template_key NVARCHAR(100), channel NVARCHAR(16), subject NVARCHAR(500), body NVARCHAR(MAX));
INSERT INTO @templates VALUES
('application_received', 'email', 'We received your application — {{jobTitle}}',
 'Hi {{firstName}},\n\nThank you for applying for {{jobTitle}} at {{officeName}}. We will be in touch shortly.\n\n— BMS'),
('interview_invite', 'email', 'Schedule your interview — {{jobTitle}}',
 'Hi {{firstName}},\n\nWe would like to invite you to interview for {{jobTitle}} at {{officeName}} ({{officeLocation}}).\n\nPlease pick a time that works for you:\n{{scheduleUrl}}\n\n— BMS Hiring'),
('booking_confirm_email', 'email', 'Interview confirmed — {{jobTitle}}',
 'Hi {{firstName}},\n\nYour interview for {{jobTitle}} at {{officeName}} is confirmed for {{interviewTimeLocal}}.\n\nLocation: {{officeLocation}}\n\n— BMS'),
('booking_confirm_sms', 'sms', NULL,
 'BMS: Hi {{firstName}}, your {{jobTitle}} interview at {{officeName}} is confirmed for {{interviewTimeLocal}}.'),
('reminder_24h_email', 'email', 'Reminder: interview tomorrow',
 'Hi {{firstName}},\n\nThis is a reminder that your interview for {{jobTitle}} at {{officeName}} is scheduled for {{interviewTimeLocal}}.\n\n— BMS'),
('reminder_2h_sms', 'sms', NULL,
 'BMS: Reminder — your {{jobTitle}} interview at {{officeName}} is in about 2 hours ({{interviewTimeLocal}}).');

INSERT INTO hire_message_templates (template_key, channel, scope, scope_id, subject, body)
SELECT t.template_key, t.channel, 'global', NULL, t.subject, t.body
FROM @templates t
WHERE NOT EXISTS (
  SELECT 1 FROM hire_message_templates m
  WHERE m.template_key = t.template_key AND m.channel = t.channel AND m.scope = 'global' AND m.scope_id IS NULL
);
