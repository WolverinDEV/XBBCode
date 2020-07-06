import {Tag} from "./registry";

export type TextPosition = {
    start: number,
    end: number
};

export interface Element {
    textPosition : TextPosition;
}

export class TagElement implements Element {
    tagType: Tag | undefined; /* the type of the tag, might be null if we don't know the tag */

    tag: string; /* the tag actually parsed */
    tagNormalized: string; /* just the lowercase string */

    textPosition: TextPosition;
    properlyClosed: boolean;

    options: string;
    content: Element[];

    constructor(tag: string, tagType: Tag | undefined, options?: string, content?: Element[]) {
        this.tagType = tagType;
        this.tag = tag;
        this.tagNormalized = this.tag.toLowerCase();

        this.options = options;
        this.content = content || [];
        this.properlyClosed = false;

    }

    /*
    build_text(): string {
        if(!this.tagType)
            throw "tag not text buildable!";

        if(this.parser.build_text)
            return this.parser.build_text(this);
        return this.parser.build_text_tag_open(this) + this.content.map(e => e.build_text()).join("") + this.parser.build_text_tag_close(this);
    }

    build_bbcode(): string {
        return "[" + this.tag + (this.options ? "=" + this.options : "") + "]" + this.content.map(e => e.build_bbcode()).join("") + "[/" + this.tag + "]";
    }

    build_html(): string {
        if(!this.parser)
            throw "tag (" + this.tag + ") not html buildable!";

        if(this.parser.build_html)
            return this.parser.build_html(this);
        return this.parser.build_html_tag_open(this) + this.content.map(e => e.build_html()).join("") + this.parser.build_html_tag_close(this);
    }
    */

    /* the case of: [HelloWorld] */
    deductibleAsText() : boolean {
        return this.content.length == 0 && !this.properlyClosed;
    }

    deductAsText() : string {
        return "[" + this.tag + (this.options ? "=" + this.options : "") + "]";
    }
}

export class TextElement implements Element {
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
        if(!this.escapeCharacters)
            return this.rawText;

        let text = this.rawText;
        for(const index of this.escapeCharacters)
            text = text.substring(0, index) + text.substring(index + 1);
        return text;
    }
}