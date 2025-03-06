import * as vscode from "vscode";
import { Translator } from "./translation";
import * as marked from "marked";

let isEnabled: boolean = true;
let t: Translator;

export function activate(context: vscode.ExtensionContext) {
    console.log("active");

    // context.subscriptions.push(
    //     vscode.commands.registerCommand("slm-translation.cmdTest", async () => {
    //         await t.getModelList();
    //     })
    // );

    t = new Translator(
        vscode.workspace
            .getConfiguration("slm-translation")
            .get("Model") as string,
        vscode.workspace
            .getConfiguration("slm-translation")
            .get("Ollama Host") as string
    );

    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("slm-translation.Ollama Host")) {
            t.changeHost(
                vscode.workspace
                    .getConfiguration("slm-translation")
                    .get("Ollama Host") as string
            );
        }

        if (event.affectsConfiguration("slm-translation.Model")) {
            t.changeModel(
                vscode.workspace
                    .getConfiguration("slm-translation")
                    .get("Model") as string
            );
        }

        if (event.affectsConfiguration("slm-translation.Target Language")) {
            t.changeLanguage(
                vscode.workspace
                    .getConfiguration("slm-translation")
                    .get("Target Language") as string
            );
        }
    });

    // Registering the hover event
    vscode.languages.registerHoverProvider("*", {
        provideHover: translateSelectTextHover,
    });

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
        vscode.commands.registerCommand("slm-translation.disable", () => {
            vscode.window.showInformationMessage("SLM-Translation 已禁用");
            isEnabled = false;
        })
    );

    cmdArr.push(
        vscode.commands.registerCommand("slm-translation.enable", () => {
            vscode.window.showInformationMessage("SLM-Translation 已启用");
            isEnabled = true;
        })
    );

    cmdArr.push(
        vscode.commands.registerCommand(
            "slm-translation.changeModel",
            async () => {
                await changeModel();
            }
        )
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
        let content = await t.translate(text);

        const markdownString = new vscode.MarkdownString();
        markdownString.appendMarkdown(content);
        markdownString.supportHtml = true;
        markdownString.isTrusted = true;

        return new vscode.Hover(markdownString);
    }
}

async function translateSelectText() {
    if (!isEnabled) return;

    const editor = vscode.window.activeTextEditor;
    const selection = editor?.selection;

    if (!editor || !selection) return;

    const range = new vscode.Range(selection.start, selection.end);
    const decorationType = vscode.window.createTextEditorDecorationType({
        color: "red",
        fontWeight: "bold",
    });

    editor.setDecorations(decorationType, [range]);

    if (!editor || !selection) return;
    const text = editor.document.getText(selection);
    if (text) {
        const translatedText = await t.translate(text);
        editor
            .edit((editBuilder) => {
                editBuilder.replace(selection, translatedText);
            })
            .then(() => {
                // Restore to its original state
                editor.setDecorations(decorationType, []); // Clear the decoration
            });
    }
}

async function translateOnPanel() {
    if (!isEnabled) return;

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

    let texts = fullText.split("\n\n").filter((text) => text.trim() !== "");

    let translatedTexts = await Promise.all(
        texts.map((text) => t.translate(text))
    );

    let content = translatedTexts.join("\n\n");
    let htmlContent = await marked.parse(content);
    panel.webview.html = getWebviewContent(htmlContent);
}

function getWebviewContent(content: string) {
    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SLM Translation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
        }

        h1 {
            color: #333;
        }
        
        div > p {
            font-size: 18px;
        }
    </style>
</head>

<body>
    <div class="content">${content}</div>
</body>

</html>`;
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

async function changeModel() {
    const models = await t.getModelList();
    vscode.window
        .showQuickPick(models, {
            placeHolder: "选择 SLM 模型",
        })
        .then((selectedModel) => {
            vscode.workspace
                .getConfiguration("slm-translation")
                .update("Model", selectedModel, true);
        });
}

async function namingSelectText() {
    if (!isEnabled) return;
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
