-- Allow multiple applicants per identical interview slot (default: 2).
IF COL_LENGTH('hire_schedule_config', 'slot_capacity') IS NULL
  ALTER TABLE hire_schedule_config ADD slot_capacity INT NOT NULL DEFAULT 2;
