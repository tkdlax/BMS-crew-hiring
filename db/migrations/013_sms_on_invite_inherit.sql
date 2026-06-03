-- Office schedule rows copied sms_on_invite=0 from global at seed time; inherit global flag for consistency.
UPDATE o
SET sms_on_invite = g.sms_on_invite,
    updated_at = SYSUTCDATETIME()
FROM hire_schedule_config o
JOIN hire_schedule_config g ON g.scope = 'global' AND g.scope_id IS NULL
WHERE o.scope = 'office';
