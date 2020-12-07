import {Element, TagElement, TextElement} from "../elements";
import {StringRenderer} from "./base";

export default class extends StringRenderer {
    protected doRender(element: Element) : (Element | string)[] | string {
        if(element instanceof TagElement) {
            switch (element.tagType?.tag) {
                case "br":
                case "hr":
                    return "\n";

                default:
                    if(element.deductibleAsText()) {
                        return element.deductAsText();
                    }

                    return element.content;
            }
        } else if(element instanceof TextElement) {
            return element.text();
        } else {
            return "<-- invalid node -->";
        }
    }
}