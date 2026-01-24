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
pub struct Relationship {
    pub id: Option<DbBigSerial>,
    pub from_id: DbBigSerial,
    pub to_id: DbBigSerial,
    // Using string for flexible relationship types: 'depends_on', 'hosted_on', etc.
    pub relationship_type: String,
    // JSONB attributes as per plan
    pub attributes: serde_json::Value,
}

pub fn relationship_apis() -> Router<MyState> {
    Router::new()
        .route("/", post(create).get(list))
        .route("/{id}", get(read).put(update).delete(delete))
}

async fn list(
    State(state): State<MyState>,
    Query(options): Query<PageOptions>,
) -> Result<AppJson<ListPages>, MyError> {
    let options = PageOptions::defaulting(options);

    let items = sqlx::query_as::<_, Relationship>(
        r#"SELECT id, from_id, to_id, relationship_type, attributes FROM relationships
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
    AppJson(payload): AppJson<Relationship>,
) -> Result<impl IntoResponse, MyError> {
    let relationship = sqlx::query_as::<_, Relationship>(
        "INSERT INTO relationships (from_id, to_id, relationship_type, attributes) VALUES ($1, $2, $3, $4) RETURNING *",
    )
    .bind(payload.from_id)
    .bind(payload.to_id)
    .bind(payload.relationship_type)
    .bind(payload.attributes)
    .fetch_one(&state.db_state.pool_pg)
    .await?;

    Ok((StatusCode::CREATED, AppJson(relationship)).into_response())
}

async fn read(
    Path(id): Path<DbBigSerial>,
    State(state): State<MyState>,
) -> Result<AppJson<Relationship>, MyError> {
    let relationship =
        sqlx::query_as::<_, Relationship>("SELECT * FROM relationships WHERE id = $1")
            .bind(id)
            .fetch_one(&state.db_state.pool_pg)
            .await?;

    Ok(AppJson(relationship))
}

async fn update(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
    AppJson(payload): AppJson<Relationship>,
) -> Result<impl IntoResponse, MyError> {
    if payload.id.is_none() || id != payload.id.unwrap() {
        return Err(MyError::Message(
            "ids on path and body must match for update",
        ));
    }

    let relationship = sqlx::query_as::<_, Relationship>(
        r#"
        UPDATE relationships
        SET from_id = $2, to_id = $3, relationship_type = $4, attributes = $5
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(payload.from_id)
    .bind(payload.to_id)
    .bind(payload.relationship_type)
    .bind(payload.attributes)
    .fetch_one(&state.db_state.pool_pg)
    .await?;

    Ok(AppJson(relationship))
}

async fn delete(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
) -> Result<AppJson<Relationship>, MyError> {
    let relationship =
        sqlx::query_as::<_, Relationship>("DELETE FROM relationships WHERE id = $1 RETURNING *")
            .bind(id)
            .fetch_one(&state.db_state.pool_pg)
            .await?;

    Ok(AppJson(relationship))
}
