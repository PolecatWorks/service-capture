# Helm Specification

## Overview

The application is deployed to Kubernetes clusters using Helm charts. These charts are stored in the `charts/` directory and manage the deployment of the application's components.

## Available Charts

### 1. `service-capture-backend`

This chart deploys the Rust backend service.

*   **Path**: `charts/service-capture-backend/`
*   **Purpose**: Manages the Deployment, Service, and potentially Ingress for the backend API.
*   **Sample Values**: Check `charts/service-capture-backend-sample.yaml` for a reference configuration, which typically includes image repository, tag, resource limits, and environment variable configurations (like database connection strings and OIDC settings).

### 2. `nginx-view`

This chart likely serves the Angular frontend or acts as a proxy.

*   **Path**: `charts/nginx-view/`
*   **Purpose**: Manages an Nginx deployment which is commonly used to serve static single-page application assets (like our Angular frontend).
*   **Sample Values**: Check `charts/nginx-view-sample.yaml` for reference configuration, such as image details and server block settings.

## FluxCD Integration

The repository also contains `fluxcd-dev` directories, indicating that GitOps practices using FluxCD might be employed to automatically synchronize these Helm charts and their configurations with the target Kubernetes clusters.

## Continuous Delivery

A GitHub Actions workflow (`helm-publish.yaml`) is responsible for packaging and publishing these Helm charts, allowing them to be consumed by CD systems or deployed manually via `helm install`.