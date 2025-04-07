/** LM Invoker **/
export interface LM {
    llmInvoke(text: string, sysMsg: string): Promise<string>;
    changeModel(model: string): void;
}

export abstract class LMBase implements LM {
    protected model: string;

    constructor(model: string) {
        this.model = model;
    }

    changeModel(model: string) {
        this.model = model;
        console.log(
            `LMBase: changeModel\n` +
                `\tmodel: ${model}\n`
        );
    }

    abstract llmInvoke(text: string, sysMsg: string): Promise<string>;
}
