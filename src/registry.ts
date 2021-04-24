export interface ConditionalRule {
    tag: string;
    overriddenBy: string[]; /* tag which overrides this rule */
}

export interface BBCodeTag {
    tag: string;
    synonyms?: string[];

    ignore_black_whitelist?: boolean;

    blacklistTags?: ConditionalRule[];
    whitelistTags?: string[];

    instantClose?: boolean; /* An example would be the [br] tag */
}

export class TagRegistry {
    public readonly parent: TagRegistry | undefined;

    private registeredTags: BBCodeTag[] = [];
    private tagMap: {[key: string]: BBCodeTag | null} = {};

    constructor(parent: TagRegistry | undefined) {
        this.parent = parent;
    }

    public findTag(tag: string, normalized?: boolean) : BBCodeTag {
        if(typeof normalized !== "boolean" || !normalized) {
            tag = tag.toLowerCase();
        }

        let result = this.tagMap[tag];
        return typeof result === "undefined" ? this.parent?.findTag(tag, true) : result ? result : undefined;
    }


    public registerTag(tag: BBCodeTag) {
        this.registeredTags.push(tag);
        for(const tagName of [tag.tag, ...(tag.synonyms || [])]) {
            this.tagMap[tagName.toLowerCase()] = tag;
        }
    }

    public tags() {
        return this.registeredTags;
    }
}

export const DefaultTagRegistry = new TagRegistry(undefined);

DefaultTagRegistry.registerTag({ tag: "no-parse", synonyms: ["noparse"], whitelistTags: [], ignore_black_whitelist: true });

DefaultTagRegistry.registerTag({ tag: "center", synonyms: ["c"] });
DefaultTagRegistry.registerTag({ tag: "right", synonyms: ["r"] });
DefaultTagRegistry.registerTag({ tag: "left", synonyms: ["l"] });

DefaultTagRegistry.registerTag({ tag: "bold", synonyms: ["b"] });
DefaultTagRegistry.registerTag({ tag: "italic", synonyms: ["i"] });
DefaultTagRegistry.registerTag({ tag: "underlined", synonyms: ["u"] });
DefaultTagRegistry.registerTag({ tag: "strikethrough", synonyms: ["s"] });

DefaultTagRegistry.registerTag({ tag: "code", whitelistTags: [] });
DefaultTagRegistry.registerTag({ tag: "i-code", synonyms: ["icode"], whitelistTags: [] });

DefaultTagRegistry.registerTag({ tag: "color", synonyms: ["colour"] });
DefaultTagRegistry.registerTag({ tag: "bg-color", synonyms: ["bg-colour", "bgcolor", "bgcolour"] });

DefaultTagRegistry.registerTag({ tag: "font" });
DefaultTagRegistry.registerTag({ tag: "size" });

DefaultTagRegistry.registerTag({ tag: "url", whitelistTags: [] });
DefaultTagRegistry.registerTag({ tag: "img", whitelistTags: [] });

DefaultTagRegistry.registerTag({ tag: "quote" });

DefaultTagRegistry.registerTag({ tag: "sub" });
DefaultTagRegistry.registerTag({ tag: "sup" });

DefaultTagRegistry.registerTag({ tag: "br", instantClose: true });
DefaultTagRegistry.registerTag({ tag: "hr", instantClose: true });

DefaultTagRegistry.registerTag({ tag: "ordered-list", synonyms: ["olist", "ol", "list"] });
DefaultTagRegistry.registerTag({ tag: "unordered-list", synonyms: ["ulist", "ul"] });

DefaultTagRegistry.registerTag({ tag: "li", synonyms: ["*"] });

DefaultTagRegistry.registerTag({ tag: "table" });
DefaultTagRegistry.registerTag({ tag: "table-head", synonyms: ["th"] });
DefaultTagRegistry.registerTag({ tag: "table-row", synonyms: ["tr"] });

DefaultTagRegistry.registerTag({ tag: "td" });

DefaultTagRegistry.registerTag({ tag: "youtube", synonyms: ["yt"], whitelistTags: [] });