# AGENTS.md · server-status

Guía para agentes de código que trabajan en este repositorio. Qué es, cómo se instala y cómo se usa está en el `README.md`.

## Qué es

**Bot de Discord que publica el estado de un servidor: métricas, temperaturas, servicios systemd, webs y latencias, en un solo mensaje que se edita.**

## Estructura

- `deploy/`
- `src/`
- `tests/`
- `.env.example`
- `.gitignore`
- `.versionrc.json`
- `CHANGELOG.md`
- `Makefile`
- `README.md`
- `eslint.config.js`
- `inventory.yaml.example`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.json`

## Comandos

Scripts de `package.json` (raíz):

| Comando | Ejecuta |
| --- | --- |
| `pnpm dev` | `tsx watch src/index.ts` |
| `pnpm start` | `node dist/index.js` |
| `pnpm build` | `esbuild src/index.ts --bundle --platform=node --format=esm --target=node22 --outfile=dist/index.js --banner:js="import{createRequire}from'module';const require=createRequire(import.meta.url);"` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | `vitest run` |
| `pnpm test:watch` | `vitest` |
| `pnpm test:coverage` | `vitest run --coverage` |
| `pnpm lint` | `eslint .` |
| `pnpm deploy` | `make deploy` |
| `pnpm restart` | `sudo systemctl restart server-status.service` |
| `pnpm status` | `sudo systemctl status server-status.service --no-pager` |
| `pnpm logs` | `journalctl -u server-status.service -n 50 -f` |

Objetivos del `Makefile`:

- `make build`
- `make check`
- `make typecheck`
- `make test`
- `make lint`
- `make install`
- `make deploy`
- `make restart`
- `make status`
- `make logs`
- `make check-clean`
- `make release`

## Convenciones

- Gestor de paquetes: **pnpm** (según el lockfile).
- Lint/formato: `eslint.config.js`.
- Tests en `tests/`.
- El despliegue versionado (unidad systemd y similares) vive en `deploy/`. Los datos de esta máquina (rutas, puertos, perfiles de secretos) no van aquí: están fuera del repo.
- Configuración por entorno: copia `.env.example` a `.env` (ignorado por git). Nunca se versionan valores reales.
- Versión y `CHANGELOG.md` los genera la release (skill `my-commits`); no se editan a mano.

## Mantenimiento

- Este fichero y el `README.md` se actualizan en el mismo cambio que los deja obsoletos.
- Aquí solo va lo que puede ser público: nada de rutas locales, puertos de la máquina, IPs, perfiles de secretos ni datos personales.
