# Testing and CI/CD Specification

## Overview

The application utilizes multiple layers of testing (unit, integration) across its components and leverages GitHub Actions for automated Continuous Integration and Continuous Delivery (CI/CD) pipelines.

## Testing Strategy

### 1. Integration Tests (Python)

End-to-end integration tests that verify the full application stack behavior (e.g., API functionality, database interactions) are written in Python.

*   **Location**: `tests/` directory.
*   **Dependency Management**: Uses Poetry (`pyproject.toml`).
*   **Framework**: Likely `pytest` (standard for Python integration testing).
*   **Running**:
    ```bash
    cd tests
    python3 -m venv venv
    source venv/bin/activate
    pip install poetry
    poetry install --with dev
    # run pytest
    ```

### 2. Backend Unit Tests (Rust)

Unit and potentially some integration tests for the Axum/sqlx backend are written in Rust.

*   **Framework**: Standard Rust `cargo test`.
*   **Running**:
    ```bash
    make backend-test
    ```

### 3. Frontend Unit Tests (Angular)

Unit tests for the Angular frontend components and services.

*   **Framework**: Karma/Jasmine (standard Angular setup).
*   *Note*: Ensure necessary browser binaries are available if running in a headless CI environment.
*   **Running**: Typically `ng test` (from within the `frontend/` directory).

## CI/CD Pipelines (GitHub Actions)

The repository uses GitHub Actions to automate building, testing, and publishing artifacts. The workflows are located in `.github/workflows/`.

*   **Backend Build & Publish** (`backend-docker-publish.yml`): Triggers on relevant backend changes. It likely runs tests, builds the Rust binary into a Docker image, and publishes it to a container registry.
*   **Frontend Build & Publish** (`frontend-docker-publish.yml`): Triggers on frontend changes. It builds the Angular application into a Docker image (likely using Nginx) and publishes it.
*   **Helm Publish** (`helm-publish.yaml`): Packages the Helm charts located in `charts/` and publishes them for use in CD pipelines (like FluxCD).

## Development Tasks (`Makefile`)

A `Makefile` in the root directory acts as the central hub for running development tasks consistently.

*   **`make backend-test`**: Run backend tests.
*   **`make backend-dev`**: Run backend in dev mode with hot-reloading.
*   **`make db-local`**: Start the local PostgreSQL database via Docker.
*   **`make backend-docker`**: Build backend Docker image.
*   **`make frontend-docker`**: Build frontend Docker image.
*   **`make frontend-dev`**: Run the frontend development server.