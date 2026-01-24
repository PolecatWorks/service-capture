#!/bin/bash

BASE_URL="http://localhost:8080/capture"
CONTENT_TYPE="Content-Type: application/json"

# Helper function to create entity
create_entity() {
  name=$1
  type=$2
  x=$3
  y=$4

  # Basic metrics
  p99=100
  p95=50
  availability=99.9
  throughput=10

  response=$(curl -s -X POST "$BASE_URL/entities" -H "$CONTENT_TYPE" -d "{
    \"name\": \"$name\",
    \"type\": \"$type\",
    \"p99_millis\": $p99,
    \"p95_millis\": $p95,
    \"availability\": $availability,
    \"throughput_rps\": $throughput,
    \"x\": $x,
    \"y\": $y,
    \"attributes\": {}
  }")

  # Extract ID (simple grep since we don't have jq guaranteed)
  id=$(echo $response | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
  echo $id
}

# Helper function to create relationship
create_rel() {
  from=$1
  to=$2
  type=$3

  curl -s -X POST "$BASE_URL/relationships" -H "$CONTENT_TYPE" -d "{
    \"from_id\": $from,
    \"to_id\": $to,
    \"relationship_type\": \"$type\",
    \"attributes\": {}
  }" > /dev/null
}

echo "Creating Hosts..."
HOST_A=$(create_entity "Host-A" "host" 0 0)
HOST_B=$(create_entity "Host-B" "host" 200 0)
HOST_C=$(create_entity "Host-C" "host" 400 0)

echo "Hosts created: A=$HOST_A, B=$HOST_B, C=$HOST_C"

echo "Creating Database on Host B..."
DB_1=$(create_entity "Database-1" "database" 200 100)
create_rel $DB_1 $HOST_B "hosted_on"

echo "Creating Services on Host A..."
USER_SVC_1=$(create_entity "Service-1" "service" 0 100)
USER_SVC_2=$(create_entity "Service-2" "service" 50 100)
USER_SVC_3=$(create_entity "Service-3" "service" 100 100)

create_rel $USER_SVC_1 $HOST_A "hosted_on"
create_rel $USER_SVC_2 $HOST_A "hosted_on"
create_rel $USER_SVC_3 $HOST_A "hosted_on"

# Services depend on DB
create_rel $USER_SVC_1 $DB_1 "depends_on"
create_rel $USER_SVC_2 $DB_1 "depends_on"
create_rel $USER_SVC_3 $DB_1 "depends_on"

echo "Creating Aggregator Service on Host C..."
AGG_SVC=$(create_entity "Service-4" "service" 400 100)
create_rel $AGG_SVC $HOST_C "hosted_on"

# Aggregator depends on user services
create_rel $AGG_SVC $USER_SVC_1 "depends_on"
create_rel $AGG_SVC $USER_SVC_2 "depends_on"
create_rel $AGG_SVC $USER_SVC_3 "depends_on"

echo "Topology creation complete!"
