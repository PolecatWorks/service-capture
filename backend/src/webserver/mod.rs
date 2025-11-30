pub mod dependencies;
pub mod services;
pub mod users;

use axum::{
    Json, Router,
    extract::{FromRequest, MatchedPath, State},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use axum_prometheus::{
    GenericMetricLayer, PrometheusMetricLayer, metrics_exporter_prometheus::PrometheusBuilder,
};
use reqwest::StatusCode;
use tower_http::trace::{DefaultOnFailure, DefaultOnRequest, DefaultOnResponse, TraceLayer};
use tracing::{Level, info};

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use sqlx::{Pool, Postgres, types::Decimal};
use std::{mem, net::SocketAddr, sync::Arc};
use tokio_util::sync::CancellationToken;

use crate::{MyState, error::MyError, webserver::users::User};

/// Postgres does not support unsigned int so we use i64 to represent the BIGSERIAL type which is a BIGINT in SQL
type DbBigSerial = i64;

#[derive(Deserialize, Serialize, Debug, sqlx::FromRow)]
pub struct DbId {
    id: DbBigSerial,
}

pub struct SerializeDecimal;
impl serde_with::SerializeAs<Decimal> for SerializeDecimal {
    fn serialize_as<S: Serializer>(source: &Decimal, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&source.to_string())
    }
}

impl<'de> serde_with::DeserializeAs<'de, Decimal> for SerializeDecimal {
    fn deserialize_as<D>(deserializer: D) -> Result<Decimal, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Decimal::from_str_exact(&s).map_err(serde::de::Error::custom)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
enum SortOrder {
    Asc,
    Desc,
}

pub struct PageSort {
    property: String,
    direction: SortOrder,
}

// The query parameters for list_todos.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PageOptions {
    pub page: Option<DbBigSerial>,
    pub size: Option<DbBigSerial>,
    #[serde(flatten)]
    pub sort: Option<DbBigSerial>,
}

impl Default for PageOptions {
    fn default() -> Self {
        Self {
            size: Some(5),
            page: Some(0),
            sort: None,
        }
    }
}

impl PageOptions {
    pub fn defaulting(inval: PageOptions) -> PageOptions {
        PageOptions {
            size: if inval.size.is_some() {
                inval.size
            } else {
                PageOptions::default().size
            },
            page: if inval.page.is_some() {
                inval.page
            } else {
                PageOptions::default().page
            },
            sort: if inval.sort.is_some() {
                inval.sort
            } else {
                PageOptions::default().sort
            },
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ListPages {
    ids: Vec<DbBigSerial>,
    pagination: PageOptions,
}

#[derive(Deserialize, Debug, Clone)]
pub struct WebServiceConfig {
    /// Prefix of the served API
    pub prefix: String,
    /// Hostname to start the webservice on
    /// This allows chainging to localhost for dev and 0.0.0.0 or specific address for deployment
    pub address: SocketAddr,
    pub forwarding_headers: Vec<String>,
}
impl Default for WebServiceConfig {
    fn default() -> Self {
        Self {
            prefix: "api".to_string(),
            address: "127.0.0.1:1234".parse().unwrap(),
            forwarding_headers: vec![],
        }
    }
}

// Handler for GET /messages
async fn list_messages(State(state): State<MyState>) -> impl IntoResponse {
    info!("Handling list_messages request");
    Json(vec!["Hello from the server!".to_string()])
}

// // Handler for POST /messages
// async fn create_message(Json(message): Json<Message>) -> impl IntoResponse {
//     info!("Handling create_message request");
//     Json(format!("New message: {}", message.content))
// }

#[derive(FromRequest)]
#[from_request(via(axum::Json), rejection(MyError))]
pub struct AppJson<T>(T);

impl<T> IntoResponse for AppJson<T>
where
    axum::Json<T>: IntoResponse,
{
    fn into_response(self) -> Response {
        axum::Json(self.0).into_response()
    }
}

pub async fn start_app_api(
    state: MyState,
    pool_pg: Pool<Postgres>,
    ct: CancellationToken,
) -> Result<(), MyError> {
    let prefix = state.config.webservice.prefix.clone();

    let shared_state = state.clone();

    let metric_layer = PrometheusMetricLayer::new();

    // Setup http server
    let app = Router::new()
        .nest("/users", users::user_apis())
        .nest("/services", services::service_apis())
        .nest("/dependencies", dependencies::dependency_apis())
        .route("/hello", get(|| async { "Hello, World!" }))
        // .route("/metrics", get(|| async move { metric_handle.render() }))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(|request: &axum::http::Request<_>| {
                    let matched_path = request
                        .extensions()
                        .get::<MatchedPath>()
                        .map(|matched_path| matched_path.as_str());

                    tracing::info_span!(
                        "request",
                        method = ?request.method(),
                        uri = ?request.uri(),
                        matched_path = ?matched_path,
                    )
                })
                .on_request(DefaultOnRequest::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO))
                .on_failure(DefaultOnFailure::new().level(Level::ERROR)),
        )
        .layer(metric_layer)
        .with_state(shared_state);

    let prefix_app = Router::new().nest(&prefix, app);

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind(state.config.webservice.address).await?;
    let server = axum::serve(listener, prefix_app).with_graceful_shutdown(async move {
        // The move is necessary as with_graceful_shutdown requires static lifetime
        ct.cancelled().await
    });

    info!(
        "Server started on {}{prefix}",
        state.config.webservice.address
    );

    Ok(server.await?)
}

