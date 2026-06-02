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

-- Jobs (driver + crew-member per office)
IF NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @gjId AND slug = 'driver')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (@gjId, 'driver', 'Driver', 1, '[]',
  '{"heroEyebrow":"Work in Grand Junction","headline":"Drive With Bailey''s on the Western Slope.","formTitle":"Apply to Join Our Grand Junction Driving Team"}');

IF NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @gjId AND slug = 'crew-member')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (@gjId, 'crew-member', 'Crew Member', 1, '[]',
  '{"heroEyebrow":"Work in Grand Junction","headline":"Join Our Grand Junction Moving Team.","formTitle":"Apply to Join Our Grand Junction Team","trainingNote":"We do not require moving industry experience. Training is provided to all."}');

IF NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @slcId AND slug = 'driver')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (@slcId, 'driver', 'Driver', 1, '[]',
  '{"heroEyebrow":"Work in Salt Lake City","headline":"Drive With Bailey''s in Utah.","formTitle":"Apply to Join Our Salt Lake City Driving Team"}');

IF NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @slcId AND slug = 'crew-member')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (@slcId, 'crew-member', 'Crew Member', 1, '[]',
  '{"heroEyebrow":"Work in Salt Lake City","headline":"Join Our Salt Lake City Moving Team.","formTitle":"Apply to Join Our Salt Lake City Team","trainingNote":"We do not require moving industry experience. Training is provided to all."}');

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
