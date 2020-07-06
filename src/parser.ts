import {Element, TagElement, TextElement} from "./elements";
import * as Registry from "./registry";

const tagPattern = /^\/?(([a-zA-Z_\-]+(=[\S ]+)?)|(\*))$/g;

export interface Options {
    maxDepth?: number;
    tagRegistry?: Registry.TagRegistry;

    tag_blacklist?: string[] | undefined;
    tag_whitelist?: string[] | undefined;

    enforce_back_whitelist?: boolean; /* include tags like no-parse or control tags to be filtered */

    verbose?: boolean;
}

function parseTag(text: string) : { tag: string, close: boolean, options?: string } {
    const assign_index = text.indexOf('=');
    const close = text.length > 0 && text[0] == '/';

    if(assign_index == -1)
        return {
            close: close,
            tag: text.substr(close ? 1 : 0),
            options: undefined
        };
    return {
        close: close,
        tag: text.substr(close ? 1 : 0, assign_index),
        options: text.substr(assign_index + 1)
    }
}

/* concatenate all strings which are concatenate able */
function fixStackStrings(layer: TagElement) : TagElement {
    if(layer.content.length < 2)
        return layer;

    for(let index = 0; index < layer.content.length - 1; index++) {
        let left = layer.content[index];
        if(!(left instanceof TextElement)) {
            if(left instanceof TagElement && left.deductibleAsText())
                left = (layer.content[index] = new TextElement(left.deductAsText(), [], left.textPosition));
            else
                continue;
        } else if(left.escapeCharacters) {
            continue; /* Text isn't plain. Contains escape characters */
        }

        let right = layer.content[index + 1];
        if(!(right instanceof TextElement)) {
            if(right instanceof TagElement && right.deductibleAsText())
                right = (layer.content[index + 1] = new TextElement(right.deductAsText(), [], right.textPosition));
            else {
                index++; /* if we shift it by one then right will be come left and we will still have a continue! */
                continue;
            }
        } else if(right.escapeCharacters) {
            continue; /* Text isn't plain. Contains escape characters */
        }

        (left as TextElement).rawText += (right as TextElement).rawText;
        (left as TextElement).textPosition.end = (right as TextElement).textPosition.end;
        layer.content.splice(index + 1, 1);
        index--;
    }
    return layer;
}

type BlackWhitelist = { blacklist: string[], whitelist?: string[], accept_tag(tag: string) : boolean };
function buildTabBlackWhiteList(stack: TagElement[], options: Options) : BlackWhitelist {
    let blacklist = options.tag_blacklist || [], whitelist: string[] = options.tag_whitelist;

    for(let index = 0; index < stack.length; index++) {
        const tagType = stack[index].tagType;
        if(typeof tagType === "undefined")
            continue;

        if(typeof(tagType.content_tags_blacklist) !== "undefined") {
            for(const blacklist_entry of tagType.content_tags_blacklist) {
                if(blacklist_entry.overridden_by) {
                    let flag_overridden = false;
                    for(let chk_index = index + 1; chk_index < stack.length; chk_index++) {
                        if(blacklist_entry.overridden_by.findIndex(e => e == stack[chk_index].tagNormalized) != -1) {
                            flag_overridden = true;
                            break;
                        }
                    }

                    if(flag_overridden)
                        continue;
                }

                blacklist.push(blacklist_entry.tag);
            }
        }

        if(typeof(tagType.content_tags_whitelist) !== "undefined") {
            if(typeof(whitelist) === "undefined")
                whitelist = tagType.content_tags_whitelist;
            else {
                whitelist = whitelist.filter(e => tagType.content_tags_whitelist.findIndex(c => c == e) != -1);
            }
        }
    }

    return {
        blacklist: blacklist,
        whitelist: whitelist,

        accept_tag: function(tag: string): boolean {
            if(typeof(whitelist) !== "undefined" && this.whitelist.findIndex(e => e == tag) == -1)
                return false;
            return this.blacklist.findIndex(e => e == tag) == -1;
        }
    };
}

