COMPOSE := docker compose --env-file .env -f compose/compose.yaml

.PHONY: init validate pull up down ps logs connectors

init:
	./scripts/bootstrap.sh

validate:
	./scripts/validate.sh

pull:
	$(COMPOSE) --profile ai pull

up:
	$(COMPOSE) --profile ai up -d

down:
	$(COMPOSE) down

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=100

connectors:
	node scripts/connector-preflight.mjs
