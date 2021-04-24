import {BBCodeElement, BBCodeTagElement, BBCodeTextElement} from "./elements";
import * as Registry from "./registry";

const tagPattern = /^\/?(([a-zA-Z_\-]+(=[\S ]+)?)|(\*))$/g;

export interface ParseOptions {
    maxDepth?: number;
    tagRegistry?: Registry.TagRegistry;

    lazyCloseTag?: boolean;

    tag_blacklist?: string[] | undefined;
    tag_whitelist?: string[] | undefined;

    enforce_back_whitelist?: boolean; /* include tags like no-parse or control tags to be filtered */

    verbose?: boolean;
}

function parseTag(text: string) : { tag: string, close: boolean, options?: string } {
    const assign_index = text.indexOf('=');
    const close = text.length > 0 && text[0] == '/';

    if(assign_index == -1) {
        return {
            close: close,
            tag: text.substr(close ? 1 : 0),
            options: undefined
        };
    }

    return {
        close: close,
        tag: text.substr(close ? 1 : 0, assign_index),
        options: text.substr(assign_index + 1)
    }
}

/* concatenate all strings which are concatenate able */
function simplifyStackStrings(layer: BBCodeTagElement) : BBCodeTagElement {
    if(layer.content.length < 2) {
        return layer;
    }

    /* Deduct every element as text if possible */
    for(let index = 0; index < layer.content.length; index++) {
        const element = layer.content[index];
        if(!(element instanceof BBCodeTagElement)) {
            continue;
        }

        if(!element.deductibleAsText()) {
            continue;
        }

        layer.content[index] = new BBCodeTextElement(element.deductAsText(), [], element.textPosition);
    }

    for(let index = 0; index < layer.content.length - 1; index++) {
        let left = layer.content[index];
        if(!(left instanceof BBCodeTextElement)) {
            continue;
        }

        if(left.escapeCharacters.length > 0) {
            /* Text isn't plain. Contains escape characters */
            continue;
        }

        let right = layer.content[index + 1];
        if(!(right instanceof BBCodeTextElement)) {
            continue;
        }

        if(right.escapeCharacters.length > 0) {
            /* Text isn't plain. Contains escape characters */
            continue;
        }

        left.rawText += right.rawText;
        left.textPosition.end = right.textPosition.end;
        layer.content.splice(index + 1, 1);
        index--;
    }

    return layer;
}

type BlackWhitelist = { blacklist: string[], whitelist?: string[], acceptsTag(tag: string) : boolean };
function buildTabBlackWhiteList(stack: BBCodeTagElement[], options: ParseOptions) : BlackWhitelist {
    let blacklist = options.tag_blacklist || [], whitelist: string[] = options.tag_whitelist;

    for(let index = 0; index < stack.length; index++) {
        const tagType = stack[index].tagType;
        if(typeof tagType === "undefined") {
            continue;
        }

        if(typeof(tagType.blacklistTags) !== "undefined") {
            for(const blacklist_entry of tagType.blacklistTags) {
                if(blacklist_entry.overriddenBy) {
                    let flag_overridden = false;
                    for(let chk_index = index + 1; chk_index < stack.length; chk_index++) {
                        if(blacklist_entry.overriddenBy.findIndex(e => e == stack[chk_index].tagNormalized) != -1) {
                            flag_overridden = true;
                            break;
                        }
                    }

                    if(flag_overridden) {
                        continue;
                    }
                }

                blacklist.push(blacklist_entry.tag);
            }
        }

        if(typeof(tagType.whitelistTags) !== "undefined") {
            if(typeof(whitelist) === "undefined") {
                whitelist = tagType.whitelistTags;
            } else {
                whitelist = whitelist.filter(e => tagType.whitelistTags.findIndex(c => c == e) != -1);
            }
        }
    }

    return {
        blacklist: blacklist,
        whitelist: whitelist,

        acceptsTag: function(tag: string): boolean {
            if(typeof(whitelist) !== "undefined" && this.whitelist.findIndex(e => e == tag) == -1) {
                return false;
            }
            return this.blacklist.findIndex(e => e == tag) == -1;
        }
    };
}

