-- One active job per office: Moving Operations Crew (interest captured on apply form).

UPDATE hire_jobs SET active = 0 WHERE slug IN ('driver', 'crew-member');

DECLARE @interestJson NVARCHAR(MAX) = N'["Driver","Mover & Packer","Summer or Temporary Help","I''m new, I want to start a career"]';
DECLARE @videosJson NVARCHAR(MAX) = N'[{"title":"Hear From Employees","youtubeId":"1WYvchjYBXU"},{"title":"Hear From A Customer","youtubeId":"-pnkJe0ALAE"},{"title":"Hear From A Master Mover","youtubeId":"7GVmdYHKUE4"},{"title":"Get To Know Us","youtubeId":"LoDlPPyDaKw"}]';

-- Denver
DECLARE @denverId INT = (SELECT id FROM hire_offices WHERE slug = 'denver');
IF @denverId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @denverId AND slug = 'moving-operations-crew')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (
  @denverId,
  'moving-operations-crew',
  'Moving Operations Crew',
  1,
  '[]',
  N'{"heroEyebrow":"Work in Denver · Centennial, CO","headline":"Get Your Colorado Career On The Move.","heroLead":"Movers are the core of our company, and our industry. Join the storied history of the men and women who keep our nation moving.","compensation":"$17–$25/hr + CASH tips","compensationNote":"Full-time or Seasonal · Benefits available for full-time","address":"11755 E Peakview Ave, Centennial CO 80111","formTitle":"Apply to Join Our Denver Team","formSubtitle":"Takes under 2 minutes — no resume required.","learnSectionTitle":"Learn About The Job and What It''s Like:","interestOptions":["Driver","Mover & Packer","Summer or Temporary Help","I''m new, I want to start a career"],"trainingNote":"We do not require moving industry experience. Training is provided to all.","videos":[{"title":"Hear From Employees","youtubeId":"1WYvchjYBXU"},{"title":"Hear From A Customer","youtubeId":"-pnkJe0ALAE"},{"title":"Hear From A Master Mover","youtubeId":"7GVmdYHKUE4"},{"title":"Get To Know Us","youtubeId":"LoDlPPyDaKw"}],"jobDetails":{"title":"Moving Operations Crew","compensation":"Full-time or Seasonal | $17-25/hr (DOE)","compensationNote":"(plus benefits for full-time)","location":"11755 E Peakview Ave\nCentennial, CO 80111","requirements":["Must be 17 years or older","Must be capable of heavy lifting over 8-hour days","Must pass background check","Must agree to code of conduct"],"benefits":["Medical/Dental with HSA/FSA","401k with Employer Match","Personal Time Off","CDL Training (if desired)"]}}'
);

-- Colorado Springs
DECLARE @cosId INT = (SELECT id FROM hire_offices WHERE slug = 'colorado-springs');
IF @cosId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @cosId AND slug = 'moving-operations-crew')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (
  @cosId,
  'moving-operations-crew',
  'Moving Operations Crew',
  1,
  '[]',
  N'{"heroEyebrow":"Work in Colorado Springs, CO","headline":"Get Your Colorado Career On The Move.","heroLead":"Movers are the core of our company. Join our Colorado Springs team and help families relocate with care.","compensation":"$17–$25/hr + CASH tips","compensationNote":"Full-time or Seasonal · Benefits available for full-time","address":"Colorado Springs, CO","formTitle":"Apply to Join Our Colorado Springs Team","formSubtitle":"Takes under 2 minutes — no resume required.","learnSectionTitle":"Learn About The Job and What It''s Like:","interestOptions":["Driver","Mover & Packer","Summer or Temporary Help","I''m new, I want to start a career"],"trainingNote":"We do not require moving industry experience. Training is provided to all.","videos":' + @videosJson + N',"jobDetails":{"title":"Moving Operations Crew","compensation":"Full-time or Seasonal | $17-25/hr (DOE)","compensationNote":"(plus benefits for full-time)","location":"Colorado Springs, CO","requirements":["Must be 17 years or older","Must be capable of heavy lifting over 8-hour days","Must pass background check","Must agree to code of conduct"],"benefits":["Medical/Dental with HSA/FSA","401k with Employer Match","Personal Time Off","CDL Training (if desired)"]}}'
);

-- Grand Junction
DECLARE @gjId INT = (SELECT id FROM hire_offices WHERE slug = 'grand-junction');
IF @gjId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @gjId AND slug = 'moving-operations-crew')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (
  @gjId,
  'moving-operations-crew',
  'Moving Operations Crew',
  1,
  '[]',
  N'{"heroEyebrow":"Work in Grand Junction, CO","headline":"Join Our Grand Junction Moving Team.","heroLead":"Help families and businesses move on Colorado''s Western Slope.","compensation":"$17–$25/hr + CASH tips","compensationNote":"Full-time or Seasonal · Benefits available for full-time","address":"Grand Junction, CO","formTitle":"Apply to Join Our Grand Junction Team","formSubtitle":"Takes under 2 minutes — no resume required.","learnSectionTitle":"Learn About The Job and What It''s Like:","interestOptions":["Driver","Mover & Packer","Summer or Temporary Help","I''m new, I want to start a career"],"trainingNote":"We do not require moving industry experience. Training is provided to all.","videos":' + @videosJson + N',"jobDetails":{"title":"Moving Operations Crew","compensation":"Full-time or Seasonal | $17-25/hr (DOE)","compensationNote":"(plus benefits for full-time)","location":"Grand Junction, CO","requirements":["Must be 17 years or older","Must be capable of heavy lifting over 8-hour days","Must pass background check","Must agree to code of conduct"],"benefits":["Medical/Dental with HSA/FSA","401k with Employer Match","Personal Time Off","CDL Training (if desired)"]}}'
);

-- Salt Lake City
DECLARE @slcId INT = (SELECT id FROM hire_offices WHERE slug = 'salt-lake-city');
IF @slcId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hire_jobs WHERE office_id = @slcId AND slug = 'moving-operations-crew')
INSERT INTO hire_jobs (office_id, slug, title, active, form_fields, page_content)
VALUES (
  @slcId,
  'moving-operations-crew',
  'Moving Operations Crew',
  1,
  '[]',
  N'{"heroEyebrow":"Work in Salt Lake City, UT","headline":"Join Our Salt Lake City Moving Team.","heroLead":"Be part of Bailey''s operations serving the Wasatch Front.","compensation":"$17–$25/hr + CASH tips","compensationNote":"Full-time or Seasonal · Benefits available for full-time","address":"Salt Lake City, UT","formTitle":"Apply to Join Our Salt Lake City Team","formSubtitle":"Takes under 2 minutes — no resume required.","learnSectionTitle":"Learn About The Job and What It''s Like:","interestOptions":["Driver","Mover & Packer","Summer or Temporary Help","I''m new, I want to start a career"],"trainingNote":"We do not require moving industry experience. Training is provided to all.","videos":' + @videosJson + N',"jobDetails":{"title":"Moving Operations Crew","compensation":"Full-time or Seasonal | $17-25/hr (DOE)","compensationNote":"(plus benefits for full-time)","location":"Salt Lake City, UT","requirements":["Must be 17 years or older","Must be capable of heavy lifting over 8-hour days","Must pass background check","Must agree to code of conduct"],"benefits":["Medical/Dental with HSA/FSA","401k with Employer Match","Personal Time Off","CDL Training (if desired)"]}}'
);

-- Ensure consolidated jobs stay active if re-run
UPDATE hire_jobs SET active = 1, title = 'Moving Operations Crew'
WHERE slug = 'moving-operations-crew';
