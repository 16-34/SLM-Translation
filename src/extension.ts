import * as vscode from "vscode";
import { Translator } from "./translation";
import * as marked from "marked";

let isEnabled: boolean = true;
let t: Translator = new Translator("qwen2.5:1.5b");

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

    let content = await t.translate(fullText);
    let htmlContent = await marked.parse(content);
    console.log(htmlContent)
    panel.webview.html = getWebviewContent(htmlContent);
}

function getWebviewContent(content: string) {
    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Panel</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
        }

        h1 {
            color: #333;
        }
    </style>
</head>

<body>
    ${content}
</body>

</html>`;
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

export function activate(context: vscode.ExtensionContext) {
    console.log("active");

    // Registering the hover event
    vscode.languages.registerHoverProvider("*", {
        provideHover: translateSelectTextHover,
    });

    // Naming function
    let naming = vscode.commands.registerCommand(
        "slm-translation.naming",
        async () => {
            await namingSelectText();
        }
    );

    let translate = vscode.commands.registerCommand(
        "slm-translation.translate",
        async () => {
            await translateSelectText();
        }
    );

    let disposable = vscode.commands.registerCommand(
        "slm-translation.translateOnPanel",
        async () => {
            await translateOnPanel();
        }
    );

    context.subscriptions.push(disposable);

    let disable = vscode.commands.registerCommand(
        "slm-translation.disable",
        () => {
            vscode.window.showInformationMessage("SLM-Translation 已禁用");
            isEnabled = false;
        }
    );

    let enable = vscode.commands.registerCommand(
        "slm-translation.enable",
        () => {
            vscode.window.showInformationMessage("SLM-Translation 已启用");
            isEnabled = true;
        }
    );

    context.subscriptions.push(disable, enable, naming, translate);
}

export function deactivate() {}
