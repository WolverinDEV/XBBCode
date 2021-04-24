import {BBCodeTag} from "./registry";

export type TextPosition = {
    start: number,
    end: number
};

export interface BBCodeElement {
    textPosition : TextPosition;
}

export class BBCodeTagElement implements BBCodeElement {
    tagType: BBCodeTag | undefined; /* the type of the tag, might be null if we don't know the tag */

    tag: string; /* the tag actually parsed */
    tagNormalized: string; /* just the lowercase string */

    textPosition: TextPosition;
    properlyClosed: boolean;

    options: string;
    content: BBCodeElement[];

    constructor(tag: string, tagType: BBCodeTag | undefined, options?: string, content?: BBCodeElement[]) {
        this.tagType = tagType;
        this.tag = tag;
        this.tagNormalized = this.tag.toLowerCase();

        this.options = options;
        this.content = content || [];
        this.properlyClosed = false;

    }

    /* the case of: [HelloWorld] */
    deductibleAsText() : boolean {
        return this.content.length == 0 && !this.properlyClosed;
    }

    deductAsText() : string {
        return "[" + this.tag + (this.options ? "=" + this.options : "") + "]";
    }
}

export class BBCodeTextElement implements BBCodeElement {
    rawText: string;
    escapeCharacters: number[];

    textPosition: TextPosition;

    constructor(text: string, escapes: number[], positionOrBegin: number | TextPosition, end?: number) {
        if(typeof(positionOrBegin) === "number") {
            this.rawText = text.substring(positionOrBegin, end);
            this.textPosition = {
                end: end,
                start: positionOrBegin
            };
            this.escapeCharacters = escapes.map(e => e - positionOrBegin);
        } else {
            this.rawText = text;
            this.textPosition = positionOrBegin;
            this.escapeCharacters = escapes;
        }
        this.escapeCharacters = this.escapeCharacters.sort((a, b) => b - a);
    }

    text() : string {
        if(!this.escapeCharacters.length) {
            return this.rawText;
        }

        let text = this.rawText;
        for(const index of this.escapeCharacters) {
            text = text.substring(0, index) + text.substring(index + 1);
        }
        return text;
    }
}