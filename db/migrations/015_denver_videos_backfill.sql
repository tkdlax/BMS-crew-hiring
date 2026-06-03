-- Denver moving-operations-crew was seeded in 002 with 2 videos; 005 skipped INSERT because the row
-- already existed. Colorado Springs had no videos in DB and falls back to 4 in code — Denver did not.
DECLARE @videosJson NVARCHAR(MAX) = N'[{"title":"Hear From Employees","youtubeId":"1WYvchjYBXU"},{"title":"Hear From A Customer","youtubeId":"-pnkJe0ALAE"},{"title":"Hear From A Master Mover","youtubeId":"7GVmdYHKUE4"},{"title":"Get To Know Us","youtubeId":"LoDlPPyDaKw"}]';

DECLARE @denverId INT = (SELECT id FROM hire_offices WHERE slug = 'denver');
IF @denverId IS NOT NULL
BEGIN
  UPDATE hire_jobs
  SET page_content = JSON_MODIFY(page_content, '$.videos', JSON_QUERY(@videosJson)),
      updated_at = SYSUTCDATETIME()
  WHERE office_id = @denverId
    AND slug = 'moving-operations-crew'
    AND ISJSON(page_content) = 1
    AND (
      JSON_QUERY(page_content, '$.videos') IS NULL
      OR (SELECT COUNT(*) FROM OPENJSON(page_content, '$.videos')) < 4
    );
END
