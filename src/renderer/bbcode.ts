import {BBCodeElement, BBCodeTagElement, BBCodeTextElement} from "../elements";
import {StringRenderer} from "./base";

export default class extends StringRenderer {
    protected doRender(element: BBCodeElement): (BBCodeElement | string)[] | string {
        if(element instanceof BBCodeTagElement) {
            const openTag = "[" + element.tag + (element.options ? "=" + element.options : "") + "]";
            if(element.tagType?.instantClose)
                return openTag;

            return [openTag, ...element.content, "[/" + element.tag + "]"];
        } else if(element instanceof BBCodeTextElement) {
            return element.rawText;
        } else {
            return "<-- invalid node -->";
        }
    }
}