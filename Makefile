.PHONY: up down logs test build
up:
	docker compose up --build
down:
	docker compose down
logs:
	docker compose logs -f api web
test:
	docker compose run --rm api pytest
build:
	docker compose build

