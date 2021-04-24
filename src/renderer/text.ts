import {BBCodeElement, BBCodeTagElement, BBCodeTextElement} from "../elements";
import {StringRenderer} from "./base";

export default class extends StringRenderer {
    protected doRender(element: BBCodeElement) : (BBCodeElement | string)[] | string {
        if(element instanceof BBCodeTagElement) {
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
        } else if(element instanceof BBCodeTextElement) {
            return element.text();
        } else {
            return "<-- invalid node -->";
        }
    }
}