# AGENTS.md · server-status

Guía para agentes de código. Qué es, cómo se instala y cómo se configura para personas está en `README.md`.

## Qué es

Bot de Discord (TypeScript ESM, Node 22+) que publica el estado de una máquina Linux en **un único mensaje que se edita** en cada ciclo: métricas (CPU, GPU, RAM, volúmenes), temperaturas, unidades systemd, webs por HTTP y fail2ban. También comprueba umbrales y avisa con cooldown, y expone comandos slash.

Todo lo que se monitoriza sale de `inventory.yaml` (plantilla: `inventory.yaml.example`). No hay hosts, servicios ni canales en el código.

## Arquitectura

Hexagonal. Capas: `src/domain/` → `src/application/` → `src/infrastructure/`, y el composition root en `src/index.ts`.

- `src/domain/entities/`: `status-snapshot`, `system-metrics`, `temperature-reading`, `service-status`, `website-status`, `fail2ban-status`, `alert`, `inventory`, `status-view`.
- `src/domain/ports/`: puertos (`metrics`, `temperatures`, `services`, `websites`, `fail2ban`, `bot-status`, `state-store`, `status-renderer`, `status-publisher`, `alerts`, `logger`).
- `src/domain/services/`: lógica pura (`thresholds.ts`, `temperatures.ts`, `format.ts`).
- `src/application/`:
  - `collect-status.ts`: une los puertos de recolección en un `StatusSnapshot`.
  - `publish-status.ts`: `StatusLoop`. Un ciclo recolecta, renderiza, edita el mensaje y persiste su id. Los ciclos no se solapan, y los fallos se registran sin parar el bucle.
  - `check-alerts.ts`: `AlertChecker`, que evalúa umbrales con cooldown.
- `src/infrastructure/`: adaptadores que tocan el sistema o la red.
  - `metrics/`: `systeminformation`, `/sys/class/drm` (GPU), `/sys/class/hwmon` y `smartctl` (temperaturas).
  - `systemd/service-status.ts`, `http/website-probe.ts`, `fail2ban/client.ts`.
  - `discord/`: `client.ts` (cliente, presencia, conexión, interacciones), `publisher.ts`, `status-view.ts` (render en Components V2), `commands/`.
  - `persistence/state-store.ts`, `config/` (`env.ts`, `inventory.ts`, `validation.ts`, `version.ts`), `logging/logger.ts`, `exec.ts`.
- `src/index.ts`: `main()` cablea adaptadores con puertos. Carga la configuración y el inventario; si fallan, `ConfigError` aborta con código 1. Solo arranca cuando se ejecuta como programa, nunca al importarlo desde tests.

Flujo: `StatusLoop` → `collectStatus` (puertos) → `renderer` → `publisher` (edita el mensaje) → `AlertChecker`. Los comandos de `commands/` leen el mismo `context` (scheduler, store, collect, render, unban).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm install` | Instala dependencias (pnpm 11, fijado en `packageManager`). |
| `pnpm dev` | `tsx watch src/index.ts`. |
| `pnpm build` | Bundle único con esbuild en `dist/index.js`. No necesita `node_modules` en destino. |
| `pnpm start` | `node dist/index.js`. |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm lint` | `eslint .` (`eslint.config.js`). |
| `pnpm test` / `test:watch` / `test:coverage` | Vitest. |
| `make check` | typecheck, test y lint. |
| `make deploy` | Depende de `release`: ejecuta el versionado y `git push --follow-tags`. Después hace build, sincroniza `dist/` y copia `package.json` e `inventory.yaml` al destino, y reinicia la unidad. **Usa `sudo` y publica en remoto. No lo lances sin orden expresa.** |
| `make install` | Instala unidad, tmpfiles y logrotate, y habilita la unidad. **Una sola vez, con `sudo`.** |
| `make release` | Exige árbol limpio, ejecuta `commit-and-tag-version` y hace push. |
| `pnpm restart`, `pnpm status`, `pnpm logs` | Atajos a `systemctl`/`journalctl` de la unidad. `restart` usa `sudo`. |

## Cómo probar un cambio

- Tests en `tests/*.test.ts`, con Vitest 5. Hay un snapshot en `tests/__snapshots__/status-view.test.ts.snap`: si cambia el render, el snapshot cambia. Revísalo antes de actualizarlo.
- Los casos de uso se prueban con dobles de los puertos (`alert-manager`, `collect-status`, `scheduler`, `commands`, `discord-adapter`...). Ningún test debe tocar el sistema real, Discord ni la red.
- Un solo fichero, derivado del script `test`: `pnpm vitest run tests/collect-status.test.ts`.
- Antes de dar un cambio por bueno: `make check` (typecheck, test y lint).
- Cada comportamiento nuevo o bug corregido lleva su test en el mismo cambio.

## Convenciones

- Gestor: **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`).
- Imports con extensión `.ts` (`allowImportingTsExtensions` en `tsconfig.json`, `noEmit`). Ojo: en otros repos del grupo es `.js`; aquí es `.ts`.
- Código y nombres en inglés. Comentarios y docstrings en español, explicando el porqué (así está en el código actual).
- Versión y `CHANGELOG.md` los genera `commit-and-tag-version` (`.versionrc.json`) con `make release`. **No se editan a mano.** La versión también aparece en `src/infrastructure/config/version.ts`, que se lee desde `package.json`; revisa ese fichero si un cambio lo toca.
- Configuración: `.env` (no versionado) a partir de `.env.example`; `inventory.yaml` (no versionado) a partir de `inventory.yaml.example`. Ambos abortan el arranque si son inválidos.

## Decisiones y trampas

- **Edición, no reenvío.** Un único mensaje por canal que se edita en cada ciclo, para no perder reacciones ni hilos. Si `STATUS_CHANNEL_IDS` cambia o se usa `/set_channel`, el id persiste en el estado (`store.getStatusChannelId()`) y tiene prioridad sobre el `.env`.
- **Presencia.** El estado personalizado de Discord caduca con las horas, por eso `refreshPresence` se llama en cada ciclo y al (re)conectar (`attachPresence`).
- **Login fallido = salida con código 1.** `connect()` destruye el cliente y sale para que systemd reinicie el servicio. No conviertas esto en un reintento silencioso.
- **fail2ban y sudo.** Las consultas van por `sudo -n` (`fail2ban/client.ts`). Las reglas de sudoers con comodines en argumentos no funcionan en Ubuntu 26.04, así que el desbaneo pasa por un helper que recibe la cárcel y la IP por stdin. Cambiar esto requiere tocar también la configuración del sistema, no solo el código.
- **Unidad systemd.** Con `NoNewPrivileges` no funcionaría `sudo`, por eso la unidad no lo activa. Cualquier endurecimiento de la unidad debe comprobar antes el comando de fail2ban.
- **`make deploy` copia `inventory.yaml`** desde el directorio de trabajo. Ese fichero es local (ignorado por git): sin él, el despliegue no tiene inventario real. No lo versiones.
- **El bundle no lleva `node_modules`.** Se genera con esbuild con un banner que define `require` para dependencias CJS. Si añades una dependencia que requiera `require` en tiempo de ejecución, verifica el bundle con `pnpm build && pnpm start`.

## Mantenimiento

- Este fichero y el `README.md` se actualizan en el mismo cambio que los deja obsoletos.
- Aquí solo va lo que puede ser público: nada de rutas locales, puertos de la máquina, IPs, perfiles de secretos ni datos personales.
