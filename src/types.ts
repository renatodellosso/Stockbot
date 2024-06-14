import { ObjectId } from "mongodb";
import yahooFinance from "yahoo-finance2";

export class DbUser {
    _id: ObjectId;
    discordId: string;
    portfolios: { [name: string]: ObjectId };
}

export class Holding {
    symbol: string;
    quantity: number;
    costBasis: number;
    dateAcquired: string;

    constructor(
        symbol: string,
        quantity: number,
        costBasis: number,
        dateAcquired: string
    ) {
        this.symbol = symbol;
        this.quantity = quantity;
        this.costBasis = costBasis;
        this.dateAcquired = dateAcquired;
    }

    static async toString(holding: Holding) {
        const price = (await yahooFinance.quote(holding.symbol))
            .regularMarketPrice;

        return `${holding.symbol}: ${(
            holding.quantity * price
        ).toLocaleString()} (${holding.quantity.toLocaleString()} shares at $${price.toLocaleString()}, acquired on ${
            holding.dateAcquired
        })`;
    }
}

export class Portfolio {
    _id: ObjectId;
    name: string;
    owner: ObjectId;

    cash: number;
    holdings: Holding[];

    constructor(
        _id: ObjectId,
        name: string,
        owner: ObjectId,
        cash: number = 1000,
        holdings: Holding[] = []
    ) {
        this._id = _id;
        this.name = name;
        this.owner = owner;
        this.cash = cash;
        this.holdings = holdings;
    }

    static async fromDocument(portfolio: Portfolio) {
        return new Portfolio(
            portfolio._id,
            portfolio.name,
            portfolio.owner,
            portfolio.cash,
            portfolio.holdings
        );
    }
}
