export interface ConditionalRule {
    tag: string;
    overridden_by: string[]; /* tag which overrides this rule */
}

export interface Tag {
    tag: string;
    synonyms?: string[];

    ignore_black_whitelist?: boolean;

    content_tags_blacklist?: ConditionalRule[];
    content_tags_whitelist?: string[];

    instantClose?: boolean; /* An example would be the [br] tag */
}

export class TagRegistry {
    public readonly parent: TagRegistry | undefined;

    private registeredTags: Tag[] = [];
    private tagMap: {[key: string]: Tag | null} = {};

    constructor(parent: TagRegistry | undefined) {
        this.parent = parent;
    }

    public findTag(tag: string, normalized?: boolean) : Tag {
        if(typeof normalized !== "boolean" || !normalized)
            tag = tag.toLowerCase();

        let result = this.tagMap[tag];
        return typeof result === "undefined" ? this.parent?.findTag(tag, true) : result ? result : undefined;
    }


    public registerTag(tag: Tag) {
        this.registeredTags.push(tag);
        for(const tagName of [tag.tag, ...(tag.synonyms || [])])
            this.tagMap[tagName.toLowerCase()] = tag;
    }

    public tags() {
        return this.registeredTags;
    }
}

export const Default = new TagRegistry(undefined);

Default.registerTag({ tag: "no-parse", synonyms: ["noparse"], content_tags_whitelist: [], ignore_black_whitelist: true });

Default.registerTag({ tag: "center", synonyms: ["c"] });
Default.registerTag({ tag: "right", synonyms: ["r"] });
Default.registerTag({ tag: "left", synonyms: ["l"] });

Default.registerTag({ tag: "bold", synonyms: ["b"] });
Default.registerTag({ tag: "italic", synonyms: ["i"] });
Default.registerTag({ tag: "underlined", synonyms: ["u"] });
Default.registerTag({ tag: "strikethrough", synonyms: ["s"] });

Default.registerTag({ tag: "code", content_tags_whitelist: [] });
Default.registerTag({ tag: "i-code", synonyms: ["icode"], content_tags_whitelist: [] });

Default.registerTag({ tag: "color", synonyms: ["colour"] });
Default.registerTag({ tag: "bg-color", synonyms: ["bg-colour", "bgcolor", "bgcolour"] });

Default.registerTag({ tag: "font" });
Default.registerTag({ tag: "size" });

Default.registerTag({ tag: "url" });
Default.registerTag({ tag: "img" });

Default.registerTag({ tag: "quote" });

Default.registerTag({ tag: "sub" });
Default.registerTag({ tag: "sup" });

Default.registerTag({ tag: "br", instantClose: true });
Default.registerTag({ tag: "hr", instantClose: true });

Default.registerTag({ tag: "ordered-list", synonyms: ["olist", "ol", "list"] });
Default.registerTag({ tag: "unordered-list", synonyms: ["ulist", "ul"] });

Default.registerTag({ tag: "li", synonyms: ["*"] });

Default.registerTag({ tag: "table" });
Default.registerTag({ tag: "table-head", synonyms: ["th"] });
Default.registerTag({ tag: "table-row", synonyms: ["tr"] });

Default.registerTag({ tag: "td" });

Default.registerTag({ tag: "youtube", synonyms: ["yt"], content_tags_whitelist: [] });