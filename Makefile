COMPOSE := docker compose --env-file .env -f compose/compose.yaml
BROWSER_PROFILES ?= browser-chatgpt browser-claude browser-gemini
BROWSER_PROFILE_FLAGS := $(foreach profile,$(BROWSER_PROFILES),--profile $(profile))

.PHONY: init validate pull up down ps logs connectors browser-check browser browser-up browser-up-all browser-down browser-logs projects-sync agents-run

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

browser-up:
	@test -n "$(BROWSER_PROFILES)" || (echo "BROWSER_PROFILES est vide" >&2; exit 2)
	$(COMPOSE) --profile ai $(BROWSER_PROFILE_FLAGS) up -d

browser-up-all:
	$(COMPOSE) --profile ai --profile browser-chatgpt --profile browser-claude --profile browser-gemini --profile browser-deepseek --profile browser-grok --profile browser-mistral --profile browser-suno up -d

browser-down:
	$(COMPOSE) $(BROWSER_PROFILE_FLAGS) stop

browser-logs:
	$(COMPOSE) $(BROWSER_PROFILE_FLAGS) logs -f --tail=100

projects-sync:
	node scripts/projects-sync.mjs

agents-run:
	node scripts/agent-runner.mjs
