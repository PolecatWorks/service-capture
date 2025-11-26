use axum::{
    Router,
    extract::{Path, State},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::{
    MyState,
    error::MyError,
    webserver::{AppJson, DbBigSerial},
};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Service {
    pub id: DbBigSerial,
    pub name: String,
    pub p99_millis: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateService {
    pub name: String,
    pub p99_millis: i32,
}

#[derive(Debug, Deserialize)]
pub struct AddDependency {
    pub target_id: DbBigSerial,
}

pub fn service_apis() -> Router<MyState> {
    Router::new()
        .route("/", get(list_services).post(create_service))
        .route("/{id}", get(get_service))
        .route(
            "/{id}/dependencies",
            get(list_dependencies).post(add_dependency),
        )
}

async fn list_services(State(state): State<MyState>) -> Result<AppJson<Vec<Service>>, MyError> {
    let services = sqlx::query_as::<_, Service>("SELECT id, name, p99_millis FROM services")
        .fetch_all(&state.db_state.pool_pg)
        .await?;

    Ok(AppJson(services))
}

async fn create_service(
    State(state): State<MyState>,
    AppJson(payload): AppJson<CreateService>,
) -> Result<AppJson<Service>, MyError> {
    let service = sqlx::query_as::<_, Service>(
        "INSERT INTO services (name, p99_millis) VALUES ($1, $2) RETURNING id, name, p99_millis",
    )
    .bind(payload.name)
    .bind(payload.p99_millis)
    .fetch_one(&state.db_state.pool_pg)
    .await?;

    Ok(AppJson(service))
}

async fn get_service(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
) -> Result<AppJson<Service>, MyError> {
    let service =
        sqlx::query_as::<_, Service>("SELECT id, name, p99_millis FROM services WHERE id = $1")
            .bind(id)
            .fetch_one(&state.db_state.pool_pg)
            .await?;

    Ok(AppJson(service))
}

async fn add_dependency(
    State(state): State<MyState>,
    Path(source_id): Path<DbBigSerial>,
    AppJson(payload): AppJson<AddDependency>,
) -> Result<AppJson<()>, MyError> {
    sqlx::query("INSERT INTO service_dependencies (source_id, target_id) VALUES ($1, $2)")
        .bind(source_id)
        .bind(payload.target_id)
        .execute(&state.db_state.pool_pg)
        .await?;

    Ok(AppJson(()))
}

async fn list_dependencies(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
) -> Result<AppJson<Vec<Service>>, MyError> {
    let services = sqlx::query_as::<_, Service>(
        r#"
        SELECT s.id, s.name, s.p99_millis
        FROM services s
        JOIN service_dependencies sd ON s.id = sd.target_id
        WHERE sd.source_id = $1
        "#,
    )
    .bind(id)
    .fetch_all(&state.db_state.pool_pg)
    .await?;

    Ok(AppJson(services))
}
