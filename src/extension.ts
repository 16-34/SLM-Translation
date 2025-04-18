import { JSDOM } from "jsdom";
import katex from "katex";
import * as vscode from "vscode";
import * as marked from "marked";

import { Translator } from "./translator";
import { OllamaClient } from "./llm/ollama";
import { OpenaiClient } from "./llm/openai";
import { ViewProvider } from "./view";
import { getWebViewContent } from "./utils";

// Configure marked to recognize formulas
marked.use({
    extensions: [
        {
            name: "latex",
            level: "inline",
            start(src) {
                return src.indexOf("$");
            },
            tokenizer(src, tokens) {
                const match = src.match(/^\$+([^$\n]+?)\$+/);
                if (match) {
                    return {
                        type: "latex",
                        raw: match[0],
                        formula: match[1].trim(),
                    };
                }
            },
            renderer(token) {
                return katex.renderToString(token.formula, {
                    throwOnError: false,
                    output: "html",
                });
            },
        },
        {
            name: "latexBlock",
            level: "block",
            start(src) {
                return src.indexOf("$$");
            },
            tokenizer(src, tokens) {
                const match = src.match(/^\$\$+\n?([^$]+)\n?\$+$/);
                if (match) {
                    return {
                        type: "latexBlock",
                        raw: match[0],
                        formula: match[1].trim(),
                    };
                }
            },
            renderer(token) {
                return katex.renderToString(token.formula, {
                    displayMode: true,
                    throwOnError: false,
                    output: "html",
                });
            },
        },
    ],
});

let isEnabled: boolean = vscode.workspace
    .getConfiguration("slm-translation")
    .get("Enable Hover Translate") as boolean;
let t: Translator;
let vp: ViewProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log(">> SLM-Translate << 已激活");

    vp = new ViewProvider(context);
    vscode.window.registerWebviewViewProvider("slm-translate", vp);

    // context.subscriptions.push(
    //     vscode.commands.registerCommand("slm-translation.cmdTest", async () => {
    //         await t.getModelList();
    //     })
    // );

    let lm_serve = vscode.workspace
        .getConfiguration("slm-translation")
        .get("LM Serve");

    if (lm_serve == "Ollama") t = new Translator(new OllamaClient());
    else if (lm_serve == "OpenAI") t = new Translator(new OpenaiClient());

    // Monitor configuration update
    vscode.workspace.onDidChangeConfiguration((event) => {
        let lm_serve = vscode.workspace
            .getConfiguration("slm-translation")
            .get("LM Serve");

        if (event.affectsConfiguration("slm-translation.LM Serve")) {
            if (lm_serve == "Ollama") t.changeServe(new OllamaClient());
            else if (lm_serve == "OpenAI") t.changeServe(new OpenaiClient());
            vscode.window.showInformationMessage(
                `模型服务已切换为 ${lm_serve}`
            );
        }

        if (
            event.affectsConfiguration("slm-translation.Enable Hover Translate")
        ) {
            isEnabled = vscode.workspace
                .getConfiguration("slm-translation")
                .get("Enable Hover Translate") as boolean;

            vscode.window.showInformationMessage(
                isEnabled
                    ? "SLM-Translation: 悬停翻译已启用"
                    : "SLM-Translation: 悬停翻译已禁用"
            );
        }

        if (event.affectsConfiguration(`slm-translation.${lm_serve} Model`)) {
            let lm = vscode.workspace
                .getConfiguration("slm-translation")
                .get(`${lm_serve} Model`) as string;
            t.changeModel(lm);
            vscode.window.showInformationMessage(`模型已切换为 ${lm}`);
        }

        if (event.affectsConfiguration("slm-translation.Target Language")) {
            let targetLanguage = vscode.workspace
                .getConfiguration("slm-translation")
                .get("Target Language") as string;
            t.changeLanguage(targetLanguage);
            vscode.window.showInformationMessage(
                `目标语言已切换为 ${targetLanguage}`
            );
        }
    });

    // EVENT
    // Select hover
    vscode.languages.registerHoverProvider("*", {
        provideHover: translateSelectTextHover,
    });

    // COMMAND
    let cmdArr = [];
    // Naming function
    cmdArr.push(
        vscode.commands.registerCommand("slm-translation.naming", async () => {
            await namingSelectText();
        })
    );

    cmdArr.push(
        vscode.commands.registerCommand(
            "slm-translation.translate",
            async () => {
                await translateSelectText();
            }
        )
    );

    cmdArr.push(
        vscode.commands.registerCommand(
            "slm-translation.translateClipboard",
            async () => {
                await translateClipboard();
            }
        )
    );

    cmdArr.push(
        vscode.commands.registerCommand(
            "slm-translation.translateOnPanel",
            async () => {
                await translateOnPanel();
            }
        )
    );

    cmdArr.push(
        vscode.commands.registerCommand(
            "slm-translation.changeLanguage",
            () => {
                changeLanguage();
            }
        )
    );

    cmdArr.push(
        vscode.commands.registerCommand(
            "slm-translation.disableHoverTranslate",
            () => {
                vscode.workspace
                    .getConfiguration("slm-translation")
                    .update("Enable Hover Translate", false, true);
            }
        )
    );

    cmdArr.push(
        vscode.commands.registerCommand(
            "slm-translation.enableHoverTranslate",
            () => {
                vscode.workspace
                    .getConfiguration("slm-translation")
                    .update("Enable Hover Translate", true, true);
            }
        )
    );

    cmdArr.push(
        vscode.commands.registerCommand("slm-translation.changeServe", () => {
            changeServe();
        })
    );

    cmdArr.push(
        vscode.commands.registerCommand("slm-translation.changeModel", () => {
            changeModel();
        })
    );

    cmdArr.push(
        vscode.commands.registerCommand("slm-translation.clearCache", () => {
            t.clearCache();
            vscode.window.showInformationMessage("SLM-Translation 缓存已清空");
        })
    );

    context.subscriptions.push(...cmdArr);
}

