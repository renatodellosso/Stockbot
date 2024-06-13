import { InteractionType, verifyKey } from "discord-interactions";
import express from "express";
import { installCommands, handleCommand } from "./commands";

require("dotenv").config({ path: __dirname + "/../.env" });

console.log("Initializing server...");
const app = express();

app.use(
    express.json({
        verify: (req: any, res, buf) => {
            const signature = req.get("X-Signature-Ed25519");
            const timestamp = req.get("X-Signature-Timestamp");

            const isValidRequest = verifyKey(
                buf,
                signature,
                timestamp,
                process.env.DISCORD_PUBLIC_KEY
            );

            if (!isValidRequest) {
                res.statusCode = 401;
                res.end("Bad request signature");
                // throw new Error("Bad request signature");
            }
        },
    })
);

app.post("/interactions", async (req, res) => {
    const { type, data } = req.body as { type: InteractionType; data: any };

    console.log("Received interaction", type, data);

    if (type === InteractionType.PING) {
        return res.send({
            type: InteractionType.PING,
        });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
        const response = await handleCommand(data);
        return res.send(response);
    }
});

installCommands();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log("Server initialized. Listening on port " + PORT)
);