impl IntoResponse for MyError {
    fn into_response(self) -> Response {
        #[derive(Serialize)]
        struct ErrorResponse {
            message: String,
        }

        let (status, message) = match self {
            MyError::Message(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.to_string()),
            MyError::Cancelled => todo!(),
            MyError::HamsError(hams_error) => todo!(),
            MyError::Serde(error) => todo!(),
            MyError::Io(error) => todo!(),
            MyError::SqlxError(error) => (StatusCode::NOT_FOUND, format!("{error}")),
            MyError::SqlxMigrateError(migrate_error) => todo!(),
            MyError::ShutdownCheck => todo!(),
            MyError::PreflightCheck => todo!(),
            MyError::ParquetError(parquet_error) => todo!(),
            MyError::FigmentError(error) => todo!(),
            MyError::JsonRejection(rejection) => (rejection.status(), rejection.body_text()),
            MyError::PrometheusError(error) => todo!(),
        };

        // Use a public constructor or helper function for ErrorResponse.
        // Replace ErrorResponse::new(message) with the correct public API.
        (status, AppJson(ErrorResponse { message })).into_response()
    }
}

// #[cfg(test)]
// mod tests {
//     use sqlx::{PgPool, Row};

//     #[sqlx::test(migrations = false)]
//     async fn db_connectivity(pool: PgPool) -> sqlx::Result<()> {
//         let foo = sqlx::query("SELECT 1").fetch_one(&pool).await?;

//         assert_eq!(foo.get::<i32, _>(0), 1);

//         Ok(())
//     }
// }

// #[cfg(test)]
// mod test {
//     use sqlx::{types::Decimal, PgPool};

//     use crate::webserver::{
//         contacts::{self, Band, Mode},
//         users,
//     };

//     use super::contacts::Contact;

//     pub async fn create_contact(pool: PgPool) -> Contact {
//         let user =
//             users::handlers::create(users::User::new("test", "user", "password"), pool.clone())
//                 .await
//                 .unwrap();

//         println!("user = {:?}", user);

//         contacts::handlers::create(
//             pool.clone(),
//             Contact::new(
//                 None,
//                 user.id.unwrap(),
//                 chrono::NaiveDate::parse_from_str("2023-01-01", "%Y-%m-%d").unwrap(),
//                 chrono::NaiveTime::parse_from_str("12:00", "%H:%M").unwrap(),
//                 "CALLSIGN".to_string(),
//                 "MI7IEU".to_string(),
//                 Band::B20m,
//                 Some(Decimal::new(202, 2)),
//                 Mode::Ssb,
//                 Some("59".to_string()),
//                 Some("59".to_string()),
//                 Some("NAME".to_string()),
//                 Some("QTH".to_string()),
//                 Some("GRID".to_string()),
//                 Some("COUNTRY".to_string()),
//                 Some("STATE".to_string()),
//                 Some("COUNTY".to_string()),
//                 Some("NOTES".to_string()),
//                 true,
//             ),
//         )
//         .await
//         .unwrap()
//     }
// }

// #[cfg(test)]
// mod test {
//     use sqlx::{PgPool, Row};

//     use crate::webserver::{list_files::ListFile, list_versions::ListVersion, lists::List};

//     const MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!();

//     // You could also do `use foo_crate::MIGRATOR` and just refer to it as `MIGRATOR` here.
//     #[sqlx::test]
//     async fn it_gets_a_pool(pool: PgPool) -> sqlx::Result<()> {
//         let mut conn = pool.acquire().await?;

