import { OpenAI } from "openai";
import * as vscode from "vscode";

import { LMBase, Message } from "./base";

export class OpenaiClient extends LMBase {
    private _openai: OpenAI;

    constructor(
        model: string = vscode.workspace
            .getConfiguration("slm-translation")
            .get("OpenAI Model") as string,
        baseURL: string = vscode.workspace
            .getConfiguration("slm-translation")
            .get("OpenAI Base URL") as string,
        apiKey: string = vscode.workspace
            .getConfiguration("slm-translation")
            .get("OpenAI API Key") as string
    ) {
        super(model);
        this._openai = new OpenAI({
            baseURL: baseURL,
            apiKey: apiKey,
        });
        console.log(`OpenAIClient: constructor`);
        console.log(`\tmodel: ${model}`);
        console.log(`\tbaseURL: ${baseURL}`);
    }

    async lmInvoke(text: string, sysMsg: string, example: Message[] = []) {
        try {
            const chatCompletion = await this._openai.chat.completions.create({
                messages: [
                    { role: "system", content: sysMsg },
                    ...example,
                    { role: "user", content: text },
                ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
                model: this._model,
            });

            return chatCompletion.choices[0].message.content as string;
        } catch (err) {
            console.error(`OpenAIClient: llmInvoke`);
            if (err instanceof OpenAI.APIError) {
                console.log("\trequest_id", err.request_id);
                console.log("\tstatus", err.status);
                console.log("\tname", err.name);
                console.log("\theaders", err.headers);
            } else console.error(`\terr: ${err}\n`);
            throw err;
        }
    }

    async *lmStreamInvoke(
        text: string,
        sysMsg: string,
        example: Message[] = []
    ) {
        try {
            const chatCompletion = await this._openai.chat.completions.create({
                messages: [
                    { role: "system", content: sysMsg },
                    ...example,
                    { role: "user", content: text },
                ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
                stream: true,
                model: this._model,
            });

            for await (const event of chatCompletion) {
                const content = event.choices[0]?.delta?.content;
                if (content) yield content;
            }
        } catch (err) {
            console.error(`OpenAIClient: llmStreamInvoke`);
            if (err instanceof OpenAI.APIError) {
                console.log("\trequest_id", err.request_id);
                console.log("\tstatus", err.status);
                console.log("\tname", err.name);
                console.log("\theaders", err.headers);
            } else console.error(`\terr: ${err}\n`);
            throw err;
        }
    }
}
