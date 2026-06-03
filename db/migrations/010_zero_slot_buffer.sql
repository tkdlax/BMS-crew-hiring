-- Stop adding 15 minutes between consecutive interview slots (buffer still applies around bookings).
UPDATE hire_schedule_config SET buffer_minutes = 0;
