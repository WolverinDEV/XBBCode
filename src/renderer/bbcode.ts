import {Element, TagElement, TextElement} from "../elements";
import {StringRenderer} from "./base";

export default class extends StringRenderer {
    protected doRender(element: Element): (Element | string)[] | string {
        if(element instanceof TagElement) {
            const openTag = "[" + element.tag + (element.options ? "=" + element.options : "") + "]";
            if(element.tagType?.instantClose)
                return openTag;

            return [openTag, ...element.content, "[/" + element.tag + "]"];
        } else if(element instanceof TextElement) {
            return element.rawText;
        } else {
            return "<-- invalid node -->";
        }
    }
}