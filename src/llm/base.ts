/** LM Invoker **/
export interface LM {
    llmInvoke(text: string, sysMsg: string): Promise<string>;
    llmStreamInvoke(
        text: string,
        sysMsg: string
    ): AsyncGenerator<string>;
    changeModel(model: string): void;
}

export abstract class LMBase implements LM {
    protected _model: string;

    constructor(model: string) {
        this._model = model;
    }

    changeModel(model: string) {
        this._model = model;
        console.log(`LMBase: changeModel`);
        console.log(`\tmodel: ${model}\n`);
    }

    abstract llmInvoke(text: string, sysMsg: string): Promise<string>;
    abstract llmStreamInvoke(
        text: string,
        sysMsg: string
    ): AsyncGenerator<string>;
}
