-- Keep jobs active on the site while temporarily blocking new applications.

IF COL_LENGTH('hire_jobs', 'accepting_applications') IS NULL
  ALTER TABLE hire_jobs ADD accepting_applications BIT NOT NULL
    CONSTRAINT DF_hire_jobs_accepting_applications DEFAULT (1);

GO

IF COL_LENGTH('hire_jobs', 'applications_paused_message') IS NULL
  ALTER TABLE hire_jobs ADD applications_paused_message NVARCHAR(500) NULL;
