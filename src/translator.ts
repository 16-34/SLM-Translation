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
    private _targetLanguage: string;
    private _languageCacheMap: Map<string, TranslationCache>;
    private _currentCache: TranslationCache;
    private _prompts: any;
    private _lm: LM;

    constructor(
        lm: LM,
        targetLanguage: string = config.get("Target Language") as string
    ) {
        this._lm = lm;
        this._targetLanguage = languages_map[targetLanguage];

        // Each target language translation cache
        this._currentCache = new TranslationCache();
        this._languageCacheMap = new Map<string, TranslationCache>();
        this._languageCacheMap.set(this._targetLanguage, this._currentCache);

        // Read prompt word
        const tomlContent: string = fs.readFileSync(
            path.join(path.dirname(__dirname), "prompts.toml"),
            "utf-8"
        );
        this._prompts = toml.parse(tomlContent);
    }

    changeModel(model: string) {
        this._lm.changeModel(model);
    }

    changeServe(lm: LM) {
        this._lm = lm;
    }

    changeLanguage(tagetLanguage: string) {
        this._targetLanguage = languages_map[tagetLanguage];
        this._currentCache =
            this._languageCacheMap.get(this._targetLanguage) ||
            new TranslationCache();
        this._languageCacheMap.set(this._targetLanguage, this._currentCache);
    }

    clearCache() {
        this._currentCache.clear();
    }

    async translate(inputText: string) {
        inputText = `<Text to be translated>
${inputText}
</Text to be translated>`;

        const hashKey = this._currentCache.calcHashKey(inputText.trim());
        let cacheItem = this._currentCache.get(hashKey);
        if (cacheItem) {
            while (!cacheItem.isFinished) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            return cacheItem.content;
        }

        this._currentCache.set(hashKey, { isFinished: false, content: "" });
        try {
            let translatedText: string = await this._lm.lmInvoke(
                inputText,
                this._prompts[`TRANSLATE-${this._targetLanguage}`]["SYSTEM_EN"]
            );
            this._currentCache.set(hashKey, {
                isFinished: true,
                content: translatedText,
            });

            return translatedText;
        } catch (err) {
            this._currentCache.delete(hashKey);
            return `翻译错误，请重试。\n\n${err}`;
        }
    }

    async *translateStream(inputText: string) {
        inputText = `<Text to be translated>
${inputText}
</Text to be translated>`;

        const hashKey = this._currentCache.calcHashKey(inputText.trim());
        let cacheItem = this._currentCache.get(hashKey);
        if (cacheItem && cacheItem.isFinished) {
            yield cacheItem.content;
        } else {
            try {
                let chunkStream = this._lm.lmStreamInvoke(
                    inputText,
                    this._prompts[`TRANSLATE-${this._targetLanguage}`][
                        "SYSTEM_EN"
                    ]
                );

                let translatedText = "";
                for await (const chunk of chunkStream) {
                    translatedText += chunk;
                    yield translatedText;
                }

                this._currentCache.set(hashKey, {
                    isFinished: true,
                    content: translatedText,
                });
            } catch (err) {
                yield `翻译错误，请重试。\n\n${err}`;
            }
        }
    }

    async name(inputText: string) {
        inputText = inputText.trim();

        let translatedText: string = await this._lm.lmInvoke(
            inputText,
            this._prompts["NAME"]["SYSTEM_EN"],
            this._prompts["NAME"]["EXAMPLE"]
        );

        return translatedText;
    }
}
