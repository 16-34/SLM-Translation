import path from "path";
import * as fs from "fs";
import * as vscode from "vscode";

export function getWebViewContent(templatePath: string) {
    const resourcePath: string = path.join(
        path.dirname(__dirname),
        templatePath
    );
    const dirPath = path.dirname(resourcePath);
    let html = fs.readFileSync(resourcePath, "utf-8");
    html = html.replace(
        /(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g,
        (m, $1, $2) => {
            return (
                $1 +
                vscode.Uri.file(path.resolve(dirPath, $2))
                    .with({ scheme: "vscode-resource" })
                    .toString() +
                '"'
            );
        }
    );
    return html;
}
