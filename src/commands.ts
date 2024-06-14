import {
    CommandInteraction,
    REST,
    Routes,
    SlashCommandBuilder,
} from "discord.js";

const commands: {
    builder: SlashCommandBuilder;
    execute: (interaction: CommandInteraction) => Promise<void>;
}[] = [
    {
        builder: new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Replies with Pong!"),
        execute: async (interaction) => {
            interaction.reply("Pong!");
        },
    },
];

export async function registerCommands() {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    console.log(`Refreshing ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
        body: commands.map((command) => command.builder),
    });
}

export async function handleCommand(interaction: CommandInteraction) {
    const command = commands.find(
        (command) => command.builder.name === interaction.commandName
    );

    if (!command) {
        interaction.reply({ content: "Command not found", ephemeral: true });
        return;
    }

    command.execute(interaction);
}
