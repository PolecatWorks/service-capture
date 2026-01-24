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
pub struct Entity {
    #[serde(default)]
    pub id: Option<DbBigSerial>,
    pub name: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub entity_type: String,
    pub p99_millis: i32,
    pub p95_millis: i32,
    pub availability: f64,
    pub throughput_rps: i32,
    #[serde(default)]
    pub x: Option<i32>,
    #[serde(default)]
    pub y: Option<i32>,
    pub attributes: serde_json::Value,
}

pub fn entity_apis() -> Router<MyState> {
    Router::new()
        .route("/", post(create).get(list))
        .route("/{id}", get(read).put(update).delete(delete))
}

async fn list(
    State(state): State<MyState>,
    Query(options): Query<PageOptions>,
) -> Result<AppJson<ListPages>, MyError> {
    let options = PageOptions::defaulting(options);

    // If we want filtering by type later, we can add it to PageOptions or a specialized struct
    // For now simple pagination
    let items = sqlx::query_as::<_, Entity>(
        r#"SELECT id, name, type, p99_millis, p95_millis, availability, throughput_rps, x, y, attributes FROM entities
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
    AppJson(payload): AppJson<Entity>,
) -> Result<impl IntoResponse, MyError> {
    let entity = sqlx::query_as::<_, Entity>(
        r#"INSERT INTO entities (name, type, p99_millis, p95_millis, availability, throughput_rps, x, y, attributes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *"#,
    )
    .bind(payload.name)
    .bind(payload.entity_type)
    .bind(payload.p99_millis)
    .bind(payload.p95_millis)
    .bind(payload.availability)
    .bind(payload.throughput_rps)
    .bind(payload.x)
    .bind(payload.y)
    .bind(payload.attributes)
    .fetch_one(&state.db_state.pool_pg)
    .await?;

    Ok((StatusCode::CREATED, AppJson(entity)).into_response())
}

async fn read(
    Path(id): Path<DbBigSerial>,
    State(state): State<MyState>,
) -> Result<AppJson<Entity>, MyError> {
    let entity = sqlx::query_as::<_, Entity>("SELECT * FROM entities WHERE id = $1")
        .bind(id)
        .fetch_one(&state.db_state.pool_pg)
        .await?;

    Ok(AppJson(entity))
}

async fn update(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
    AppJson(payload): AppJson<Entity>,
) -> Result<impl IntoResponse, MyError> {
    if payload.id.is_none() || id != payload.id.unwrap() {
        return Err(MyError::Message(
            "ids on path and body must match for update",
        ));
    }

    let entity = sqlx::query_as::<_, Entity>(
        r#"
        UPDATE entities
        SET name = $2, type = $3, p99_millis = $4, p95_millis = $5, availability = $6, throughput_rps = $7, x = $8, y = $9, attributes = $10
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&payload.name)
    .bind(&payload.entity_type)
    .bind(payload.p99_millis)
    .bind(payload.p95_millis)
    .bind(payload.availability)
    .bind(payload.throughput_rps)
    .bind(payload.x)
    .bind(payload.y)
    .bind(payload.attributes)
    .fetch_one(&state.db_state.pool_pg)
    .await?;

    Ok(AppJson(entity))
}

async fn delete(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
) -> Result<AppJson<Entity>, MyError> {
    let entity = sqlx::query_as::<_, Entity>("DELETE FROM entities WHERE id = $1 RETURNING *")
        .bind(id)
        .fetch_one(&state.db_state.pool_pg)
        .await?;

    Ok(AppJson(entity))
}
