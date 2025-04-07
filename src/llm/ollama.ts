import { Ollama, Message } from "ollama";
import * as vscode from "vscode";

import { LMBase } from "./base";

export class OllamaClient extends LMBase {
    private ollama: Ollama;

    constructor(
        model: string = vscode.workspace
            .getConfiguration("slm-translation")
            .get("Ollama Model") as string,
        host: string = vscode.workspace
            .getConfiguration("slm-translation")
            .get("Ollama Host") as string
    ) {
        super(model);
        this.ollama = new Ollama({ host: host });
        console.log(`OllamaClient: constructor\n` + `\tmodel: ${model}\n`);
    }

    changeHost(host: string) {
        this.ollama = new Ollama({ host: host });
        console.log(`OllamaClient: constructor\n` + `\host: ${host}\n`);
    }

    async llmInvoke(
        text: string,
        sysMsg: string = "",
        example: Message[] = []
    ) {
        try {
            const response = await this.ollama.chat({
                model: this.model,
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
            console.error(`OllamaClient: llmInvoke\n` + `\err: ${err}\n`);
            return "";
        }
    }
}
