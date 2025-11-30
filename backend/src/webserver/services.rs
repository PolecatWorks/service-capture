use axum::extract::Query;
use axum::http::StatusCode;
use axum::{
    Router,
    extract::{Path, State},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use sqlx::Row;

use crate::webserver::{ListPages, PageOptions};
use crate::{
    MyState,
    error::MyError,
    webserver::{AppJson, DbBigSerial},
};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Service {
    #[serde(default)]
    pub id: Option<DbBigSerial>,
    pub name: String,
    pub p99_millis: i32,
    #[serde(default)]
    pub x: Option<i32>,
    #[serde(default)]
    pub y: Option<i32>,
}

pub fn service_apis() -> Router<MyState> {
    Router::new()
        .route("/", post(create).get(list))
        .route("/{id}", get(read).put(update).delete(delete))
}

async fn list(
    State(state): State<MyState>,
    Query(options): Query<PageOptions>,
) -> Result<AppJson<ListPages>, MyError> {
    let options = PageOptions::defaulting(options);

    let items = sqlx::query_as::<_, Service>(
        r#"SELECT id, name, p99_millis, x, y FROM services
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
    AppJson(payload): AppJson<Service>,
) -> Result<impl IntoResponse, MyError> {
    let service = sqlx::query_as::<_, Service>(
        "INSERT INTO services (name, p99_millis, x, y) VALUES ($1, $2, $3, $4) RETURNING *",
    )
    .bind(payload.name)
    .bind(payload.p99_millis)
    .bind(payload.x)
    .bind(payload.y)
    .fetch_one(&state.db_state.pool_pg)
    .await?;

    // Ok(AppJson(service))
    Ok((StatusCode::CREATED, AppJson(service)).into_response())
}

async fn read(
    Path(id): Path<DbBigSerial>,
    State(state): State<MyState>,
) -> Result<AppJson<Service>, MyError> {
    let service = sqlx::query_as::<_, Service>("SELECT * FROM services WHERE id = $1")
        .bind(id)
        .fetch_one(&state.db_state.pool_pg)
        .await?;

    Ok(AppJson(service))
}

async fn update(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
    AppJson(payload): AppJson<Service>,
) -> Result<impl IntoResponse, MyError> {
    if payload.id.is_none() || id != payload.id.unwrap() {
        return Err(MyError::Message(
            "ids on path and body must match for update",
        ));
    }

    let service = sqlx::query_as::<_, Service>(
        r#"
        UPDATE services
        SET name = $2, p99_millis = $3, x = $4, y = $5
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&payload.name)
    .bind(payload.p99_millis)
    .bind(payload.x)
    .bind(payload.y)
    .fetch_one(&state.db_state.pool_pg)
    .await?;

    Ok(AppJson(service))
}

async fn delete(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
) -> Result<AppJson<Service>, MyError> {
    let service = sqlx::query_as::<_, Service>("SELECT * FROM services WHERE id = $1 RETURNING *")
        .bind(id)
        .fetch_one(&state.db_state.pool_pg)
        .await?;

    Ok(AppJson(service))
}
