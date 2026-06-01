-- Align Denver job pages with referral landing content (editable via admin later)

DECLARE @denverId INT = (SELECT id FROM hire_offices WHERE slug = 'denver');

UPDATE hire_jobs
SET page_content = N'{
  "heroEyebrow": "Work in Denver",
  "headline": "Get Your Colorado Career On The Move.",
  "heroLead": "Movers are the core of our company, and our industry. Join the storied history of the men and women who keep our nation moving.",
  "compensation": "Full-time or Seasonal BOE $17 - $25/hr + CASH tips (full-time benefits available).",
  "address": "11755 E Peakview Ave Centennial, CO 80111",
  "formTitle": "Apply to Join Our Denver Team",
  "learnSectionTitle": "Learn About The Job and What It''s Like:",
  "interestOptions": ["Driver", "Mover & Packer", "Summer or Temporary Help", "I''m new, I want to start a career"],
  "trainingNote": "We do not require moving industry experience. Training is provided to all.",
  "videos": [
    {"title": "Hear From Employees", "youtubeId": "1WYvchjYBXU"},
    {"title": "Hear From A Customer", "youtubeId": "-pnkJe0ALAE"},
    {"title": "Hear From A Master Mover", "youtubeId": "7GVmdYHKUE4"},
    {"title": "Get To Know Us", "youtubeId": "LoDlPPyDaKw"}
  ],
  "jobDetails": {
    "title": "Moving Operations Crew Positions",
    "compensation": "Full-time or Seasonal | $17-25/hr (DOE)",
    "compensationNote": "(plus benefits for full-time)",
    "location": "11755 E Peakview Ave\nCentennial, CO 80111",
    "requirements": [
      "Must be 17 years or older",
      "Must be capable of heavy lifting over 8-hour days",
      "Must pass background check",
      "Must agree to code of conduct"
    ],
    "benefits": [
      "Medical/Dental with HSA/FSA",
      "401k with Employer Match",
      "Personal Time Off",
      "CDL Training (if desired)"
    ]
  }
}'
WHERE office_id = @denverId AND slug = 'crew-member';

UPDATE hire_jobs
SET page_content = N'{
  "heroEyebrow": "Work in Denver",
  "headline": "Drive Your Colorado Career Forward.",
  "heroLead": "Our drivers are trusted professionals who represent Bailey''s on every route.",
  "address": "11755 E Peakview Ave Centennial, CO 80111",
  "formTitle": "Apply to Join Our Denver Driving Team",
  "learnSectionTitle": "Learn About The Job and What It''s Like:",
  "interestOptions": ["Local Driver", "Long Distance / Linehaul", "I''m new, I want to start a career"],
  "videos": [
    {"title": "Hear From Employees", "youtubeId": "1WYvchjYBXU"},
    {"title": "Hear From A Customer", "youtubeId": "-pnkJe0ALAE"},
    {"title": "Hear From A Master Mover", "youtubeId": "7GVmdYHKUE4"},
    {"title": "Get To Know Us", "youtubeId": "LoDlPPyDaKw"}
  ]
}'
WHERE office_id = @denverId AND slug = 'driver';

UPDATE hire_offices
SET location_label = N'11755 E Peakview Ave, Centennial, CO 80111'
WHERE slug = 'denver';
