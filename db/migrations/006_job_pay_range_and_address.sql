-- Per-job hourly pay range (admin-editable).

IF COL_LENGTH('hire_jobs', 'pay_min_hourly') IS NULL
  ALTER TABLE hire_jobs ADD pay_min_hourly DECIMAL(6,2) NULL;

IF COL_LENGTH('hire_jobs', 'pay_max_hourly') IS NULL
  ALTER TABLE hire_jobs ADD pay_max_hourly DECIMAL(6,2) NULL;
