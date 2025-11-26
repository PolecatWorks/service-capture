-- Add up migration script here

CREATE TABLE services (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    p99_millis INTEGER NOT NULL
);

CREATE TABLE service_dependencies (
    source_id BIGINT NOT NULL REFERENCES services(id),
    target_id BIGINT NOT NULL REFERENCES services(id),
    PRIMARY KEY (source_id, target_id)
);
