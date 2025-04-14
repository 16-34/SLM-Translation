import { Ollama, Message } from "ollama";
import * as vscode from "vscode";

import { LMBase } from "./base";

export class OllamaClient extends LMBase {
    private _ollama: Ollama;

    constructor(
        model: string = vscode.workspace
            .getConfiguration("slm-translation")
            .get("Ollama Model") as string,
        host: string = vscode.workspace
            .getConfiguration("slm-translation")
            .get("Ollama Host") as string
    ) {
        super(model);
        this._ollama = new Ollama({ host: host });
        console.log(`OllamaClient: constructor`);
        console.log(`\tmodel: ${model}\n`);
    }

    changeHost(host: string) {
        this._ollama = new Ollama({ host: host });
        console.log(`OllamaClient: constructor`);
        console.log(`\thost: ${host}\n`);
    }

    async lmInvoke(
        text: string,
        sysMsg: string = "",
        example: Message[] = []
    ) {
        try {
            const response = await this._ollama.chat({
                model: this._model,
                messages: [
                    { role: "system", content: sysMsg },
                    ...example,
                    { role: "user", content: text },
                ],
                options: {
                    temperature: 0,
                },
            });
            return response.message.content;
        } catch (err) {
            console.error(`OllamaClient: llmInvoke`);
            console.error(`\err: ${err}\n`);
            throw err;
        }
    }

    async *lmStreamInvoke(
        text: string,
        sysMsg: string = "",
        example: Message[] = []
    ) {
        try {
            const response = await this._ollama.chat({
                model: this._model,
                messages: [
                    { role: "system", content: sysMsg },
                    ...example,
                    { role: "user", content: text },
                ],
                stream: true,
                options: {
                    temperature: 0,
                },
            });
            for await (const event of response) {
                const content = event.message.content;
                if (content) yield content;
            }
        } catch (err) {
            console.error(`OllamaClient: llmInvoke`);
            console.error(`\err: ${err}\n`);
            throw err;
        }
    }
}
