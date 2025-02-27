import { Ollama, Message } from "ollama";
import * as fs from "fs";
import toml from "@iarna/toml";
import path from "path";
import { Cache } from "./cache";

let languages_map: { [key: string]: string } = {
    简体中文: "ZH_CN",
    English: "EN",
};

/** SLM Translator */
export class Translator {
    private ollama: Ollama;
    private model: string;
    private targetLanguage: string;
    private prompts: any;
    private languageCacheMap: Map<string, Cache>;
    private currentCache: Cache;

    constructor(
        model: string = "qwen2.5:1.5b",
        host: string = "http://localhost:11434",
        tagetLanguage: string = "简体中文"
    ) {
        this.ollama = new Ollama({ host: host });
        this.model = model;
        this.targetLanguage = languages_map[tagetLanguage];

        this.currentCache = new Cache();
        this.languageCacheMap = new Map<string, Cache>();
        this.languageCacheMap.set(this.targetLanguage, this.currentCache);

        const tomlContent: string = fs.readFileSync(
            path.join(path.dirname(__dirname), "prompts.toml"),
            "utf-8"
        );
        this.prompts = toml.parse(tomlContent);
    }

    changeHost(host: string) {
        this.ollama = new Ollama({ host: host });
    }

    changeModel(model: string) {
        this.model = model;
    }

    changeLanguage(tagetLanguage: string) {
        this.targetLanguage = languages_map[tagetLanguage];
        this.currentCache =
            this.languageCacheMap.get(this.targetLanguage) || new Cache();
        this.languageCacheMap.set(this.targetLanguage, this.currentCache);
    }

    private async llmInvoke(
        text: string,
        sysMsg: string = "",
        example: Message[] = []
    ) {
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
    }

    async translate(inputText: string) {
        inputText = inputText.trim();

        const hashKey = this.currentCache.calcHashKey(inputText);
        let cacheItem = this.currentCache.get(hashKey);
        if (cacheItem) {
            while (!cacheItem.isFinished) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            return cacheItem.content;
        }

        this.currentCache.set(hashKey, { isFinished: false, content: "" });

        let translatedText: string = await this.llmInvoke(
            inputText,
            this.prompts[`TRANSLATE-${this.targetLanguage}`]["SYSTEM_ZH"]
        );
        this.currentCache.set(hashKey, {
            isFinished: true,
            content: translatedText,
        });

        return translatedText;
    }

    async name(inputText: string) {
        inputText = inputText.trim();

        let translatedText: string = await this.llmInvoke(
            inputText,
            this.prompts["NAME"]["SYSTEM_ZH"]
        );

        return translatedText;
    }

    clearCache() {
        this.currentCache.clear();
    }

    async getModelList() {
        let modelList = await this.ollama.list();

        return modelList.models
            .filter((model) => !model.details.family.includes("bert"))
            .map((model) => model.name);
    }
}
