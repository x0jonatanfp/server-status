<div align="center">

# server-status

**Discord bot that publishes the status of a server: metrics, temperatures,
systemd services, websites and latencies, in a single message that is edited.**

</div>

[Español](README.es.md)

---

## What it does

- Publishes **a single message** per channel and **edits** it on every cycle (it does not delete or
  resend, so reactions and threads are not lost).
- Collects CPU, GPU, RAM, the usage of **each mounted volume** and uptime: CPU and RAM
  with `systeminformation`, GPU usage from `/sys/class/drm`.
- Reads **real temperatures** from the CPU, GPU, NVMe and SATA disks: through
  `/sys/class/hwmon` (no privileges needed) and `smartctl` for the SATA disks. Each reading
  travels in the row of the resource it is linked to.
- Checks the **systemd units** and the **websites** you specify, over HTTP.
- Shows the status and latency of the bot itself, and the fail2ban summary.
- Raises alerts for **thresholds** (CPU, memory, disk, ping and temperature) with a cooldown:
  to the service log, or to a Discord channel if you define `ALERT_CHANNEL_ID`.
- Includes `/unban` to unban an IP from all fail2ban jails.

Everything it shows comes from the configuration: there are no hosts, services or channels
in the code.

## Requirements

- Node 22 or higher
- Linux with systemd
- Optional: `lm-sensors` and `smartmontools` for the temperatures, and `fail2ban`
  for the unban command (which uses a NOPASSWD helper to unban; see
  `FAIL2BAN_UNBAN_HELPER` in `.env.example`)

## Installation

This repository **does not include** any Discord application: each person uses their
own. To set it up:

1. **Create the application and the bot** in the
   [developer portal](https://discord.com/developers/applications):
   *New Application* → **Bot** tab → *Reset Token* → copy the token.
2. **Invite the bot** to your server with the `Send Messages` and
   `Embed Links` permissions (and `Manage Messages` if you want it to clean up old messages).
3. **Clone and install**:

   ```bash
   git clone <your-repo> server-status
   cd server-status
   pnpm install
   ```

4. **Configure**:

   ```bash
   cp .env.example .env && chmod 600 .env
   cp inventory.yaml.example inventory.yaml
   ```

   In `.env` fill in `DISCORD_TOKEN` and `STATUS_CHANNEL_IDS` (one or more channels
   separated by commas, to publish the same status in several servers). In
   `inventory.yaml` put your websites, your systemd units and your sensors.

   `.env` holds the token and is not versioned; `inventory.yaml` describes your
   machine and is not versioned either.

5. **Start**:

   ```bash
   pnpm dev      # development, with reload
   pnpm build    # production bundle in dist/
   pnpm start
   ```

## Commands

| Command | What it does | Permissions |
|---|---|---|
| `/status` | Full status, as an ephemeral reply | configured role |
| `/set_channel [channel]` | Sets the publishing channel and publishes now | Administrator |
| `/update` | Forces an immediate update | Administrator |
| `/botstatus` | Bot status: cycle, latency and last publication | Administrator |
| `/unban <ip>` | Unbans the IP from all fail2ban jails | configured role |
| `/help-unban` | Help for the auto-unban system | configured role |

`/set_channel` makes that channel the only destination. To publish to several at
once, the list goes in `STATUS_CHANNEL_IDS`.

## Configuration

- **`.env`** — token, channels, roles, interval, timeouts and paths. It is fully
  documented in `.env.example`.
- **`inventory.yaml`** — what is monitored: websites, grouped services, sensors
  with their thresholds, the resource rows of the message (CPU, GPU, RAM and
  volumes), which blocks are shown and the alert thresholds. It is commented
  in `inventory.yaml.example`.

A bad `.env` or `inventory.yaml` **aborts startup**, saying which key fails,
instead of starting halfway.

## Architecture

Hexagonal (ports and adapters):

```
src/
├── domain/           entities, ports and pure logic (no system or Discord)
├── application/      use cases: collect, publish, evaluate alerts
├── infrastructure/   adapters: systeminformation, hwmon, smartctl, systemd,
│                     HTTP, fail2ban, Discord and persistence
└── index.ts          composition root: wires ports to adapters
```

`domain/` does not import anything from `infrastructure/`, and `application/` only depends on
`domain/`. That is what makes it possible to test the cycles with doubles instead of touching the
system.

## Development

```bash
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest
pnpm lint        # eslint
pnpm build       # esbuild -> dist/index.js
```

## Deployment

The repository ships the templates in `deploy/` (systemd unit, tmpfiles and
logrotate) and a `Makefile`:

```bash
make check      # typecheck, tests and lint
make install    # renders the templates and installs the unit (once, with sudo)
make deploy     # build + rsync to <DEST> + restart
make logs       # service journalctl
```

`make install` replaces the template placeholders (`@DEPLOY_USER@`,
`@DEPLOY_GROUP@`, `@DEPLOY_HOME@`, `@DEST@` and `@NODE_BIN@`) with the values of
your machine: the user running `make`, its group and home, its Node binary and
the `DEST` destination. For another destination:
`make install DEST=/path/to/service` (and the same `DEST` in `make deploy`).

The esbuild bundle is self-contained: `dist/index.js` does not need
`node_modules` at the destination. The unit template starts the bot through a
secrets launcher of your machine; if you do not use one, change `ExecStart` to
invoke Node directly.

## License

MIT
