import {Element, TagElement, TextElement} from "../elements";

export abstract class Renderer<T> {
    private textRenderer: ElementRenderer<TextElement, T> | undefined;
    private knownRenderer: {[key: string]: ElementRenderer<Element, T>} = {};

    public render(element: Element) : T {
        let renderer: ElementRenderer<Element, T>;
        if(element instanceof TextElement)
            renderer = this.textRenderer;
        else if(element instanceof TagElement)
            renderer = this.knownRenderer[element.tagType?.tag];

        return renderer ? renderer.render(element) : this.renderDefault(element);
    }

    protected abstract renderDefault(element: Element) : T;

    getTextRenderer() : ElementRenderer<TextElement, T> | undefined {
        return this.textRenderer;
    }

    setTextRenderer(renderer: ElementRenderer<TextElement, T> | undefined) {
        this.textRenderer = renderer;
    }

    registerCustomRenderer(tag: string, renderer: ElementRenderer<Element, T>) {
        this.knownRenderer[tag] = renderer;
    }

    deleteCustomRenderer(tag: string) {
        delete this.knownRenderer[tag];
    }

    listCustomRenderers() : string[] {
        return Object.keys(this.knownRenderer);
    }

    getCustomRenderer(key: string) : ElementRenderer<Element, T> | undefined {
        return this.knownRenderer[key];
    }
}

export abstract class ElementRenderer<E extends Element, T> {
    abstract tags() : string | string[]; /* which tags etc should be rendered */
    abstract render(element: E) : T;
}

export abstract class StringRenderer extends Renderer<string> {
    /* We've to use some kind of stack technique since we can't use recursive calls. They may exceed the max recursive call limit */
    protected renderDefault(element: Element): string {
        let result = "";

        const toVisit: (Element | string)[] = [element];
        while(toVisit.length > 0) {
            const element = toVisit.splice(0, 1)[0];
            if(typeof element === "string") {
                result += element;
            } else {
                const rendered = this.doRender(element);
                if(typeof rendered === "string")
                    result += rendered;
                else
                    toVisit.splice(0, 0, ...rendered);
            }
        }

        return result;
    };

    protected abstract doRender(element: Element) : (Element | string)[] | string;
}