function isListTag(tag: string) : boolean {
    return ['list', 'ordered-list', 'olist', 'unordered-list', 'ulist', 'ul', 'ol'].findIndex(e => e == tag) !== -1;
}

function doParse(text: string, options: Options) : TagElement {
    let black_whitelist: BlackWhitelist;
    const stack: TagElement[] & { back() : TagElement } = [] as any;
    stack.back = function() {
        return this[this.length - 1];
    };

    stack.push(new TagElement("", undefined));
    stack.back().textPosition = {
        end: text.length,
        start: 0
    };

    black_whitelist = buildTabBlackWhiteList(stack, options);

    let escaped = [];
    let base_index, index = 0, needle_index, escape_length;
    while(true) {
        base_index = index;

        if(stack.length > options.maxDepth)
            throw "too many nested bb codes";

        /* find the open bracket */
        needle_index = index;
        while(true) {
            needle_index = text.indexOf('[', needle_index);

            if(needle_index > 0) {
                escape_length = 0;
                while(needle_index - escape_length > 0) {
                    if(text[needle_index - escape_length - 1] != '\\')
                        break;
                    escape_length++;
                }

                for(let index = 0; index < escape_length; index += 2)
                    escaped.push(needle_index - index - 1);

                if(escape_length % 2 == 1) {
                    //Tag isn't escaped. The escape has been escaped
                    needle_index++;
                    continue;
                }
            }

            break;
        }

        if(needle_index == -1) { /* no close bracket */
            /* get the last message */
            if(index < text.length)
                stack.back().content.push(new TextElement(text, escaped, index, text.length));
            break;
        }
        if(index != needle_index) {
            /* get the message before */
            stack.back().content.push(new TextElement(text, escaped, index, needle_index));
            escaped = [];
            index = needle_index;
        }

        index = needle_index + 1; /* tag begin */
        needle_index = index;

        /* find the next close bracket for the open tag */
        while(true) {
            needle_index = text.indexOf(']', needle_index);

            if(needle_index > 0) {
                escape_length = 0;
                while(needle_index - escape_length > 0) {
                    if(text[needle_index - escape_length - 1] != '\\')
                        break;
                    escape_length++;
                }

                for(let index = 0; index < escape_length; index += 2)
                    escaped.push(needle_index - index - 1);

                if(escape_length % 2 == 1) {
                    //Tag isn't escaped. The escape has been escaped
                    needle_index++;
                    continue;
                }
            }

            break;
        }

        if(needle_index == -1) { /* no close bracket for close tag */
            /* get the last message */
            if(index < text.length)
                stack.back().content.push(new TextElement(text, escaped, index - 1, text.length));
            break;
        }

        const raw_tag = text.substring(index, needle_index);
        let ignore_tag = !raw_tag.match(tagPattern) && raw_tag != "/";

        parse_tag:
        if(!ignore_tag) {
            const tag = parseTag(raw_tag);
            const parser = tag.tag ? options.tagRegistry.findTag(tag.tag.toLowerCase()) : undefined;

            //TODO: Option if we want to support the "lazy" close tags: [/]
            if(tag.tag && !parser) {
                /* we dont want to parse tags which we dont known */
                ignore_tag = true;
                break parse_tag;
            }

            black_white_check:
                if(!black_whitelist.accept_tag(tag.tag.toLowerCase())) {
                    /* we do not support this tag. Check if parse is null because if so we encountered a "lazy" close tag */
                    if(!parser) {
                        ignore_tag = true;
                        break parse_tag;
                    }

                    if(parser.ignore_black_whitelist && !options.enforce_back_whitelist)
                        break black_white_check;

                    /* test if this might be the close tag to the last open tag */
                    if(!(tag.close && (tag.tag.length == 0 || tag.tag.toLowerCase() == stack.back().tagNormalized))) {
                        ignore_tag = true;
                        break parse_tag;
                    }
                }

            if(tag.close) {
                const tag_normalized = tag.tag.toLowerCase();
                let stack_index = stack.length;
                while(--stack_index > 0) {
                    if(stack[stack_index].tagNormalized == tag_normalized || tag_normalized.length == 0) {
                        stack[stack_index].properlyClosed = true;
                        stack[stack_index].textPosition.end = needle_index + 1;

                        while(stack.length > stack_index) {
                            const pos = fixStackStrings(stack.pop()).textPosition;
                            if(pos.end == -1)
                                pos.end = index - 1; /* we want the brace start as end of the last text! */
                        }

                        black_whitelist = buildTabBlackWhiteList(stack, options);
                        break;
                    } else if(tag_normalized == '*' && isListTag(stack[stack_index].tagNormalized)) { /* fix double [/*] within inner lists changing outer behaviours */
                        break;
                    }
                }
                if(stack_index == 0) {
                    //TODO: Warn for invalid close
                    console.log("Invalid close!");
                    ignore_tag = true;
                }
            } else {
                const element = new TagElement(tag.tag, parser, tag.options);
                element.textPosition = {
                    start: index - 1, /* we want the brace start */
                    end: -1
                };

                if(element.tagNormalized == '*') { /* list entry tag */
                    /* search for the base list again and append list entry */
                    const cut_stack: TagElement[] = [];
                    let stack_index = stack.length;
                    while(--stack_index > 0) {
                        if(isListTag(stack[stack_index].tagNormalized)) {
                            while(stack.length > stack_index + 1) /* we don't want to cut the list element itself! */
                                cut_stack.unshift(fixStackStrings(stack.pop()));
                            break;
                        } else if(stack[stack_index].tagNormalized == '*' && stack[stack_index].properlyClosed)
                            break;
                    }
                    if(stack_index == 0) {
                        console.log("Invalid list handle!");
                        //TODO: Warn for no valid list handle
                        ignore_tag = true;
                    } else {
                        black_whitelist = buildTabBlackWhiteList(stack, options);

                        /* set the last list tag as closed */
                        cut_stack.forEach(e => e.textPosition.end = index - 1); /* we want the brace start as end of the last text! */
                        const elm = cut_stack.filter(e => e.tagNormalized == '*');
                        if(elm.length > 0)
                            elm[0].properlyClosed = true;
                    }
                }

                if(!ignore_tag) {
                    stack.back().content.push(element);

                    if(!element.tagType?.instantClose) {
                        stack.push(element);
                        black_whitelist = buildTabBlackWhiteList(stack, options);
                    } else {
                        element.properlyClosed = true;
                    }
                }
            }
        }

        if(ignore_tag) {
            stack.back().content.push(new TextElement(text, escaped, index - 1, needle_index + 1));
            escaped = [];
            index = needle_index + 1;
            continue;
        }


        index = needle_index + 1;
    }

    while(stack.length > 1)
        fixStackStrings(stack.pop());
    return fixStackStrings(stack[0]);
}

