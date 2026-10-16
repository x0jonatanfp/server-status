/**
 * `/unban <ip>` — desbanea una IP en todas las carceles de fail2ban.
 *
 * La validacion de la IP vive en el adaptador de fail2ban: si no es valida no se
 * ejecuta ningun proceso, y aqui solo se informa. El resultado se responde en un
 * contenedor (Components V2): el color de acento dice de un vistazo si salio
 * todo bien, a medias o mal, y la marca no engana (`0/10` ya no sale con un ✅).
 */
import { SlashCommandBuilder } from "discord.js";

import { InvalidIpError } from "../../fail2ban/client.ts";
import type { Level } from "../../../domain/services/thresholds.ts";
import { ensureRole } from "./access.ts";
import { commandView } from "./view.ts";
import type { CommandDefinition } from "./types.ts";

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
      const total = result.jails.length;
      const unbanned = result.jails.filter((jail) => jail.ok).length;
      const failed = result.jails.filter((jail) => !jail.ok);

      const level = resultLevel(total, unbanned);
      const summary =
        total === 0
          ? "fail2ban no tiene cárceles configuradas."
          : unbanned === total
            ? `✅ Desbaneada en las ${total} cárceles.`
            : unbanned === 0
              ? `❌ No se pudo desbanear en ninguna de las ${total} cárceles.`
              : `⚠️ Desbaneada en ${unbanned}/${total} cárceles.`;

      const blocks = [`🔓 **Desbaneo de \`${result.ip}\`**\n\n${summary}`];
      if (failed.length > 0) {
        const lines = failed.map((jail) => `• \`${jail.name}\`: ${jail.error ?? "error"}`);
        blocks.push(`❌ **Cárceles con error**\n\n${lines.join("\n")}`);
      }

      await interaction.reply({
        view: commandView(blocks, level, context.inventory.display.colors),
        ephemeral: true,
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

/**
 * Nivel del resultado: verde si entraron todas, rojo si no entro ninguna y ambar
 * en el resto (incluido el caso sin carceles).
 */
function resultLevel(total: number, unbanned: number): Level {
  if (total === 0) return "warning";
  if (unbanned === total) return "ok";
  if (unbanned === 0) return "critical";
  return "warning";
}
