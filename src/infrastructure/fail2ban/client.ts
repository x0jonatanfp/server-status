/**
 * Cliente de fail2ban: estado de las carceles y desbaneo de IPs.
 *
 * Las consultas van por `sudo -n /usr/bin/fail2ban-client status` (la regla
 * NOPASSWD ya existe) y siempre con `execFile` y argumentos en lista, nunca con
 * shell: la IP de `/unban` la escribe una persona en Discord y no puede acabar
 * interpretada por un shell. Ademas se valida antes de invocar nada.
 *
 * El desbaneo NO se hace con `fail2ban-client set <carcel> unbanip <ip>`: la
 * regla sudoers con comodines en argumentos la rechaza el sudo de 26.04 ("wildcards
 * are not allowed in command arguments"), asi que en su lugar se llama al helper
 * NOPASSWD `/usr/local/bin/f2b-unban`, que se ejecuta sin argumentos y recibe
 * `CARCEL IP` por la entrada estandar. El helper valida la carcel contra su
 * propia lista y la IP antes de tocar fail2ban.
 *
 * Las carceles salen siempre de la respuesta de fail2ban, nunca de una lista
 * fija: el bot antiguo solo conocia 7 de las 9 y dejaba baneos sin limpiar.
 */
import { isIP } from "node:net";

import type {
  Fail2banStatus,
  Fail2banUnbanJail,
  Fail2banUnbanResult,
} from "../../domain/entities/fail2ban-status.ts";
import type { Fail2banPort } from "../../domain/ports/fail2ban.ts";
import { defaultExec, stderrOf, stdoutOf, type ExecFileFn } from "../exec.ts";

export const DEFAULT_SUDO_PATH = "/usr/bin/sudo";
export const DEFAULT_FAIL2BAN_CLIENT_PATH = "/usr/bin/fail2ban-client";
/** Helper sin argumentos que desbanea (`CARCEL IP` por stdin). */
export const DEFAULT_FAIL2BAN_UNBAN_HELPER_PATH = "/usr/local/bin/f2b-unban";
const DEFAULT_TIMEOUT_MS = 5000;

/** Error de validacion: la IP no se ha llegado a pasar a fail2ban. */
export class InvalidIpError extends Error {
  constructor(ip: string) {
    super(`${JSON.stringify(ip)} no es una IP valida`);
    this.name = "InvalidIpError";
  }
}

export interface Fail2banClientOptions {
  sudoPath?: string;
  clientPath?: string;
  /** Helper NOPASSWD de desbaneo; lee `CARCEL IP` por stdin. */
  helperPath?: string;
  timeoutMs?: number;
  exec?: ExecFileFn;
}

export function createFail2banClient(options: Fail2banClientOptions = {}): Fail2banPort {
  const setup: Fail2banClient = {
    exec: options.exec ?? defaultExec,
    sudoPath: options.sudoPath ?? DEFAULT_SUDO_PATH,
    clientPath: options.clientPath ?? DEFAULT_FAIL2BAN_CLIENT_PATH,
    helperPath: options.helperPath ?? DEFAULT_FAIL2BAN_UNBAN_HELPER_PATH,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };

  return {
    status: () => fetchStatus(setup),
    unban: (ip: string) => unbanIp(ip, setup),
  };
}

interface Fail2banClient {
  exec: ExecFileFn;
  sudoPath: string;
  clientPath: string;
  helperPath: string;
  timeoutMs: number;
}

/** Consulta con `sudo -n fail2ban-client`. */
async function runClient(client: Fail2banClient, args: string[]): Promise<string> {
  const { stdout } = await client.exec(client.sudoPath, ["-n", client.clientPath, ...args], {
    timeout: client.timeoutMs,
  });
  return stdout;
}

/**
 * Desbanea con `sudo -n f2b-unban`, sin argumentos: la carcel y la IP viajan por
 * stdin, que es el unico canal que acepta el helper.
 */
async function runHelper(client: Fail2banClient, jail: string, ip: string): Promise<void> {
  await client.exec(client.sudoPath, ["-n", client.helperPath], {
    timeout: client.timeoutMs,
    input: `${jail} ${ip}\n`,
  });
}

/** Consulta el estado de todas las carceles. */
async function fetchStatus(client: Fail2banClient): Promise<Fail2banStatus> {
  let overview: string;
  try {
    overview = await runClient(client, ["status"]);
  } catch (error) {
    return {
      available: false,
      totalBanned: 0,
      jails: [],
      error: describeError(error),
    };
  }

  const names = parseJailList(overview);
  const jails = await Promise.all(
    names.map(async (name) => {
      try {
        return { name, banned: parseCurrentlyBanned(await runClient(client, ["status", name])) };
      } catch {
        return { name, banned: null };
      }
    }),
  );

  const totalBanned = jails.reduce((total, jail) => total + (jail.banned ?? 0), 0);
  return { available: true, totalBanned, jails, error: null };
}

/**
 * Desbanea una IP de todas las carceles. Lanza `InvalidIpError` sin ejecutar
 * nada si la IP no es valida.
 */
async function unbanIp(ip: string, client: Fail2banClient): Promise<Fail2banUnbanResult> {
  const trimmed = ip.trim();
  if (isIP(trimmed) === 0) throw new InvalidIpError(ip);

  const names = parseJailList(await runClient(client, ["status"]));
  const jails: Fail2banUnbanJail[] = await Promise.all(
    names.map(async (name) => {
      try {
        await runHelper(client, name, trimmed);
        return { name, ok: true, error: null };
      } catch (error) {
        return { name, ok: false, error: describeError(error) };
      }
    }),
  );

  return { ip: trimmed, jails };
}

/** Saca la lista de carceles de la salida de `fail2ban-client status`. */
export function parseJailList(output: string): string[] {
  const match = /Jail list:\s*(.*)$/m.exec(output);
  if (!match?.[1]) return [];
  return match[1]
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
}

/** Saca `Currently banned` de la salida de `fail2ban-client status <carcel>`. */
export function parseCurrentlyBanned(output: string): number | null {
  const match = /Currently banned:\s*(\d+)/.exec(output);
  return match?.[1] === undefined ? null : Number(match[1]);
}

/** Mensaje del error con la ultima linea de stderr (o stdout si no hay). */
function describeError(error: unknown): string {
  const parts = [error instanceof Error ? error.message : String(error)];
  const stream = stderrOf(error).trim() || stdoutOf(error).trim();
  const detail = stream.split("\n").at(-1) ?? "";
  if (detail !== "") parts.push(detail);
  return parts.filter((part) => part !== "").join(": ");
}