function printStack(layer: Element, prefix?: string) {
    if(layer instanceof TagElement) {
        prefix = prefix || "";
        console.log(prefix + "Tag: %s", layer.tagNormalized);
        console.log(prefix + "Closed: %o", layer.properlyClosed);
        console.log(prefix + "Range: %d - %d", layer.textPosition.start, layer.textPosition.end);
        console.log(prefix + "Children: (%d)", layer.content.length);
        layer.content.forEach(e => printStack(e, prefix + "  "));
    } else if(layer instanceof TextElement) {
        console.log(prefix + "Range: %d - %d", layer.textPosition.start, layer.textPosition.end);
        console.log(prefix + "Raw Text: " + layer.rawText);
    }
}

export function parse(text: string, options_: Options) : Element[] {
    const options = Object.assign({}, options_);

    if(!options.tagRegistry)
        options.tagRegistry = Registry.Default;

    if(!options.maxDepth)
        options.maxDepth = 128;

    const result = doParse(text, options);
    if(options.verbose)
        printStack(result);

    return result.content;
    /*
    return {
        root_tag: result,
        build_bbcode(): string {
            return result.content.map(e => e.build_bbcode()).join("");
        },
        build_html(): string {
            return result.content.map(e => e.build_html()).join("");
        },
        build_text(): string {
            return result.content.map(e => e.build_text()).join("");
        }
    };
    */
}