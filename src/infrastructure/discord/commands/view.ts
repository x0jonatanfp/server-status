/**
 * Mensaje de ayuda en Components V2.
 *
 * Los comandos no hablan con discord.js: montan la misma `StatusView` que el
 * mensaje de estado (bloques de texto + nivel + color de acento) y el adaptador
 * la convierte en un `Container`. Asi `/help-unban` comparte la barra de color y
 * los separadores del mensaje de estado, en vez de texto plano.
 */
import type { DisplayColors } from "../../../domain/entities/inventory.ts";
import type { StatusView } from "../../../domain/entities/status-view.ts";
import { accentColorFromHex } from "../../../domain/services/thresholds.ts";

/**
 * Vista con el acento `info` (morado) del inventario, no ligado a un nivel: es
 * para el mensaje de ayuda, que no tiene "estado".
 */
export function infoView(blocks: string[], colors: DisplayColors): StatusView {
  return { blocks, level: "ok", accentColor: accentColorFromHex(colors.info) };
}
