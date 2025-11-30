-- Drop the name column
ALTER TABLE service_dependencies DROP COLUMN name;

-- Drop the unique constraint
ALTER TABLE service_dependencies DROP CONSTRAINT uk_service_dependencies;

-- Drop the id column
ALTER TABLE service_dependencies DROP COLUMN id;

-- Restore the composite primary key
ALTER TABLE service_dependencies ADD PRIMARY KEY (source_id, target_id);
