COMPOSE := docker compose --env-file .env -f compose/compose.yaml

.PHONY: init validate pull up down ps logs connectors browser-check browser

init:
	./scripts/bootstrap.sh

validate:
	./scripts/validate.sh

pull:
	$(COMPOSE) --profile ai pull

up:
	$(COMPOSE) --profile ai up -d --build

down:
	$(COMPOSE) down

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=100

connectors:
	node scripts/connector-preflight.mjs

browser-check:
	./scripts/browser-check.sh

browser:
	@test -n "$(NAME)" || (echo "Usage : make browser NAME=chatgpt" >&2; exit 2)
	./scripts/browser-open.sh "$(NAME)"
