.PHONY: backend-dev backend-test backend-app-auth frontend-dev


BE_DIR := backend
FE_DIR := frontend
IMAGE_NAME := service-capture

status-ports:
	@lsof -i tcp:8080
	@lsof -i tcp:4200


backend-dev: export CAPTURE_LOG=INFO
backend-dev:
	cd ${BE_DIR} && cargo watch  -x "run -- start --config test-data/config-localhost.yaml --secrets test-data/secrets"

backend-test:
	cd ${BE_DIR} && cargo watch --ignore test_data -x "test"

backend-docker: PKG_NAME=service-capture
backend-docker:
	{ \
	docker buildx build ${BE_DIR} -t $(IMAGE_NAME)-backend -f ${BE_DIR}/Dockerfile; \
	docker image ls $(IMAGE_NAME)-backend; \
	}

backend-docker-run: backend-docker
	docker run -it --rm --name $(IMAGE_NAME)-backend -p 8080:8080 --mount type=bind,src=$(PWD)/${BE_DIR}/test-data,dst=/test-data  \
	-e CAPTURE_LOG=INFO \
	-e APP_PERSISTENCE__DB__CONNECTION__URL=postgres://host.docker.internal:5432/service-capture \
	$(IMAGE_NAME)-backend start --config /test-data/config-localhost.yaml --secrets /test-data/secrets


backend-app-auth:
	cd ${BE_DIR} && DATABASE_URL=${DATABASE_URL} cargo watch  -x "run -- app-auth --config test-data/config-localhost.yaml --secrets test-data/secrets"


DB_URL = $(shell yq ".persistence.db.connection.url" ${BE_DIR}/test-data/config-localhost.yaml)
DB_INSTANCE = $(shell echo $(DB_URL) | sed 's|.*/||')
DB_USER = $(shell cat backend/test-data/secrets/db/username)
DB_PASSWORD = $(shell cat backend/test-data/secrets/db/password)
PG_PASSWORD_STARS = $(shell printf '%*s' $$(echo -n "$(DB_PASSWORD)" | wc -c) | tr ' ' '*')
DB_URL_EXPANDED = postgres://${DB_USER}:${DB_PASSWORD}@localhost/${DB_INSTANCE}
DB_URL_EXPANDED_STARS = postgres://${DB_USER}:${PG_PASSWORD_STARS}@localhost/${DB_INSTANCE}

DB_DOCKER_CONTAINER_NAME = backend-pg-test-container




db-local:
	docker rm -f ${DB_DOCKER_CONTAINER_NAME} || true
	@echo starting DB with ${DB_URL}
	docker run -it --rm --name ${DB_DOCKER_CONTAINER_NAME} -e POSTGRES_USER=${DB_USER} -e POSTGRES_PASSWORD=${DB_PASSWORD} -e POSTGRES_DB=${DB_INSTANCE} -p 5432:5432 postgres:17.4

db-info:
	@echo DB: ${DB_URL_EXPANDED_STARS}

db-login:
	@PGPASSWORD=${DB_PASSWORD} psql -h localhost -U ${DB_USER} -d ${DB_INSTANCE}

db-schema-info:
	@cd backend && sqlx migrate info --database-url ${DB_URL_EXPANDED}

db-schema-run:
	@cd backend && sqlx migrate run --database-url ${DB_URL_EXPANDED}

db-schema-revert:
	@cd backend && sqlx migrate revert --database-url ${DB_URL_EXPANDED}


frontend-dev:
	cd frontend && ng serve

frontend-docker: PKG_NAME=service-capture
frontend-docker:
	{ \
	docker build ${FE_DIR} -t $(IMAGE_NAME)-frontend -f ${FE_DIR}/Dockerfile --build-arg PKG_NAME=${PKG_NAME}; \
	docker image ls $(IMAGE_NAME)-frontend; \
	}

frontend-docker-run: frontend-docker
	docker run -it --rm -p 4201:8080 --name $(IMAGE_NAME)-frontend $(IMAGE_NAME)-frontend
