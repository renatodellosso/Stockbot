import { InteractionResponseType, InteractionType } from "discord-interactions";
import { discordRequest } from "./utils";
import {
    Command,
    CommandData,
    CommandType,
    IntegrationType,
    InteractionContext,
} from "./types";

const commands: { [name: string]: Command } = {
    ping: {
        type: CommandType.ChatInput,
        description: "Ping the bot",
        integration_types: IntegrationType.All,
        contexts: InteractionContext.All,
        execute: async (data) => {
            return {
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: "Pong!",
                },
            };
        },
    },
};

export async function installCommands() {
    console.log("Installing commands...");

    const endpoint = `applications/${process.env.DISCORD_APP_ID}/commands`;

    const commandsWithNames = Object.entries(commands).map(
        ([name, command]) => ({
            ...command,
            name,
        })
    );

    try {
        await discordRequest(endpoint, {
            method: "PUT",
            body: commandsWithNames,
        });
    } catch (err) {
        console.error("Failed to install commands", err);
    }
}

export async function handleCommand(data: CommandData): Promise<any> {
    console.log("Handling command", data);

    const command = commands[data.name];
    if (!command) {
        console.error("Command not found", data.name);
        return {
            data: {
                content: "Command not found",
            },
        };
    }

    try {
        return command.execute(data);
    } catch (err) {
        console.error("Failed to execute command", err);
        return {
            data: {
                content: "Failed to execute command",
            },
        };
    }
}
