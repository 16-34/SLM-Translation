import * as vscode from "vscode";

export class ViewProvider implements vscode.WebviewViewProvider {
    context: vscode.ExtensionContext;
    private _view?: vscode.WebviewView;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri],
        };
    
        this._view = webviewView;
    }

    show(content: string) {
        if (this._view) {
            this._view.webview.html = content;
        }
    }
}
