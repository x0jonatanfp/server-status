/**
 * Ejecucion de binarios del sistema sin shell.
 *
 * Se usa `execFile` con argumentos en lista, nunca `shell: true`: los valores
 * que vienen del inventario o de un comando de Discord (una IP, por ejemplo) no
 * pueden acabar interpretados por un shell.
 */
import { execFile } from "node:child_process";

export interface ExecResult {
  stdout: string;
  stderr?: string;
}

export interface ExecFileOptions {
  timeout: number;
  /**
   * Texto que se escribe en la entrada estandar y se cierra. Los helpers que
   * leen la orden por stdin (f2b-unban) se quedan esperando hasta el timeout si
   * no se les cierra. Ausente = no se toca stdin.
   */
  input?: string;
}

export type ExecFileFn = (
  file: string,
  args: string[],
  options: ExecFileOptions,
) => Promise<ExecResult>;

/**
 * Implementacion por defecto. Si el binario falla, el error rechazado conserva
 * `stdout` y `stderr`: hay herramientas (smartctl) que salen con codigo distinto
 * de cero y aun asi devuelven la informacion en la salida.
 */
export const defaultExec: ExecFileFn = (file, args, options) =>
  new Promise((resolve, reject) => {
    const child = execFile(
      file,
      args,
      { timeout: options.timeout, maxBuffer: 1024 * 1024, encoding: "utf8" },
      (error, stdout, stderr) => {
        if (error) {
          reject(Object.assign(error, { stdout, stderr }));
          return;
        }
        resolve({ stdout, stderr });
      },
    );

    if (options.input !== undefined && child.stdin) {
      // El proceso puede cerrar stdin antes de leerlo (p. ej. si rechaza los
      // argumentos): un EPIPE tardio no es un fallo del comando.
      child.stdin.on("error", () => {});
      child.stdin.end(options.input);
    }
  });

/** Extrae la salida de un error de `execFile` (vacia si no la trae). */
export function stdoutOf(error: unknown): string {
  return streamOf(error, "stdout");
}

/** Extrae la salida de error de un error de `execFile` (vacia si no la trae). */
export function stderrOf(error: unknown): string {
  return streamOf(error, "stderr");
}

function streamOf(error: unknown, key: "stdout" | "stderr"): string {
  const value = (error as Record<string, unknown> | null)?.[key];
  return typeof value === "string" ? value : "";
}
