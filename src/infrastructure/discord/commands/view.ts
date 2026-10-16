/**
 * Ayuda para que un comando responda con un mensaje en Components V2.
 *
 * Los comandos no hablan con discord.js: montan la misma `StatusView` que el
 * mensaje de estado (bloques de texto + nivel + color de acento) y el adaptador
 * la convierte en un `Container`. Asi `/help-unban` y `/unban` comparten la barra
 * de color y los separadores del mensaje de estado, en vez de texto plano.
 */
import type { DisplayColors } from "../../../domain/entities/inventory.ts";
import type { StatusView } from "../../../domain/entities/status-view.ts";
import { accentColor, accentColorFromHex, type Level } from "../../../domain/services/thresholds.ts";

export function commandView(blocks: string[], level: Level, colors: DisplayColors): StatusView {
  return { blocks, level, accentColor: accentColor(level, colors) };
}

/**
 * Igual que `commandView` pero con el acento `info` (morado) del inventario, no
 * ligado a un nivel: es para los mensajes de ayuda, que no tienen "estado".
 */
export function infoView(blocks: string[], colors: DisplayColors): StatusView {
  return { blocks, level: "ok", accentColor: accentColorFromHex(colors.info) };
}
