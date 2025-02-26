import { Ollama } from "ollama";
import * as fs from "fs";
import toml from "@iarna/toml";
import path from "path";
import { Cache } from "./cache";

/** SLM Translator */
export class Translator {
    private ollama: Ollama;
    private model: string;
    private prompts: any;
    private cache: Cache;

    constructor(model = "qwen2.5", host = "http://localhost:11434") {
        this.ollama = new Ollama({ host: host });
        this.model = model;

        const tomlContent: string = fs.readFileSync(
            path.join(path.dirname(__dirname), "prompts.toml"),
            "utf-8"
        );
        this.prompts = toml.parse(tomlContent)["TRANSLATION"];

        this.cache = new Cache();
    }

    private async llmInvoke(text: string) {
        const response = await this.ollama.chat({
            model: this.model,
            messages: [
                { role: "system", content: this.prompts["SYSTEM_ZH"] },
                { role: "user", content: text },
            ],
            options: {
                temperature: 0,
            },
        });

        return response.message.content;
    }

    async translate(inputText: string) {
        inputText = inputText.trim();

        const hashKey = this.cache.calcHashKey(inputText);
        let cacheItem = this.cache.get(hashKey);
        if (cacheItem) {
            while (!cacheItem.isFinished) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            return cacheItem.content;
        }

        this.cache.set(hashKey, { isFinished: false, content: "" });

        let translatedText: string = await this.llmInvoke(inputText);
        this.cache.set(hashKey, {
            isFinished: true,
            content: translatedText,
        });

        return translatedText;
    }
}
