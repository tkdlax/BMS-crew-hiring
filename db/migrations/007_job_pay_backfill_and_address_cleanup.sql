-- Backfill pay range and stop page_content.address from overriding office location_label.

UPDATE hire_jobs
SET pay_min_hourly = 17, pay_max_hourly = 25
WHERE pay_min_hourly IS NULL AND slug = 'moving-operations-crew';

UPDATE hire_jobs
SET page_content = JSON_MODIFY(page_content, '$.address', NULL)
WHERE page_content IS NOT NULL
  AND JSON_VALUE(page_content, '$.address') IS NOT NULL
  AND (JSON_VALUE(page_content, '$.addressOverride') IS NULL OR JSON_VALUE(page_content, '$.addressOverride') = 'false');
