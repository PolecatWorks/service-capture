use axum::{
    extract::{Path, State},
    routing::get,
    Router,
};
use futures::future::BoxFuture;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::{
    error::MyError,
    webserver::{AppJson, DbBigSerial},
    MyState,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalysisReport {
    pub entity_id: DbBigSerial,
    pub name: String,
    pub entity_type: String,
    pub self_availability: f64,
    pub derived_availability: f64,
    pub dependency_breakdown: Vec<DependencyGroup>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DependencyGroup {
    pub group_type: String,
    pub group_availability: f64,
    pub dependencies: Vec<AnalysisReport>,
}

#[derive(sqlx::FromRow)]
struct EntityRow {
    id: DbBigSerial,
    name: String,
    #[sqlx(rename = "type")]
    entity_type: String,
    availability: f64,
}

#[derive(sqlx::FromRow)]
struct DependencyRow {
    to_id: DbBigSerial,
    target_type: String,
}

pub fn analysis_apis() -> Router<MyState> {
    Router::new().route("/availability/:id", get(get_availability))
}

async fn get_availability(
    State(state): State<MyState>,
    Path(id): Path<DbBigSerial>,
) -> Result<AppJson<AnalysisReport>, MyError> {
    // Start with empty visited set
    let report = calculate_availability(id, state.clone(), Vec::new()).await?;
    Ok(AppJson(report))
}

fn calculate_availability(
    id: DbBigSerial,
    state: MyState,
    visited: Vec<DbBigSerial>,
) -> BoxFuture<'static, Result<AnalysisReport, MyError>> {
    Box::pin(async move {
        // Cycle detection
        if visited.contains(&id) {
            // If cycle, we return a dummy report to break recursion.
            return Ok(AnalysisReport {
                entity_id: id,
                name: "Cycle Detected".to_string(),
                entity_type: "unknown".to_string(),
                self_availability: 100.0,
                derived_availability: 100.0,
                dependency_breakdown: vec![],
            });
        }
        let mut new_visited = visited.clone();
        new_visited.push(id);

        // Fetch entity
        let entity = sqlx::query_as::<_, EntityRow>(
            "SELECT id, name, type, availability FROM entities WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&state.db_state.pool_pg)
        .await?
        .ok_or(MyError::Message("Entity not found"))?;

        // Fetch dependencies
        let dependencies = sqlx::query_as::<_, DependencyRow>(
            r#"
            SELECT r.to_id, e.type as target_type
            FROM relationships r
            JOIN entities e ON r.to_id = e.id
            WHERE r.from_id = $1
            "#,
        )
        .bind(id)
        .fetch_all(&state.db_state.pool_pg)
        .await?;

        // Group dependencies by type
        let mut groups: HashMap<String, Vec<DbBigSerial>> = HashMap::new();
        for dep in dependencies {
            groups
                .entry(dep.target_type)
                .or_insert_with(Vec::new)
                .push(dep.to_id);
        }

        let mut dependency_breakdown = Vec::new();
        // Base availability starts at 1.0 (100%), and we multiply by the availability of each dependency group (Series)
        // because different types of dependencies are usually required for function (e.g. Server AND Database).
        let mut total_dependency_availability_prob = 1.0;

        for (group_type, dep_ids) in groups {
            let mut group_reports = Vec::new();

            // For redundant instances of the same type (Parallel),
            // availability = 1 - product(probability of failure of each instance)
            // Failure prob = 1 - availability
            let mut group_failure_prob = 1.0;

            for dep_id in dep_ids {
                // Pass a clone of visited for each branch to allow diamond dependencies but prevent loops
                // Note: We use `state.clone()` because `BoxFuture` requires 'static lifetime for the async block
                // and `state` is cheap to clone (Arc).
                let dep_report = calculate_availability(dep_id, state.clone(), new_visited.clone()).await?;

                let dep_prob = dep_report.derived_availability / 100.0;
                // Probability this specific dependency fails
                let dep_fail_prob = 1.0 - dep_prob;

                group_failure_prob *= dep_fail_prob;

                group_reports.push(dep_report);
            }

            // Probability that at least one works
            let group_availability_prob = 1.0 - group_failure_prob;

            // Multiply total availability by this group's availability (Series logic for groups)
            total_dependency_availability_prob *= group_availability_prob;

            dependency_breakdown.push(DependencyGroup {
                group_type,
                group_availability: group_availability_prob * 100.0,
                dependencies: group_reports,
            });
        }

        let self_prob = entity.availability / 100.0;
        let derived_prob = self_prob * total_dependency_availability_prob;

        Ok(AnalysisReport {
            entity_id: id,
            name: entity.name,
            entity_type: entity.entity_type,
            self_availability: entity.availability,
            derived_availability: derived_prob * 100.0,
            dependency_breakdown,
        })
    })
}
