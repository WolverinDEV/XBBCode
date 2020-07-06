import {Element} from "../elements";
import {Renderer} from "./base";
import ReactRenderer from "./react";

import { renderToString } from 'react-dom/server'
const reactRenderer = new ReactRenderer();

export default class extends Renderer<string> {
    protected renderDefault(element: Element): string {
        const result = reactRenderer.render(element);

        const stringify = (element: React.ReactNode) => {
            if(typeof element === "string")
                return element;

            return renderToString(element as any);
        };

        return Array.isArray(result) ? result.map(stringify).join("") : stringify(result);
    }
}