use axum::extract::Query;
use axum::http::StatusCode;
use axum::{
    Router,
    extract::{Path, State},
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};

use crate::webserver::{ListPages, PageOptions};
use crate::{
    MyState,
    error::MyError,
    webserver::{AppJson, DbBigSerial},
};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ServiceDependency {
    pub id: Option<DbBigSerial>,
    pub source_id: DbBigSerial,
    pub target_id: DbBigSerial,
    pub name: Option<String>,
}

pub fn dependency_apis() -> Router<MyState> {
    Router::new()
        .route("/", post(create).get(list))
        .route("/{id}", get(read).put(update).delete(delete))
}

async fn list(
    State(state): State<MyState>,
    Query(options): Query<PageOptions>,
) -> Result<AppJson<ListPages>, MyError> {
    let options = PageOptions::defaulting(options);

    let items = sqlx::query_as::<_, ServiceDependency>(
        r#"SELECT id, source_id, target_id, name FROM service_dependencies
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(options.size)
    .bind(options.page.unwrap() * options.size.unwrap())
    .fetch_all(&state.db_state.pool_pg)
    .await?;

    let list_ids = ListPages {
        pagination: options,
        ids: items.iter().map(|u| u.id.unwrap()).collect(),
    };

    Ok(AppJson(list_ids))
}

async fn create(
    State(state): State<MyState>,
    AppJson(payload): AppJson<ServiceDependency>,
) -> Result<impl IntoResponse, MyError> {
    let dependency = sqlx::query_as::<_, ServiceDependency>(
        "INSERT INTO service_dependencies (source_id, target_id, name) VALUES ($1, $2, $3) RETURNING *",
    )
    .bind(payload.source_id)
    .bind(payload.target_id)
    .bind(payload.name)
    .fetch_one(&state.db_state.pool_pg)
    .await?;

    Ok((StatusCode::CREATED, AppJson(dependency)).into_response())
}

async fn read(
    Path(id): Path<DbBigSerial>,
    State(state): State<MyState>,
) -> Result<AppJson<ServiceDependency>, MyError> {
    let dependency =
        sqlx::query_as::<_, ServiceDependency>("SELECT * FROM service_dependencies WHERE id = $1")
            .bind(id)
            .fetch_one(&state.db_state.pool_pg)
            .await?;

    Ok(AppJson(dependency))
}

async fn update(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
    AppJson(payload): AppJson<ServiceDependency>,
) -> Result<impl IntoResponse, MyError> {
    if payload.id.is_none() || id != payload.id.unwrap() {
        return Err(MyError::Message(
            "ids on path and body must match for update",
        ));
    }

    let dependency = sqlx::query_as::<_, ServiceDependency>(
        r#"
        UPDATE service_dependencies
        SET source_id = $2, target_id = $3, name = $4
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(payload.source_id)
    .bind(payload.target_id)
    .bind(payload.name)
    .fetch_one(&state.db_state.pool_pg)
    .await?;

    Ok(AppJson(dependency))
}

async fn delete(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
) -> Result<AppJson<ServiceDependency>, MyError> {
    let dependency = sqlx::query_as::<_, ServiceDependency>(
        "DELETE FROM service_dependencies WHERE id = $1 RETURNING *",
    )
    .bind(id)
    .fetch_one(&state.db_state.pool_pg)
    .await?;

    Ok(AppJson(dependency))
}
