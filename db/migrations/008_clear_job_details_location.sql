-- Remove stale jobDetails.location from page_content (office location_label is canonical).

UPDATE hire_jobs
SET page_content = JSON_MODIFY(page_content, '$.jobDetails.location', NULL)
WHERE page_content IS NOT NULL
  AND JSON_VALUE(page_content, '$.jobDetails.location') IS NOT NULL
  AND (JSON_VALUE(page_content, '$.addressOverride') IS NULL OR JSON_VALUE(page_content, '$.addressOverride') = 'false');
