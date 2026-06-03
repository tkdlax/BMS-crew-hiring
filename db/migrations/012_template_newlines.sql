-- Fix template bodies stored with literal \n (T-SQL does not interpret \n as newline).

UPDATE hire_message_templates
SET body = REPLACE(body, '\n', CHAR(10)),
    updated_at = SYSUTCDATETIME()
WHERE body LIKE '%\n%';
