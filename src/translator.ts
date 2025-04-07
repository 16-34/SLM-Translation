import toml from "@iarna/toml";
import path from "path";
import * as fs from "fs";
import * as vscode from "vscode";

import { LM } from "./llm/base";
import { TranslationCache } from "./cache";

let config = vscode.workspace.getConfiguration("slm-translation");

let languages_map: { [key: string]: string } = {
    简体中文: "ZH_CN",
    English: "EN",
};

/** SLM Translator **/
export class Translator {
    private targetLanguage: string;
    private languageCacheMap: Map<string, TranslationCache>;
    private currentCache: TranslationCache;
    private prompts: any;
    private lm: LM;

    constructor(
        lm: LM,
        targetLanguage: string = config.get("Target Language") as string
    ) {
        this.lm = lm;
        this.targetLanguage = languages_map[targetLanguage];

        // Each target language translation cache
        this.currentCache = new TranslationCache();
        this.languageCacheMap = new Map<string, TranslationCache>();
        this.languageCacheMap.set(this.targetLanguage, this.currentCache);

        // Read prompt word
        const tomlContent: string = fs.readFileSync(
            path.join(path.dirname(__dirname), "prompts.toml"),
            "utf-8"
        );
        this.prompts = toml.parse(tomlContent);
    }

    changeModel(model: string) {
        this.lm.changeModel(model);
    }

    changeServe(lm: LM) {
        this.lm = lm;
    }

    changeLanguage(tagetLanguage: string) {
        this.targetLanguage = languages_map[tagetLanguage];
        this.currentCache =
            this.languageCacheMap.get(this.targetLanguage) ||
            new TranslationCache();
        this.languageCacheMap.set(this.targetLanguage, this.currentCache);
    }

    clearCache() {
        this.currentCache.clear();
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

        let translatedText: string = await this.lm.llmInvoke(
            inputText,
            this.prompts[`TRANSLATE-${this.targetLanguage}`]["SYSTEM_EN"]
        );
        this.currentCache.set(hashKey, {
            isFinished: true,
            content: translatedText,
        });

        return translatedText;
    }

    async name(inputText: string) {
        inputText = inputText.trim();

        let translatedText: string = await this.lm.llmInvoke(
            inputText,
            this.prompts["NAME"]["SYSTEM_EN"]
        );

        return translatedText;
    }
}
