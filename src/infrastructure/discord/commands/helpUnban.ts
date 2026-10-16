/**
 * `/help-unban` — ayuda del desbaneo, en un contenedor como el mensaje de estado.
 *
 * Porta el contenido del embed antiguo (qué es, pasos para recuperar el acceso,
 * ejemplo, qué cárceles se tocan, permisos) al estilo del bot nuevo.
 */
import { SlashCommandBuilder } from "discord.js";

import { ensureRole } from "./access.ts";
import { commandView } from "./view.ts";
import type { CommandDefinition } from "./types.ts";

export const helpUnbanCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName("help-unban")
    .setDescription("Ayuda del sistema de autodesbaneo de fail2ban"),

  async execute(interaction, context) {
    if (!(await ensureRole(interaction, context))) return;

    const roles =
      context.config.requiredRoles.length > 0
        ? context.config.requiredRoles.join(", ")
        : "cualquiera";

    const blocks = [
      [
        "🔒 **Autodesbaneo de fail2ban**",
        "",
        "Si te has quedado fuera por un baneo automático, alguien con permiso puede levantarlo con un solo comando.",
      ].join("\n"),

      [
        "🛠 **Cómo recuperar el acceso**",
        "",
        "1. Averigua tu IP pública en <https://ifconfig.me>.",
        "2. Escribe el comando con esa IP: `/unban <ip>`",
        "",
        "Por ejemplo: `/unban 80.58.61.250`",
      ].join("\n"),

      [
        "🔎 **Qué hace el bot**",
        "",
        "• Desbanea esa IP **en todas las cárceles** (sshd, nginx, postfix, dovecot, postgresql, recidive...).",
        "• La lista de cárceles se pregunta a fail2ban en el momento, no está fijada en el código.",
        "• La IP se valida antes de tocar nada: si no es una IP, no se ejecuta ningún comando.",
        "• Se informa del resultado cárcel por cárcel, y si alguna falla se dice cuál.",
      ].join("\n"),

      [
        "👥 **Permisos**",
        "",
        `Roles con permiso: ${roles}.`,
        "El total de IPs baneadas por cárcel está en el mensaje de estado.",
      ].join("\n"),
    ];

    await interaction.reply({
      view: commandView(blocks, "ok", context.inventory.display.colors),
      ephemeral: true,
    });
  },
};
