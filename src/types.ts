import { InteractionResponseType, InteractionType } from "discord-interactions";

export enum CommandType {
    /** Slash commands; a text-based command that shows up when a user types / */
    ChatInput = 1,
    /** A UI-based command that shows up when you right click or tap on a user */
    User,
    /** A UI-based command that shows up when you right click or tap on a message */
    Message,
}

export enum CommandOptionType {
    SubCommand = 1,
    SubCommandGroup,
    String,
    /** Any integer between -2^53 and 2^53 */
    Integer,
    Boolean,
    User,
    /** Includes all channel types + categories */
    Channel,
    Role,
    /** Users and roles */
    Mentionable,
    /** Any double between -2^53 and 2^53 */
    Number,
    Attachment,
}

export type CommandOption = {
    type: CommandOptionType;
    name: string;
    description: string;
    /** Defaults to false. Required options must come before optional options. */
    required?: boolean;
    /** Max of 25. If present, user must pick from one of the choices. */
    choices?: (string | number)[];
    minValue?: number;
};

export type Command = {
    name?: string;
    type: CommandType;
    description: string;
    integration_types: number[];
    contexts: number[];
    options?: CommandOption[];
    execute: (data: CommandData) => Promise<CommandResponse>;
};

export type CommandData = {
    id: string;
    name: string;
    type: InteractionType;
};

export type CommandResponse = {
    type: InteractionResponseType;
    data: {
        content?: string;
    };
};

export const IntegrationType = {
    All: [0, 1],
    Guild: [0],
    User: [1],
};

export const InteractionContext = {
    Guild: 0,
    BotDm: 1,
    PrivateChannel: 2,
    All: [0, 1, 2],
};