//         let db_name: String = sqlx::query_scalar("SELECT current_database()")
//             .fetch_one(&mut *conn)
//             .await?;

//         assert!(db_name.starts_with("_sqlx_test"), "dbname: {db_name:?}");

//         Ok(())
//     }

//     #[sqlx::test]
//     async fn db_referential_integrity(pool: PgPool) -> sqlx::Result<()> {
//         {
//             // Insert a list
//             let list = sqlx::query_as::<_, List>(
//                 "INSERT INTO lists (name) VALUES ('example0') RETURNING *",
//             )
//             .fetch_one(&pool.clone())
//             .await
//             .expect("Insert List");

//             // Fail Insert of ListVersion if there is not a matching List
//             println!("Check that VersionList cannot be created unless there is a matching List id");
//             let non_matching_id = 7;
//             assert_ne!(non_matching_id, list.id.unwrap());

//             let _version = sqlx::query_as::<_, ListVersion>("INSERT INTO list_versions (version,schema,list) VALUES ('0.0.1', '{}', $1) RETURNING *")
//                 .bind(&non_matching_id)
//                 .fetch_one(&pool.clone()).await
//                 .expect_err("Fail insert of ListVersion");

//             // Add a version to the list
//             let _version = sqlx::query_as::<_, ListVersion>("INSERT INTO list_versions (version,schema,list) VALUES ('0.0.1', '{}', $1) RETURNING *")
//                 .bind(&list.id.unwrap())
//                 .fetch_one(&pool.clone()).await
//                 .expect("Insert Version");

//             println!("Check that List cannot be deleted unless all Versions are deleted");
//             // Fail delete list
//             let _list = sqlx::query_as::<_, List>("DELETE FROM lists WHERE id=$1 RETURNING *")
//                 .bind(&list.id.unwrap())
//                 .fetch_one(&pool.clone())
//                 .await
//                 .expect_err("Fail delete of List");

//             // Delete Version
//             let _version = sqlx::query_as::<_, ListVersion>(
//                 "DELETE FROM list_versions WHERE list=$1 RETURNING *",
//             )
//             .bind(&list.id.unwrap())
//             .fetch_one(&pool.clone())
//             .await
//             .expect("Delete of ListVersion");

//             // Delete List is successful
//             let _list = sqlx::query_as::<_, List>("DELETE FROM lists WHERE id=$1 RETURNING *")
//                 .bind(&list.id.unwrap())
//                 .fetch_one(&pool.clone())
//                 .await
//                 .expect("Delete of List");
//         }

//         {
//             let list0 = sqlx::query_as::<_, List>(
//                 "INSERT INTO lists (name) VALUES ('example0') RETURNING *",
//             )
//             .fetch_one(&pool.clone())
//             .await
//             .expect("Insert List");

//             let version0 = sqlx::query_as::<_, ListVersion>("INSERT INTO list_versions (version,schema,list) VALUES ('0.0.1', '{}', $1) RETURNING *")
//                 .bind(&list0.id.unwrap())
//                 .fetch_one(&pool.clone()).await
//                 .expect("Insert Version");

//             let list1 = sqlx::query_as::<_, List>(
//                 "INSERT INTO lists (name) VALUES ('example1') RETURNING *",
//             )
//             .fetch_one(&pool.clone())
//             .await
//             .expect("Insert List");

//             let version1 = sqlx::query_as::<_, ListVersion>("INSERT INTO list_versions (version,schema,list) VALUES ('0.0.1', '{}', $1) RETURNING *")
//                 .bind(&list1.id.unwrap())
//                 .fetch_one(&pool.clone()).await
//                 .expect("Insert Version");

//             let non_matching_version_id = 7;
//             assert_ne!(non_matching_version_id, version0.id.unwrap());
//             assert_ne!(non_matching_version_id, version1.id.unwrap());

//             println!("Check that active cannot be set unless id of ListVersion is valid");
//             let _version = sqlx::query_as::<_, List>(
//                 "UPDATE lists SET (active) = ($2) WHERE id= $1 RETURNING *",
//             )
//             .bind(&list0.id.unwrap())
//             .bind(&non_matching_version_id)
//             .fetch_one(&pool.clone())
//             .await
//             .expect_err("Fail List update of active because id of ListVersion is not valid");

