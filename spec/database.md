# Database Specification

## Overview

The application utilizes PostgreSQL as its persistent storage layer. The schema is designed to model a dynamic infrastructure landscape, where various types of entities (services, VMs, databases) and their interdependencies are captured.

## Core Schema Components

The data model uses a generalized approach to support a variety of infrastructure elements without requiring schema changes for every new entity type.

### 1. `entities` Table

This table stores all nodes in the infrastructure graph.

*   **`id`** (Primary Key): A unique identifier for the entity.
*   **`type`**: The classification of the entity (e.g., `Service`, `Database`, `Virtual Machine`, `Cluster`, `Network`).
*   **`name`**: A human-readable identifier for the entity.
*   **`attributes`** (`JSONB`): A flexible field storing entity-specific metadata. This is where SLIs/SLOs (like `p95`, `p99`, `availability`, `throughput`) are kept, allowing the schema to adapt to different entity types seamlessly.

### 2. `relationships` Table (or `service_dependencies`)

This table models the directed edges connecting the entities, representing dependencies or composition.

*   **`source_id`** (Foreign Key): The ID of the consuming or parent entity.
*   **`target_id`** (Foreign Key): The ID of the dependency or child entity.
*   **Context**: A relationship implies that the `source` relies on the `target` to function correctly.

## Availability Calculation Logic

The database schema supports a recursive logic for calculating service availability based on dependencies.

*   **Series Dependencies**: Dependencies of different `type`s are considered to be in series. If a service depends on a Database and a Cache, the failure of either impacts the service.
*   **Parallel Dependencies**: Dependencies of the *same* `type` are considered parallel or redundant. If a service depends on two Database instances of the same type, they provide redundancy.

## Local Development

*   **Start Local Database**:
  ```bash
  make db-local
  ```
  This command starts a PostgreSQL instance inside a Docker container, configured for local development.