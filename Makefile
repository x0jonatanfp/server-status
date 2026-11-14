NAME := server-status
DEST := /srv/services/$(NAME)
SERVICE := $(NAME)

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

# Instalacion inicial (una sola vez): unidad de systemd, tmpfiles y logrotate.
# Necesita sudo. `make deploy` ya solo actualiza el codigo.
install:
	sudo install -m 644 deploy/server-status.service /etc/systemd/system/server-status.service
	sudo install -m 644 deploy/server-status.tmpfiles.conf /etc/tmpfiles.d/server-status.conf
	sudo install -m 644 deploy/server-status.logrotate.conf /etc/logrotate.d/server-status
	sudo systemd-tmpfiles --create /etc/tmpfiles.d/server-status.conf
	sudo systemctl daemon-reload
	sudo systemctl enable server-status.service

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