function isListTag(tag: string) : boolean {
    return ['list', 'ordered-list', 'olist', 'unordered-list', 'ulist', 'ul', 'ol'].findIndex(e => e == tag) !== -1;
}

function doParse(text: string, options: ParseOptions) : BBCodeTagElement {
    let black_whitelist: BlackWhitelist;
    const stack: BBCodeTagElement[] & { back() : BBCodeTagElement } = [] as any;
    stack.back = function() {
        return this[this.length - 1];
    };

    stack.push(new BBCodeTagElement("", undefined));
    stack.back().textPosition = {
        end: text.length,
        start: 0
    };

    black_whitelist = buildTabBlackWhiteList(stack, options);

    let escaped = [];
    let baseIndex, index = 0, needleIndex, escapeLength;
    while(true) {
        baseIndex = index;

        if(stack.length > options.maxDepth) {
            throw "too many nested bb codes";
        }

        /* find the open bracket */
        needleIndex = index;
        while(true) {
            needleIndex = text.indexOf('[', needleIndex);

            if(needleIndex > 0) {
                escapeLength = 0;
                while(needleIndex - escapeLength > 0) {
                    if(text[needleIndex - escapeLength - 1] != '\\') {
                        break;
                    }
                    escapeLength++;
                }

                for(let index = 0; index < escapeLength; index += 2) {
                    escaped.push(needleIndex - index - 1);
                }

                if(escapeLength % 2 == 1) {
                    //Tag isn't escaped. The escape has been escaped
                    needleIndex++;
                    continue;
                }
            }

            break;
        }

        if(needleIndex == -1) { /* no close bracket */
            /* get the last message */
            if(index < text.length) {
                stack.back().content.push(new BBCodeTextElement(text, escaped, index, text.length));
            }
            break;
        }
        if(index != needleIndex) {
            /* get the message before */
            stack.back().content.push(new BBCodeTextElement(text, escaped, index, needleIndex));
            escaped = [];
            index = needleIndex;
        }

        index = needleIndex + 1; /* tag begin */
        needleIndex = index;

        /* find the next close bracket for the open tag */
        while(true) {
            needleIndex = text.indexOf(']', needleIndex);

            if(needleIndex > 0) {
                escapeLength = 0;
                while(needleIndex - escapeLength > 0) {
                    if(text[needleIndex - escapeLength - 1] != '\\') {
                        break;
                    }
                    escapeLength++;
                }

                for(let index = 0; index < escapeLength; index += 2) {
                    escaped.push(needleIndex - index - 1);
                }

                if(escapeLength % 2 == 1) {
                    //Tag isn't escaped. The escape has been escaped
                    needleIndex++;
                    continue;
                }
            }

            break;
        }

        if(needleIndex == -1) { /* no close bracket for close tag */
            /* get the last message */
            if(index < text.length) {
                stack.back().content.push(new BBCodeTextElement(text, escaped, index - 1, text.length));
            }
            break;
        }

        const rawTag = text.substring(index, needleIndex);
        let ignoreTag = !rawTag.match(tagPattern) && rawTag != "/";

        parseTag:
        if(!ignoreTag) {
            const tag = parseTag(rawTag);
            const parser = tag.tag ? options.tagRegistry.findTag(tag.tag.toLowerCase()) : undefined;

            if(tag.tag || typeof options.lazyCloseTag !== "boolean" || !options.lazyCloseTag) {
                if(!parser) {
                    /* we dont want to parse tags which we dont known */
                    ignoreTag = true;
                    break parseTag;
                }

                blackWhiteCheck:
                if(!black_whitelist.acceptsTag(tag.tag.toLowerCase())) {
                    /* we do not support this tag. Check if parse is null because if so we encountered a "lazy" close tag */
                    if(!parser) {
                        ignoreTag = true;
                        break parseTag;
                    }

                    if(parser.ignore_black_whitelist && !options.enforce_back_whitelist) {
                        break blackWhiteCheck;
                    }

                    /* test if this might be the close tag to the last open tag */
                    if(!(tag.close && (tag.tag.length == 0 || tag.tag.toLowerCase() == stack.back().tagNormalized))) {
                        ignoreTag = true;
                        break parseTag;
                    }
                }
            } else {
                /* Any close tag: "[/]" */
            }

            if(tag.close) {
                const tagNormalized = tag.tag.toLowerCase();
                let stackIndex = stack.length;
                while(--stackIndex > 0) {
                    if(stack[stackIndex].tagNormalized == tagNormalized || tagNormalized.length == 0) {
                        stack[stackIndex].properlyClosed = true;
                        stack[stackIndex].textPosition.end = needleIndex + 1;

                        while(stack.length > stackIndex) {
                            const pos = simplifyStackStrings(stack.pop()).textPosition;
                            if(pos.end == -1) {
                                pos.end = index - 1; /* we want the brace start as end of the last text! */
                            }
                        }

                        black_whitelist = buildTabBlackWhiteList(stack, options);
                        break;
                    } else if(tagNormalized == '*' && isListTag(stack[stackIndex].tagNormalized)) { /* fix double [/*] within inner lists changing outer behaviours */
                        break;
                    }
                }
                if(stackIndex == 0) {
                    //TODO: Warn for invalid close
                    console.log("Invalid close!");
                    ignoreTag = true;
                }
            } else {
                const element = new BBCodeTagElement(tag.tag, parser, tag.options);
                element.textPosition = {
                    start: index - 1, /* we want the brace start */
                    end: -1
                };

                if(element.tagNormalized == '*') { /* list entry tag */
                    /* search for the base list again and append list entry */
                    const cutStack: BBCodeTagElement[] = [];
                    let stack_index = stack.length;
                    while(--stack_index > 0) {
                        if(isListTag(stack[stack_index].tagNormalized)) {
                            while(stack.length > stack_index + 1) {/* we don't want to cut the list element itself! */
                                cutStack.unshift(simplifyStackStrings(stack.pop()));
                            }
                            break;
                        } else if(stack[stack_index].tagNormalized == '*' && stack[stack_index].properlyClosed) {
                            break;
                        }
                    }
                    if(stack_index == 0) {
                        console.log("Invalid list handle!");
                        //TODO: Warn for no valid list handle
                        ignoreTag = true;
                    } else {
                        black_whitelist = buildTabBlackWhiteList(stack, options);

                        /* set the last list tag as closed */
                        cutStack.forEach(e => e.textPosition.end = index - 1); /* we want the brace start as end of the last text! */
                        const elm = cutStack.filter(e => e.tagNormalized == '*');
                        if(elm.length > 0) {
                            elm[0].properlyClosed = true;
                        }
                    }
                }

                if(!ignoreTag) {
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

        if(ignoreTag) {
            stack.back().content.push(new BBCodeTextElement(text, escaped, index - 1, needleIndex + 1));
            escaped = [];
            index = needleIndex + 1;
            continue;
        }


        index = needleIndex + 1;
    }

    while(stack.length > 1) {
        simplifyStackStrings(stack.pop());
    }

    return simplifyStackStrings(stack[0]);
}

function printStack(layer: BBCodeElement, prefix?: string) {
    if(layer instanceof BBCodeTagElement) {
        prefix = prefix || "";
        console.log(prefix + "Tag: %s", layer.tagNormalized);
        console.log(prefix + "Closed: %o", layer.properlyClosed);
        console.log(prefix + "Range: %d - %d", layer.textPosition.start, layer.textPosition.end);
        console.log(prefix + "Children: (%d)", layer.content.length);
        layer.content.forEach(e => printStack(e, prefix + "  "));
    } else if(layer instanceof BBCodeTextElement) {
        console.log(prefix + "Range: %d - %d", layer.textPosition.start, layer.textPosition.end);
        console.log(prefix + "Raw Text: " + layer.rawText);
    }
}

export function parseBBCode(text: string, options_: ParseOptions) : BBCodeElement[] {
    const options = Object.assign({}, options_);

    if(!options.tagRegistry) {
        options.tagRegistry = Registry.DefaultTagRegistry;
    }

    if(!options.maxDepth) {
        options.maxDepth = 128;
    }

    const result = doParse(text, options);
    if(options.verbose) {
        printStack(result);
    }

    return result.content;
}