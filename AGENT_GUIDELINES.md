# Agent Guidelines for Service Capture

This document outlines the standard operating procedure for AI agents working on the `service-capture` project.

## Workflow

### 1. Requirements Gathering & Specification
When a new feature is requested:
1.  **Clarify**: Ask clarifying questions and interview the user to fully understand the requirements. Do not assume; verify.
2.  **Specification**: Present a detailed specification (spec) to the user for review.
3.  **Approval**: Wait for user confirmation of the spec.

### 2. Planning
Once the spec is approved:
1.  **Implementation Plan**: Create a detailed `implementation_plan.md` outlining the proposed changes.
2.  **Review**: Ask the user to review the implementation plan.
3.  **Approval**: Proceed only after the plan is approved.

### 3. Development Mode
Upon approval of the plan, enter development mode:
1.  **Task Execution**: Complete tasks in a sensible order.
2.  **Testing**:
    - After completing a task, run relevant tests to confirm functionality.
    - **Add new tests** for new features.
    - Use Makefile targets for testing (e.g., `make backend-test`).
3.  **Commit**: After passing tests for a given task, make a git commit.
    - Format: `git commit -m "task: brief description of changes"`

### 4. Finalization
After completing a batch of features and before handing off to the user:
1.  **Build**: Run the Docker build steps to ensure everything builds correctly.
    - Use `make backend-docker` and `make frontend-docker` (or appropriate targets).
3.  **Ready for Push**:
    -   **CRITICAL**: You MUST run both `make backend-docker` and `make frontend-docker` and ensure they succeed before pushing or creating a Pull Request. This ensures the CI/CD pipeline will not break.
    -   Ensure the codebase is clean.

## Tooling & Standards

### Makefile Targets
Always use the defined Makefile targets for building and testing. Common targets include:
- `make backend-test`: Run backend tests.
- `make backend-dev`: Run backend in dev mode.
- `make db-local`: Start local database.
- `make backend-docker`: Build backend Docker image.
- `make frontend-docker`: Build frontend Docker image.

### Code Style
- Follow existing project conventions.
- Ensure Rust code compiles without warnings where possible.
- Ensure Angular code builds without errors.
