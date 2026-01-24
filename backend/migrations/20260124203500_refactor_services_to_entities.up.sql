-- Rename tables
ALTER TABLE services RENAME TO entities;
ALTER TABLE service_dependencies RENAME TO relationships;

-- Update entities table
ALTER TABLE entities ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'service';
ALTER TABLE entities ADD COLUMN attributes JSONB NOT NULL DEFAULT '{}';

-- Update relationships table
ALTER TABLE relationships RENAME COLUMN source_id TO from_id;
ALTER TABLE relationships RENAME COLUMN target_id TO to_id;
ALTER TABLE relationships ADD COLUMN relationship_type VARCHAR(50) NOT NULL DEFAULT 'depends_on';
ALTER TABLE relationships ADD COLUMN attributes JSONB NOT NULL DEFAULT '{}';

-- Rename constraints and sequences for consistency (optional but good practice)
ALTER SEQUENCE services_id_seq RENAME TO entities_id_seq;
ALTER SEQUENCE service_dependencies_id_seq RENAME TO relationships_id_seq;

-- Rename unique constraint on relationships if it exists (from previous migration)
-- Note: Postgres doesn't automatically rename constraints when renaming tables usually,
-- but if we want to be clean we can try.
-- However, strict renaming of constraints might be flaky if names vary.
-- We will proceed with correct column implementations.

-- Drop old foreign key constraints and recreate them to point to the correct table name/columns if necessary
-- Postgres usually handles the table rename for FKs, but let's verify logic.
-- The FKs on service_dependencies referenced services(id).
-- After renaming services->entities, the FKs should still point to entities(id).
-- After renaming service_dependencies->relationships, the FKs are still there.