export function deactivate() {}

async function translateSelectTextHover(
    document: vscode.TextDocument,
    position: vscode.Position
) {
    if (!isEnabled) return;

    const editor = vscode.window.activeTextEditor;
    const selection = editor?.selection;

    if (!editor || !selection || !selection.contains(position)) return;
    const text = editor.document.getText(selection);
    if (text) {
        let content =
            "**>> SLM-Translation <<**\n\n" + (await t.translate(text));

        const markdownString = new vscode.MarkdownString();
        markdownString.appendMarkdown(content);
        markdownString.supportHtml = true;
        markdownString.isTrusted = true;

        return new vscode.Hover(markdownString);
    }
}

let isTranslating: boolean = false;
let currentStream: AsyncGenerator<string>;
async function translateSelectText() {
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.selection;

    if (!editor || !selection) return;

    const text = editor.document.getText(selection);

    if (text) {
        if (isTranslating) currentStream?.return(0);

        isTranslating = true;
        currentStream = t.translateStream(text);

        vscode.commands.executeCommand(
            "workbench.view.extension.slm-translate-panel"
        );

        try {
            for await (const res of currentStream) {
                let htmlContent = await marked.parse(res);
                vp.show(htmlContent);
            }
        } catch (error) {
            console.error("翻译流被异常终止：", error);
        } finally {
            isTranslating = false;
        }
    }
}

async function translateClipboard() {
    const text = await vscode.env.clipboard.readText();

    if (text) {
        if (isTranslating) currentStream?.return(0);
        isTranslating = true;
        currentStream = t.translateStream(text);

        vscode.commands.executeCommand(
            "workbench.view.extension.slm-translate-panel"
        );

        try {
            for await (const res of currentStream) {
                let htmlContent = await marked.parse(res);
                vp.show(htmlContent);
            }
        } catch (error) {
            console.error("翻译流被异常终止：", error);
        } finally {
            isTranslating = false;
        }
    }
}

async function translateOnPanel() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const fullText = document.getText();

    const panel = vscode.window.createWebviewPanel(
        "slm-translation_panel",
        "SLM Translation",
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );

    let isPanelClosed = false;
    panel.onDidDispose(() => {
        isPanelClosed = true;
    });

    const htmlString: string = getWebViewContent("template/webview.html");
    const dom = new JSDOM(htmlString);
    const doc = dom.window.document;

    const container = doc.getElementById("container")!;

    let texts: string[] = fullText
        .split("\n\n")
        .filter((text) => text.trim() !== "");
    for (let i = 0; i < texts.length; i++) {
        const newChild = doc.createElement("div");
        container.appendChild(newChild);
        newChild.id = `content${i}`;
        newChild.className = "content";
    }

    panel.webview.html = doc.documentElement.outerHTML;
    await Promise.all(
        texts.map(async (text, index) => {
            let resStream = t.translateStream(text);

            for await (const content of resStream) {
                let htmlContent = await marked.parse(content);
                if (!isPanelClosed)
                    panel.webview.postMessage({
                        id: `content${index}`,
                        text: htmlContent,
                    });
            }
        })
    );
}

function changeLanguage() {
    const languages = ["简体中文", "English"];
    vscode.window
        .showQuickPick(languages, {
            placeHolder: "选择翻译目标语言",
        })
        .then((selectedLanguage) => {
            vscode.workspace
                .getConfiguration("slm-translation")
                .update("Target Language", selectedLanguage, true);
        });
}

function changeServe() {
    vscode.window
        .showQuickPick(["Ollama", "OpenAI"], {
            placeHolder: "选择 LM 服务",
        })
        .then((selectedServe) => {
            vscode.workspace
                .getConfiguration("slm-translation")
                .update("LM Serve", selectedServe, true);
        });
}

function changeModel() {
    vscode.window
        .showInputBox({
            placeHolder: "请输入 LM 模型名称",
            prompt: "输入 LM 模型",
            value: "",
        })
        .then((model) => {
            if (model) {
                let lm_serve = vscode.workspace
                    .getConfiguration("slm-translation")
                    .get("LM Serve") as string;

                vscode.workspace
                    .getConfiguration("slm-translation")
                    .update(`${lm_serve} Model`, model, true);
            }
        });
}

async function namingSelectText() {
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.selection;
    if (!editor || !selection) return;

    const range = new vscode.Range(selection.start, selection.end);
    const decorationType = vscode.window.createTextEditorDecorationType({
        color: "blue",
        fontWeight: "bold",
    });

    editor.setDecorations(decorationType, [range]);

    if (!editor || !selection) return;
    const text = editor.document.getText(selection);
    if (text) {
        const translatedText = await t.name(text);
        editor
            .edit((editBuilder) => {
                editBuilder.replace(selection, translatedText);
            })
            .then(() => {
                editor.setDecorations(decorationType, []);
            });
    }
}
