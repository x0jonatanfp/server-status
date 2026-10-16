/**
 * `/unban <ip>` — desbanea una IP en todas las carceles de fail2ban.
 *
 * La validacion de la IP vive en el adaptador de fail2ban: si no es valida no se
 * ejecuta ningun proceso, y aqui solo se informa.
 *
 * La respuesta es UNA linea de texto efimera (solo la ve quien escribe el
 * comando y desaparece): no lleva contenedor ni el detalle carcel por carcel,
 * porque el mensaje no se queda. La marca sigue siendo honesta: `0/N` no se
 * pinta con un ✅.
 */
import { SlashCommandBuilder } from "discord.js";

import { InvalidIpError } from "../../fail2ban/client.ts";
import type { Fail2banUnbanResult } from "../../../domain/entities/fail2ban-status.ts";
import { ensureRole } from "./access.ts";
import type { CommandDefinition } from "./types.ts";

/** Milisegundos que la confirmacion se queda a la vista antes de borrarse. */
export const UNBAN_RESULT_TTL_MS = 8000;

export const unbanCommand: CommandDefinition = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Desbanea una IP de todas las carceles de fail2ban")
    .addStringOption((option) =>
      option.setName("ip").setDescription("IP a desbanear").setRequired(true),
    ),

  async execute(interaction, context) {
    if (!(await ensureRole(interaction, context))) return;

    const ip = interaction.getString("ip")?.trim() ?? "";
    if (ip === "") {
      await interaction.reply({ content: "❌ Indica la IP a desbanear.", ephemeral: true });
      return;
    }

    try {
      const result = await context.unban(ip);
      await interaction.reply({
        content: summarize(result),
        ephemeral: true,
        deleteAfterMs: UNBAN_RESULT_TTL_MS,
      });
    } catch (error) {
      if (error instanceof InvalidIpError) {
        await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      context.logger.error(`/unban ${ip} falló: ${message}`);
      await interaction.reply({
        content: `❌ No se pudo desbanear ${ip}: ${message}`,
        ephemeral: true,
      });
    }
  },
};

/** Resumen de una linea: marca segun cuantas carceles entraron y, si fallan, cuales. */
function summarize(result: Fail2banUnbanResult): string {
  const total = result.jails.length;
  const unbanned = result.jails.filter((jail) => jail.ok).length;
  if (total === 0) return "⚠️ fail2ban no tiene cárceles configuradas.";

  const line =
    unbanned === total
      ? `✅ ${result.ip} desbaneada en las ${total} cárceles.`
      : unbanned === 0
        ? `❌ No se pudo desbanear ${result.ip} en ninguna de las ${total} cárceles.`
        : `⚠️ ${result.ip} desbaneada en ${unbanned}/${total} cárceles.`;

  const failed = result.jails.filter((jail) => !jail.ok).map((jail) => jail.name);
  return failed.length === 0 ? line : `${line} Fallan: ${failed.join(", ")}.`;
}
