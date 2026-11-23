NAME := server-status
DEST ?= /srv/services/$(NAME)
SERVICE := $(NAME)
SYSTEMD_UNIT := /etc/systemd/system/$(SERVICE).service
# Usuario, grupo, home y binario de Node con los que se renderizan las
# plantillas: por defecto los del usuario que invoca make, sobrescribibles.
DEPLOY_USER ?= $(shell id -un)
DEPLOY_GROUP ?= $(shell id -gn)
DEPLOY_HOME ?= $(shell getent passwd $(DEPLOY_USER) | cut -d: -f6)
NODE_BIN ?= $(shell command -v node 2>/dev/null || echo /usr/bin/node)
# Ficheros temporales donde se renderizan las plantillas antes de instalarlas.
RENDERED_UNIT := /tmp/$(SERVICE).service.render
RENDERED_TMPFILES := /tmp/$(SERVICE).tmpfiles.render

.PHONY: build check install deploy restart status logs

build:
	pnpm build

check: typecheck test lint

typecheck:
	pnpm typecheck

test:
	pnpm test

lint:
	pnpm lint

# Instalacion inicial (una sola vez): renderiza las plantillas con el usuario,
# grupo, home, destino y binario de Node de la maquina, e instala la unidad, el
# tmpfiles y el logrotate. Necesita sudo. `make deploy` ya solo actualiza el
# codigo, pero debe usar el mismo DEST con el que se instalo.
install:
	rm -f $(RENDERED_UNIT)
	sed -e 's|@DEPLOY_USER@|$(DEPLOY_USER)|g' \
		-e 's|@DEPLOY_GROUP@|$(DEPLOY_GROUP)|g' \
		-e 's|@DEPLOY_HOME@|$(DEPLOY_HOME)|g' \
		-e 's|@DEST@|$(DEST)|g' \
		-e 's|@NODE_BIN@|$(NODE_BIN)|g' \
		deploy/$(SERVICE).service > $(RENDERED_UNIT)
	sudo install -m 644 $(RENDERED_UNIT) $(SYSTEMD_UNIT)
	rm -f $(RENDERED_UNIT)
	rm -f $(RENDERED_TMPFILES)
	sed -e 's|@DEPLOY_USER@|$(DEPLOY_USER)|g' \
		-e 's|@DEPLOY_GROUP@|$(DEPLOY_GROUP)|g' \
		deploy/$(SERVICE).tmpfiles.conf > $(RENDERED_TMPFILES)
	sudo install -m 644 $(RENDERED_TMPFILES) /etc/tmpfiles.d/$(SERVICE).conf
	rm -f $(RENDERED_TMPFILES)
	sudo install -m 644 deploy/$(SERVICE).logrotate.conf /etc/logrotate.d/$(SERVICE)
	sudo systemd-tmpfiles --create /etc/tmpfiles.d/$(SERVICE).conf
	sudo systemctl daemon-reload
	sudo systemctl enable $(SERVICE).service

# El bundle de esbuild es autocontenido: dist/index.js no necesita node_modules
# en destino. Solo viajan el codigo, el manifiesto y el inventario.
deploy: release build
	rsync -av --delete dist/ $(DEST)/dist/
	cp package.json inventory.yaml $(DEST)/
	test -f $(DEST)/.env || { echo "falta $(DEST)/.env"; exit 1; }
	sudo systemctl restart $(SERVICE).service
	systemctl is-active --quiet $(SERVICE).service

restart:
	sudo systemctl restart $(SERVICE).service

status:
	# Consultar el estado no necesita root: solo el restart lo necesita.
	systemctl status $(SERVICE).service --no-pager

logs:
	journalctl -u $(SERVICE).service -n 50 -f

# Versión: la calcula commit-and-tag-version a partir de los commits desde la
# última etiqueta (`!` major, feat minor, fix patch, el resto nada). Escribe
# la versión y el CHANGELOG.md, commitea `chore(release)` y etiqueta; si no
# hay feat, fix ni `!` nuevos, no hace nada. Corre antes de desplegar.
CATV := npx -y commit-and-tag-version@13.3.0

.PHONY: check-clean release

check-clean:
	@test -z "$$(git status --porcelain)" || { echo "ERROR: hay cambios sin commitear; commitea antes de desplegar"; exit 1; }

release: check-clean
	$(CATV)
	git push --follow-tags
