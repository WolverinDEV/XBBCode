import {BBCodeElement, BBCodeTagElement, BBCodeTextElement} from "../elements";

export abstract class Renderer<T> {
    private textRenderer: ElementRenderer<BBCodeTextElement, T> | undefined;
    private knownRenderer: {[key: string]: ElementRenderer<BBCodeElement, T>} = {};

    public render(element: BBCodeElement, skipCustomRenderers?: boolean) : T {
        let renderer: ElementRenderer<BBCodeElement, T>;
        if(element instanceof BBCodeTextElement) {
            renderer = this.textRenderer;
        } else if(element instanceof BBCodeTagElement) {
            renderer = this.knownRenderer[element.tagType?.tag];
        }

        return renderer && !skipCustomRenderers ? renderer.render(element, this) : this.renderDefault(element);
    }

    public renderContent(element: BBCodeElement, skipCustomRenderers?: boolean) : T[] {
        if(element instanceof BBCodeTagElement)
            return element.content.map(e => skipCustomRenderers ? this.renderDefault(e) : this.render(e));

        /* text nodes can only be default rendered */
        return [this.renderDefault(element)];
    }

    protected abstract renderDefault(element: BBCodeElement) : T;

    getTextRenderer() : ElementRenderer<BBCodeTextElement, T> | undefined {
        return this.textRenderer;
    }

    setTextRenderer(renderer: ElementRenderer<BBCodeTextElement, T> | undefined) {
        this.textRenderer = renderer;
    }

    registerCustomRenderer(renderer: ElementRenderer<BBCodeTagElement, T>) {
        const tags = renderer.tags();
        (Array.isArray(tags) ? tags : [tags]).forEach(tag => this.knownRenderer[tag] = renderer);
    }

    deleteCustomRenderer(tag: string) {
        delete this.knownRenderer[tag];
    }

    listCustomRenderers() : string[] {
        return Object.keys(this.knownRenderer);
    }

    getCustomRenderer(key: string) : ElementRenderer<BBCodeTagElement, T> | undefined {
        return this.knownRenderer[key];
    }
}

export abstract class ElementRenderer<E extends BBCodeElement, T, R extends Renderer<T> = Renderer<T>> {
    abstract tags() : string | string[]; /* which tags etc should be rendered */
    abstract render(element: E, renderer: R) : T;
}

export abstract class StringRenderer extends Renderer<string> {
    /* We've to use some kind of stack technique since we can't use recursive calls. They may exceed the max recursive call limit */
    protected renderDefault(element: BBCodeElement): string {
        let result = "";

        const toVisit: (BBCodeElement | string)[] = [element];
        while(toVisit.length > 0) {
            const element = toVisit.splice(0, 1)[0];
            if(typeof element === "string") {
                result += element;
            } else {
                const rendered = this.doRender(element);
                if(typeof rendered === "string") {
                    result += rendered;
                } else {
                    toVisit.splice(0, 0, ...rendered);
                }
            }
        }

        return result;
    };

    protected abstract doRender(element: BBCodeElement) : (BBCodeElement | string)[] | string;
}