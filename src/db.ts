import { Collection, MongoClient, ObjectId } from "mongodb";
import { Portfolio, DbUser } from "./types";

import path from "path";
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const client = new MongoClient(process.env.MONGO_URI!);

const db = client.connect().then(() => client.db(process.env.MONGO_DB_NAME));

export enum Collections {
    Users = "users",
    Portfolios = "portfolios",
}

class Users {
    private static collection: Collection<DbUser>;

    static async init(collection: Collection<DbUser>) {
        this.collection = collection;
        return new Users();
    }

    async getUserByDiscordId(discordId: string) {
        let user: DbUser = await Users.collection.findOne({ discordId });
        if (user) return user;

        user = {
            _id: new ObjectId(),
            discordId,
            portfolios: {},
        };

        await Users.collection.insertOne(user);
        return user;
    }

    async updateUser(user: DbUser) {
        await Users.collection.updateOne({ _id: user._id }, { $set: user });
    }
}

class Portfolios {
    private static collection: Collection<Portfolio>;

    static async init(collection: Collection<Portfolio>) {
        this.collection = collection;
        return new Portfolios();
    }

    async createPortfolio(name: string, owner: ObjectId, cash: number) {
        const portfolio: Portfolio = new Portfolio(
            new ObjectId(),
            name,
            owner,
            cash
        );

        await Portfolios.collection.insertOne(portfolio);
        return portfolio;
    }

    async getPortfolioById(id: ObjectId) {
        return Portfolio.fromDocument(
            await Portfolios.collection.findOne({ _id: id })
        );
    }

    async getPortfoliosByOwner(owner: ObjectId) {
        return Portfolios.collection
            .find({ owner })
            .map(Portfolio.fromDocument);
    }

    async getPortfolioByOwnerAndName(ownerDiscordId: string, name: string) {
        const user = await Db.getUsers().then((users) =>
            users.getUserByDiscordId(ownerDiscordId)
        );
        if (!user) return;

        const portfolioId = user.portfolios[name];
        if (!portfolioId) return;

        return this.getPortfolioById(portfolioId);
    }

    async updatePortfolio(portfolio: Portfolio) {
        await Portfolios.collection.updateOne(
            { _id: portfolio._id },
            { $set: portfolio }
        );
    }
}

class Db {
    private static db = db;

    private static async getCollection<T>(collection: Collections) {
        const db = await this.db;
        return db.collection<T>(collection);
    }

    static async getUsers() {
        return Users.init(await this.getCollection(Collections.Users));
    }

    static async getPortfolios() {
        return Portfolios.init(
            await this.getCollection(Collections.Portfolios)
        );
    }
}

export default Db;
