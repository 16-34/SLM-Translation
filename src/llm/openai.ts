import { OpenAI } from "openai";
import * as vscode from "vscode";

import { LMBase } from "./base";

export class OpenaiClient extends LMBase {
    private openai: OpenAI;

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
        this.openai = new OpenAI({
            baseURL: baseURL,
            apiKey: apiKey,
        });
        console.log(
            `OpenAIClient: constructor\n` +
                `\tmodel: ${model}\n` +
                `\tbaseURL: ${baseURL}`
        );
    }

    async llmInvoke(
        text: string,
        sysMsg: string,
        example: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
    ) {
        try {
            const chatCompletion = await this.openai.chat.completions.create({
                messages: [
                    { role: "system", content: sysMsg },
                    ...example,
                    { role: "user", content: text },
                ],
                model: this.model,
            });
            return chatCompletion.choices[0].message.content as string;
        } catch (err) {
            console.error(`OpenAIClient: llmInvoke\n` + `\err: ${err}\n`);
            return "";
        }
    }
}
