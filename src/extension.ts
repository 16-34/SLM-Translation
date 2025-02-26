import * as vscode from "vscode";
import { Translator } from "./translation";

let isEnabled = true;
let t: Translator = new Translator("qwen2.5:1.5b");

async function handleSelectTextHover(
    document: vscode.TextDocument,
    position: vscode.Position
) {
    if (!isEnabled) return;
    const editor = vscode.window.activeTextEditor;
    const selection = editor?.selection;

    if (!editor || !selection || !selection.contains(position)) return;
    const text = editor.document.getText(selection);
    if (text) {
        console.log(text);
        let content = (await t.translate(text)) as any;
        console.log(content);
        console.log("----------------------------------------------------");

        const markdownString = new vscode.MarkdownString();
        markdownString.appendMarkdown(content);
        markdownString.supportHtml = true;
        markdownString.isTrusted = true;
        return new vscode.Hover(markdownString);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log("active");

    // Registering the hover event
    vscode.languages.registerHoverProvider("*", {
        provideHover: handleSelectTextHover,
    });

    let disable = vscode.commands.registerCommand(
        "slm-translation.disable",
        () => {
            vscode.window.showInformationMessage("翻译功能已关闭");
            isEnabled = false;
        }
    );

    let enable = vscode.commands.registerCommand(
        "slm-translation.enable",
        () => {
            vscode.window.showInformationMessage("翻译功能已开启");
            isEnabled = true;
        }
    );

    context.subscriptions.push(disable, enable);
}

export function deactivate() {}
