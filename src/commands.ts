import {
    CommandInteraction,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    User,
} from "discord.js";
import Db from "./db";
import yahooFinance from "yahoo-finance2";
import { Holding } from "./types";

const commands: {
    builder: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    execute: (interaction: CommandInteraction) => Promise<void>;
}[] = [
    // create-portfolio
    {
        builder: new SlashCommandBuilder()
            .setName("create-portfolio")
            .setDescription("Creates a portfolio")
            .addStringOption((option) =>
                option
                    .setName("name")
                    .setDescription(
                        "Name of the portfolio. Defaults to 'Default'"
                    )
            )
            .addNumberOption((option) =>
                option
                    .setName("cash")
                    .setDescription("Starting cash amount. Defaults to $1,000")
            ),
        execute: async (interaction) => {
            // Make sure to await deferReply!
            await interaction.deferReply();

            const users = await Db.getUsers();
            const user = await users.getUserByDiscordId(interaction.user.id);

            const name =
                (interaction.options.get("name")?.value as string) ?? "Default";

            if (user.portfolios[name]) {
                interaction.editReply("Portfolio already exists");
                return;
            }

            const cash =
                (interaction.options.get("cash")?.value as number) ?? 1000;

            const portfolios = await Db.getPortfolios();
            const portfolio = await portfolios.createPortfolio(
                name,
                user._id,
                cash
            );

            user.portfolios[name] = portfolio._id;
            await users.updateUser(user);

            interaction.editReply("Portfolio created");
        },
    },

    // profile
    {
        builder: new SlashCommandBuilder()
            .setName("profile")
            .setDescription("Shows your profile")
            .addUserOption((option) =>
                option
                    .setName("user")
                    .setDescription("User to show profile for")
            ),
        execute: async (interaction) => {
            await interaction.deferReply();

            const user = (interaction.options.get("user")?.value ??
                interaction.user) as User;

            const users = await Db.getUsers();
            const dbUser = await users.getUserByDiscordId(user.id);

            const embed = new EmbedBuilder()
                .setTitle(user.displayName)
                .setDescription(
                    `**Portfolios:**\n${Object.keys(dbUser.portfolios).join(
                        "\n"
                    )}`
                );

            interaction.editReply({ embeds: [embed] });
        },
    },

    // view-portfolio
    {
        builder: new SlashCommandBuilder()
            .setName("view-portfolio")
            .setDescription("View a portfolio")
            .addStringOption((option) =>
                option
                    .setName("name")
                    .setDescription(
                        "Name of the portfolio. Defaults to 'Default'"
                    )
            ),
        execute: async (interaction) => {
            await interaction.deferReply();

            const name =
                (interaction.options.get("name")?.value as string) ?? "Default";

            const portfolio = await Db.getPortfolios().then((portfolios) =>
                portfolios.getPortfolioByOwnerAndName(interaction.user.id, name)
            );

            if (!portfolio) {
                interaction.editReply("Portfolio not found");
                return;
            }

            const description = `Date Created: ${portfolio._id
                .getTimestamp()
                .toDateString()}
                \n**Cash:** $${portfolio.cash.toLocaleString()}
                \n**Holdings:**\n${portfolio.holdings
                    .map(async (holding) => await Holding.toString(holding))
                    .join("\n")}`;

            const embed = new EmbedBuilder()
                .setTitle(name)
                .setDescription(description);

            interaction.editReply({ embeds: [embed] });
        },
    },

    // buy
    {
        builder: new SlashCommandBuilder()
            .setName("buy")
            .setDescription("Buy a stock")
            .addStringOption((option) =>
                option
                    .setName("symbol")
                    .setDescription("Stock symbol")
                    .setRequired(true)
            )
            .addNumberOption((option) =>
                option
                    .setName("value")
                    .setDescription("$ value of shares to buy")
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("portfolio")
                    .setDescription(
                        "Portfolio to buy stock in. Defaults to 'Default'"
                    )
            ),
        execute: async (interaction) => {
            await interaction.deferReply();

            const symbol = (
                interaction.options.get("symbol")?.value as string
            ).toUpperCase();
            const value = interaction.options.get("value")?.value as number;
            const portfolioName =
                (interaction.options.get("portfolio")?.value as string) ??
                "Default";

            const portfolios = await Db.getPortfolios();
            const portfolio = await portfolios.getPortfolioByOwnerAndName(
                interaction.user.id,
                portfolioName
            );

            if (!portfolio) {
                interaction.editReply("Portfolio not found");
                return;
            }

            const quote = await yahooFinance.quote(symbol);

            if (!quote) {
                interaction.editReply("Stock not found");
                return;
            }

            const price = quote.regularMarketPrice;
            const quantity = value / price;

            if (portfolio.cash < value) {
                interaction.editReply("Insufficient funds");
                return;
            }

            portfolio.cash -= value;

            const holding = portfolio.holdings.find(
                (holding) => holding.symbol === symbol
            );

            if (holding) {
                holding.costBasis =
                    (holding.quantity * holding.costBasis + value) /
                    (holding.quantity + quantity);
                holding.quantity += quantity;

                // Average the dates
                const date = new Date();
                const dateAcquired = new Date(holding.dateAcquired);

                holding.dateAcquired = new Date(
                    (date.getTime() * quantity +
                        dateAcquired.getTime() * holding.quantity) /
                        (quantity + holding.quantity)
                ).toDateString();

                portfolio.holdings = portfolio.holdings
                    .filter((h) => h.symbol !== symbol)
                    .concat(holding);
            } else {
                portfolio.holdings.push(
                    new Holding(
                        symbol,
                        quantity,
                        value,
                        new Date().toDateString()
                    )
                );
            }

            await portfolios.updatePortfolio(portfolio);

            interaction.editReply(
                `Bought ${quantity.toLocaleString()} shares of ${symbol} at $${price.toLocaleString()} each for $${value.toLocaleString()}. You have $${portfolio.cash.toLocaleString()} left in cash.`
            );
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

    console.log(`Handling command ${interaction.commandName}`);

    if (!command) {
        interaction.reply({ content: "Command not found", ephemeral: true });
        return;
    }

    try {
        command.execute(interaction);
    } catch (error) {
        console.error(error);
        interaction.reply({
            content: "An error occurred while executing the command",
            ephemeral: true,
        });
    }
}
