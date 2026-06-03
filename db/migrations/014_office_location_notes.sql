-- Per-office arrival / check-in instructions for message templates ({{locationNotes}}).
IF COL_LENGTH('hire_offices', 'location_notes') IS NULL
  ALTER TABLE hire_offices ADD location_notes NVARCHAR(MAX) NULL;
