import {Element} from "../elements";
import {Renderer} from "./base";
import ReactRenderer from "./react";

import { renderToStaticMarkup } from 'react-dom/server'
const reactRenderer = new ReactRenderer();

export default class extends Renderer<string> {
    readonly reactRenderer: ReactRenderer | undefined;

    constructor(reactRenderer?: ReactRenderer) {
        super();

        this.reactRenderer = reactRenderer;
    }

    protected renderDefault(element: Element): string {
        const result = (this.reactRenderer || reactRenderer).render(element);

        const stringify = (element: React.ReactNode) => {
            if(typeof element === "string")
                return element;

            return renderToStaticMarkup(element as any);
        };

        return Array.isArray(result) ? result.map(stringify).join("") : stringify(result);
    }
}