//             println!(
//                 "Check that active cannot be set if list of ListVersion does not match id of List"
//             );
//             let _version = sqlx::query_as::<_, List>("UPDATE lists SET (active) = ($2) WHERE id= $1 RETURNING *")
//                 .bind(&list0.id.unwrap())
//                 .bind(&version1.id.unwrap())
//                 .fetch_one(&pool.clone()).await
//                 .expect_err("Fail List update of active bcause id of ListVersion does not have a matchi list entry");

//             println!("Update active of list0 to match version0");
//             let _list =
//                 sqlx::query_as::<_, List>("UPDATE lists SET active = $2 WHERE id= $1 RETURNING *")
//                     .bind(&list0.id.unwrap())
//                     .bind(&version0.id.unwrap())
//                     .fetch_one(&pool.clone())
//                     .await
//                     .expect("Update active when matching ListVersion");

//             println!("Cannot delete ListVersion that is references in active");
//             let _version = sqlx::query_as::<_, ListVersion>(
//                 "DELETE FROM list_versions WHERE list=$1 RETURNING *",
//             )
//             .bind(&list0.id.unwrap())
//             .fetch_one(&pool.clone())
//             .await
//             .expect_err("Cannot delete ListVersion used in active on List");

//             println!("Disable active for a list");
//             let _list = sqlx::query_as::<_, List>(
//                 "UPDATE lists SET active = null WHERE id= $1 RETURNING *",
//             )
//             .bind(&list0.id.unwrap())
//             .fetch_one(&pool.clone())
//             .await
//             .expect("Unset active for List");

//             let _version =
//                 sqlx::query_as::<_, ListVersion>("DELETE FROM list_versions RETURNING *")
//                     .fetch_one(&pool.clone())
//                     .await
//                     .expect("Delete of ListVersion");
//             let _list = sqlx::query_as::<_, List>("DELETE FROM lists RETURNING *")
//                 .fetch_one(&pool.clone())
//                 .await
//                 .expect("Delete of List");
//         }

//         {
//             let non_matching_id = 7;

//             println!("Cannot create ListFile that does not have a version");
//             let _version = sqlx::query_as::<_, ListFile>(
//                 "INSERT INTO list_files (version, validated) VALUES ($1, false) RETURNING *",
//             )
//             .bind(&non_matching_id)
//             .fetch_one(&pool.clone())
//             .await
//             .expect_err("Cannot create ListFile if no valid version to link");

//             let list0 = sqlx::query_as::<_, List>(
//                 "INSERT INTO lists (name) VALUES ('example0') RETURNING *",
//             )
//             .fetch_one(&pool.clone())
//             .await
//             .expect("Insert List");

//             let version0 = sqlx::query_as::<_, ListVersion>("INSERT INTO list_versions (version,schema,list) VALUES ('0.0.1', '{}', $1) RETURNING *")
//                 .bind(&list0.id.unwrap())
//                 .fetch_one(&pool.clone()).await
//                 .expect("Insert Version");

//             let file0 = sqlx::query_as::<_, ListFile>(
//                 "INSERT INTO list_files (version, validated) VALUES ($1, false) RETURNING *",
//             )
//             .bind(&version0.id.unwrap())
//             .fetch_one(&pool.clone())
//             .await
//             .expect("Insert File when version is available");

//             let _version =
//                 sqlx::query_as::<_, ListVersion>("DELETE FROM list_versions RETURNING *")
//                     .bind(&version0.id.unwrap())
//                     .fetch_one(&pool.clone())
//                     .await
//                     .expect_err("Fail to delete ListVersion as is referenced by File");

//             let _file0 =
//                 sqlx::query_as::<_, ListFile>("DELETE FROM list_files WHERE id=$1 RETURNING *")
//                     .bind(&file0.id.unwrap())
//                     .fetch_one(&pool.clone())
//                     .await
//                     .expect("Delete file0");

//             let _version0 = sqlx::query_as::<_, ListVersion>(
//                 "DELETE FROM list_versions WHERE id=$1 RETURNING *",
//             )
//             .bind(&version0.id.unwrap())
//             .fetch_one(&pool.clone())
//             .await
//             .expect("Delete version0");

//             let _list0 = sqlx::query_as::<_, List>("DELETE FROM lists WHERE id=$1 RETURNING *")
//                 .bind(&list0.id.unwrap())
//                 .fetch_one(&pool.clone())
//                 .await
//                 .expect("Delete list0");
//         }

//         Ok(())
//     }
// }
