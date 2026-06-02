-- Grand Junction and Salt Lake City operations offices

IF NOT EXISTS (SELECT 1 FROM hire_offices WHERE slug = 'grand-junction')
INSERT INTO hire_offices (slug, name, timezone, location_label, active)
VALUES ('grand-junction', 'Grand Junction', 'America/Denver', 'Grand Junction, CO', 1);

IF NOT EXISTS (SELECT 1 FROM hire_offices WHERE slug = 'salt-lake-city')
INSERT INTO hire_offices (slug, name, timezone, location_label, active)
VALUES ('salt-lake-city', 'Salt Lake City', 'America/Denver', 'Salt Lake City, UT', 1);

DECLARE @gjId INT = (SELECT id FROM hire_offices WHERE slug = 'grand-junction');
DECLARE @slcId INT = (SELECT id FROM hire_offices WHERE slug = 'salt-lake-city');

-- Per-office schedule config
IF NOT EXISTS (SELECT 1 FROM hire_schedule_config WHERE scope = 'office' AND scope_id = @gjId)
INSERT INTO hire_schedule_config (scope, scope_id, slot_duration_minutes, buffer_minutes, quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite)
SELECT 'office', @gjId, slot_duration_minutes, buffer_minutes, quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite
FROM hire_schedule_config WHERE scope = 'global' AND scope_id IS NULL;

IF NOT EXISTS (SELECT 1 FROM hire_schedule_config WHERE scope = 'office' AND scope_id = @slcId)
INSERT INTO hire_schedule_config (scope, scope_id, slot_duration_minutes, buffer_minutes, quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite)
SELECT 'office', @slcId, slot_duration_minutes, buffer_minutes, quiet_hours_start, quiet_hours_end, reminder_offsets_json, token_expiry_days, sms_on_invite
FROM hire_schedule_config WHERE scope = 'global' AND scope_id IS NULL;

-- One operations job per office
IF NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @gjId AND slug = 'moving-operations-crew')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (@gjId, 'moving-operations-crew', 'Moving Operations Crew', 1, '[]',
  '{"heroEyebrow":"Work in Grand Junction, CO","headline":"Join Our Grand Junction Moving Team.","formTitle":"Apply to Join Our Grand Junction Team","interestOptions":["Driver","Mover & Packer","Summer or Temporary Help","I''m new, I want to start a career"]}');

IF NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @slcId AND slug = 'moving-operations-crew')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (@slcId, 'moving-operations-crew', 'Moving Operations Crew', 1, '[]',
  '{"heroEyebrow":"Work in Salt Lake City, UT","headline":"Join Our Salt Lake City Moving Team.","formTitle":"Apply to Join Our Salt Lake City Team","interestOptions":["Driver","Mover & Packer","Summer or Temporary Help","I''m new, I want to start a career"]}');

-- Availability Mon–Fri 9–17
DECLARE @d INT = 1;
WHILE @d <= 5
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hire_availability_rules WHERE scope = 'office' AND scope_id = @gjId AND day_of_week = @d)
  INSERT INTO hire_availability_rules (scope, scope_id, day_of_week, start_time, end_time)
  VALUES ('office', @gjId, @d, '09:00', '17:00');
  IF NOT EXISTS (SELECT 1 FROM hire_availability_rules WHERE scope = 'office' AND scope_id = @slcId AND day_of_week = @d)
  INSERT INTO hire_availability_rules (scope, scope_id, day_of_week, start_time, end_time)
  VALUES ('office', @slcId, @d, '09:00', '17:00');
  SET @d = @d + 1;
END
