use axum::http::StatusCode;
use axum::{
    Router,
    extract::{Path, Query, State},
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use tracing::info;

use crate::{
    MyState,
    error::MyError,
    webserver::{AppJson, DbBigSerial, ListPages, PageOptions},
};

#[derive(Deserialize, Serialize, Debug, sqlx::FromRow, PartialEq, Clone)]
// #[derive(ParquetRecordWriter)]
pub struct User {
    pub id: Option<DbBigSerial>,
    pub forename: String,
    pub surname: String,
    pub password: String,
}

impl User {
    pub fn new<S: Into<String>>(forename: S, surname: S, password: S) -> Self {
        Self {
            id: None,
            forename: forename.into(),
            surname: surname.into(),
            password: password.into(),
        }
    }
}

pub(crate) fn user_apis() -> Router<MyState> {
    Router::new()
        .route("/", post(create).get(list))
        .route("/{id}", get(read).put(update).delete(delete))
    // Add other user-related routes here
}

/// Creates a new user in the database.
///
/// # Arguments
///
/// * `State(state)`: Application state containing the database connection pool.
/// * `AppJson(user)`: JSON payload representing the user to be created. The `id` field must not be set.
///
/// # Returns
///
/// Returns a `Result` containing the created `User` as JSON on success, or a `MyError` on failure.
///
/// # Errors
///
/// Returns an error if:
/// - The `id` field is set in the input user.
/// - The database operation fails.
///
/// # Example cURL Command
///
/// ```sh
/// curl -X POST http://localhost:YOUR_PORT/users \
///      -H "Content-Type: application/json" \
///      -d '{"forename": "John", "surname": "Doe", "password": "secret"}'
/// ```
pub async fn create(
    State(state): State<MyState>,
    AppJson(user): AppJson<User>,
) -> Result<impl IntoResponse, MyError> {
    if user.id.is_some() {
        return Err(MyError::Message("ID must not be set"));
    }

    info!(
        "Inserting new user into database: forename={}, surname={}",
        user.forename, user.surname
    );

    let user = sqlx::query_as::<_, User>(
        r#"
            INSERT INTO users (forename, surname, password)
            VALUES ($1, $2, $3)
            RETURNING *
            "#,
    )
    .bind(&user.forename)
    .bind(&user.surname)
    .bind(&user.password)
    .fetch_one(&state.db_state.pool_pg)
    .await
    .map_err(MyError::from)?;

    Ok((StatusCode::CREATED, AppJson(user)).into_response())
}

/// # Example cURL Command
///
/// ```sh
/// curl -v http://localhost:8080/users\?page\=3
/// ```
pub async fn list(
    State(state): State<MyState>,
    Query(options): Query<PageOptions>,
) -> Result<AppJson<ListPages>, MyError> {
    let options = PageOptions::defaulting(options);

    // ToDo: Add sorting AND minimise so that just the ids are exported out
    let ids = sqlx::query_as::<_, User>(
        r#"
            SELECT * FROM users
            LIMIT $1 OFFSET $2
            "#,
    )
    .bind(options.size)
    .bind(options.page.unwrap() * options.size.unwrap())
    .fetch_all(&state.db_state.pool_pg)
    .await
    .map_err(MyError::from)?;

    let list_ids = ListPages {
        pagination: options,
        ids: ids.iter().map(|u| u.id.unwrap()).collect(),
    };

    Ok(AppJson(list_ids))
}

/// # Example cURL Command
///
/// ```sh
/// curl -v http://localhost:8080/users/3
/// ```
pub async fn read(
    Path(id): Path<DbBigSerial>,
    State(state): State<MyState>,
) -> Result<impl IntoResponse, MyError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        SELECT * FROM users
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_one(&state.db_state.pool_pg)
    .await
    .map_err(MyError::from)?;

    Ok(AppJson(user))
}

/// Update a user
///
/// This function will update a user in the database
pub async fn update(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
    AppJson(user): AppJson<User>,
) -> Result<impl IntoResponse, MyError> {
    if user.id.is_none() || id != user.id.unwrap() {
        return Err(MyError::Message(
            "ids on path and body must match for update",
        ));
    }

    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET forename = $2, surname = $3, password = $4
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&user.forename)
    .bind(&user.surname)
    .bind(&user.password)
    .fetch_one(&state.db_state.pool_pg)
    .await
    .map_err(MyError::from)?;

    Ok(AppJson(user))
}

/// Delete a user
///
/// This function will delete a user from the database
pub async fn delete(
    Path(id): Path<DbBigSerial>,
    State(state): State<MyState>,
) -> Result<impl IntoResponse, MyError> {
    let user = sqlx::query_as::<_, User>(
        r#"
        DELETE FROM users§
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .fetch_one(&state.db_state.pool_pg)
    .await
    .map_err(MyError::from)?;

    Ok(AppJson(user))
}
