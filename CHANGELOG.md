# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## 1.3.2 (2026-11-14)

### Features

* **alerts:** alertas por umbral con cooldown ([a7eda6f](https://github.com/x0jonatanfp/server-status/commit/a7eda6fc4a1b7d945eacad492470371858867256))
* **alerts:** deja las alertas en el log en vez de en Discord ([5cc7146](https://github.com/x0jonatanfp/server-status/commit/5cc7146187ffffcfee3849d63deecf60489e23d4))
* **collectors:** comprobacion HTTP de las webs del inventario ([d06a8fa](https://github.com/x0jonatanfp/server-status/commit/d06a8fa30c55672b001beb9559d396096890fa40))
* **collectors:** estado de los servicios systemd ([7ecd883](https://github.com/x0jonatanfp/server-status/commit/7ecd883097e3b0419d51c1f14f7f38005828b1c6))
* **collectors:** fail2ban y agregacion del snapshot ([d1828f1](https://github.com/x0jonatanfp/server-status/commit/d1828f159328b0996fecf5ae008af17aeb6f6309))
* **collectors:** metricas de CPU, RAM, disco y uptime ([44538e0](https://github.com/x0jonatanfp/server-status/commit/44538e048c4d809dc2344817cda8430cdd78c502))
* **collectors:** temperaturas por hwmon y smartctl ([5175625](https://github.com/x0jonatanfp/server-status/commit/51756252be75690365400a5601051d67c89cd5cc))
* **commands:** /help-unban público y con barra morada ([7794033](https://github.com/x0jonatanfp/server-status/commit/7794033c26e449b957432f1b2bc932134fbb66d8))
* **commands:** /help-unban y /unban en Components V2 ([06b780e](https://github.com/x0jonatanfp/server-status/commit/06b780ee83206f0524b83a9734d29d449889b694))
* **commands:** /unban responde en una línea y se autoborra ([db8280e](https://github.com/x0jonatanfp/server-status/commit/db8280e1b030a4c1e0aae2ce3189f7f152526217))
* **commands:** seis comandos sin duplicados ([b4d4cc4](https://github.com/x0jonatanfp/server-status/commit/b4d4cc41e0cf3d456b9b4c411f4f9936dec6a9c1))
* **config:** carga y valida el .env y el inventario ([ef13969](https://github.com/x0jonatanfp/server-status/commit/ef139699cbf5a64dbf5332a2869a55cc18fc3b79))
* **config:** publica el estado en varios canales a la vez ([61ed700](https://github.com/x0jonatanfp/server-status/commit/61ed70059ab265822ffdf6566797b8caefcd128a))
* **inventory:** acento "info" (morado) para los mensajes de ayuda ([2446b94](https://github.com/x0jonatanfp/server-status/commit/2446b9456df426367cf80c054346687926e9a8be))
* **main:** arranque, registro de comandos y apagado limpio ([cd141c6](https://github.com/x0jonatanfp/server-status/commit/cd141c603431c1375a6d70739748e578198fa7fb))
* **render:** mensaje de estado en Components V2 ([fab920c](https://github.com/x0jonatanfp/server-status/commit/fab920c79768e56228d085120ab1b288ed31a594))
* **render:** nuevo panel compacto con recursos, discos y GPU ([9ab81c6](https://github.com/x0jonatanfp/server-status/commit/9ab81c68992884ad7a89493759c9c656b488e11d))
* **scheduler:** edita el mensaje y persiste su id ([def6dda](https://github.com/x0jonatanfp/server-status/commit/def6ddae5a881a4e116fbceb77ad139d5640e6fa))

### Bug Fixes

* **config:** respeta los corchetes en los nombres de rol ([7ebf87c](https://github.com/x0jonatanfp/server-status/commit/7ebf87c14e1abbe4e0750304b494ea7c0922cb74))
* **deploy:** no pidas root para consultar el estado ([5a46a4f](https://github.com/x0jonatanfp/server-status/commit/5a46a4ffdb3fe2c8e4492a7623986b6168f01f3d))
* **fail2ban:** desbanea por el helper f2b-unban (orden por stdin) ([f73600d](https://github.com/x0jonatanfp/server-status/commit/f73600da68f1bd59d947fa524c1559395acd71b8))
* **panel:** el acento no depende del ping del bot ([cdcf71e](https://github.com/x0jonatanfp/server-status/commit/cdcf71eaefa59c1d52cddea8cb070875e91f60bb))
* **presence:** reenvía la presencia al reconectar y en cada ciclo ([c9924bd](https://github.com/x0jonatanfp/server-status/commit/c9924bd14f3ef0c7f20d59f2e67bf90e9f12b14c))
* **render:** barras de ancho fijo y listas empaquetadas en el mensaje ([6b054a6](https://github.com/x0jonatanfp/server-status/commit/6b054a6d480d7be55ec1cc25d51e4ced91add81f))
* **render:** muestra la version de la distribucion en el encabezado ([6c6eb34](https://github.com/x0jonatanfp/server-status/commit/6c6eb341d859ae1ac22bb6807199de6130fd8b6b))
* sale con 1 si falla el login a Discord en vez de quedarse zombi ([a293d2d](https://github.com/x0jonatanfp/server-status/commit/a293d2dd7a3d52d862bd2ded98a45f0fbab54ad4))
