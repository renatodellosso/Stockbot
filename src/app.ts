import path from "path";
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleCommand, registerCommands } from "./commands";

console.log("Starting bot...");
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, (client) => {
    console.log(`Logged in as ${client.user?.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    handleCommand(interaction);
});

registerCommands();

client.login(process.env.DISCORD_TOKEN);
