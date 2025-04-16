import * as vscode from "vscode";

export interface Message {
    role: string;
    content: string;
}

/** LM Invoker **/
export interface LM {
    lmInvoke(
        text: string,
        sysMsg: string,
        example?: Message[]
    ): Promise<string>;
    lmStreamInvoke(
        text: string,
        sysMsg: string,
        example?: Message[]
    ): AsyncGenerator<string>;
    changeModel(model: string): void;
}

export abstract class LMBase implements LM {
    protected _model: string;

    constructor(model: string) {
        this._model = model;
        vscode.window.setStatusBarMessage(this._model);
    }

    changeModel(model: string) {
        this._model = model;
        vscode.window.setStatusBarMessage(this._model);
        console.log(`LMBase: changeModel`);
        console.log(`\tmodel: ${model}\n`);
    }

    abstract lmInvoke(
        text: string,
        sysMsg: string,
        example: Message[]
    ): Promise<string>;

    abstract lmStreamInvoke(
        text: string,
        sysMsg: string,
        example: Message[]
    ): AsyncGenerator<string>;
}
