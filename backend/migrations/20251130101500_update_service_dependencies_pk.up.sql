-- Drop the existing primary key
ALTER TABLE service_dependencies DROP CONSTRAINT service_dependencies_pkey;

-- Add the new id column
ALTER TABLE service_dependencies ADD COLUMN id BIGSERIAL PRIMARY KEY;

-- Add the unique constraint
ALTER TABLE service_dependencies ADD CONSTRAINT uk_service_dependencies UNIQUE (source_id, target_id);

-- Add the name column
ALTER TABLE service_dependencies ADD COLUMN name VARCHAR(255);
