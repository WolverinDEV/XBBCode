/*
    Side note: The tag '[/]' closes the last opened tag!
 */

namespace xbbcode {
    export namespace patterns {
        export const tag = /^\/?(([a-zA-Z_\-]+(=[\S ]+)?)|(\*))$/g;
        export const tag_escape = /\[|\\(?=\\*\[)/g;
        export const url = /^(?:https?|file|c):(?:\/{1,3}|\\{1})[-a-zA-Z0-9:;,@#%&()~_?\+=\/\\\.]*$/g;
        export const color_name = /^(?:aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)$/g;
        export const color_code = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/g;
        export const email = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
        export const font = /^([a-z][a-z0-9_]+|"[a-z][a-z0-9_\s]+")(, ?[a-z0-9\\-]+)*$/gi;
    }

    export namespace register {
        export interface ConditionalRule {
            tag: string;
            overridden_by: string[]; /* tag which overrides this rule */
        }

        export interface TagParser {
            tag: string | string[],

            ignore_black_whitelist?: boolean;

            content_tags_blacklist?: ConditionalRule[];
            content_tags_whitelist?: string[];

            instant_close?: boolean; /* An example would be the [br] tag */

            build_text?(layer: TagLayer) : string; /* full build method */
            build_text_tag_open?(layer: TagLayer) : string;
            build_text_tag_close?(layer: TagLayer) : string;

            build_html?(layer: TagLayer) : string; /* full build method */
            build_html_tag_open?(layer: TagLayer) : string;
            build_html_tag_close?(layer: TagLayer) : string;
        }

        export function register_parser(parser: TagParser) {
            /*
            if(!parser.build_text && (!parser.build_text_tag_open || !parser.build_text_tag_open))
                throw "Missing text builder!";
            */
            parser.build_text_tag_close = parser.build_text_tag_close || (() => "");
            parser.build_text_tag_open = parser.build_text_tag_open || (() => "");

            if(!parser.build_html && (!parser.build_html_tag_open || !parser.build_html_tag_open))
                throw "Missing html builder!";

            for(const tag of (Array.isArray(parser.tag) ? parser.tag : [parser.tag]))
                registered_tags[tag.toLowerCase()] = parser;
        }

        export function find_parser(tag: string): TagParser | undefined {
            return registered_tags[tag];
        }

        const registered_tags: {[key: string]: TagParser} = {};
    }

    export interface Options {
        tag_blacklist?: string[] | undefined;
        tag_whitelist?: string[] | undefined;

        enforce_back_whitelist?: boolean; /* include tags like no-parse or control tags to be filtered */

        verbose?: boolean;
    }

    export interface Result {
        root_tag: TagLayer;

        build_html() : string;
        build_text() : string;
        build_bbcode() : string;
    }

    export type TextPosition = {
        start: number,
        end: number
    };
    export interface TextReferenced {
        text_position : TextPosition;
    }

    export interface Layer {
        build_bbcode() : string;
        build_text() : string;
        build_html() : string;
    }

    export class TagLayer implements Layer, TextReferenced {
        tag: string;
        tag_normalized: string;

        text_position: TextPosition;
        parser?: register.TagParser;

        options: string;
        content: Layer[];
        properly_closed: boolean;

        constructor(tag: string, parser: register.TagParser | undefined, options?: string, content?: Layer[]) {
            this.tag = tag;
            this.tag_normalized = this.tag.toLowerCase();

            this.options = options;
            this.content = content || [];
            this.properly_closed = false;

            this.parser = parser;
        }

        build_text(): string {
            if(!this.parser)
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

        /* the case of: [HelloWorld] */
        deductible_as_text() : boolean {
            return this.content.length == 0 && !this.properly_closed;
        }
        deduct_as_text() : string {
            return "[" + this.tag + (this.options ? "=" + this.options : "") + "]";
        }
    }

    export class TextLayer implements Layer, TextReferenced {
        raw_text: string;
        bb_escape_characters: number[];

        text_position: TextPosition;

        constructor(text: string, escapes: number[], position_or_begin: number | TextPosition, end?: number) {
            if(typeof(position_or_begin) === "number") {
                this.raw_text = text.substring(position_or_begin, end);
                this.text_position = {
                    end: end,
                    start: position_or_begin
                };
                this.bb_escape_characters = escapes.map(e => e - position_or_begin);
            } else {
                this.raw_text = text;
                this.text_position = position_or_begin;
                this.bb_escape_characters = escapes;
            }
            this.bb_escape_characters = this.bb_escape_characters.sort((a, b) => b - a);
        }

        build_text(): string {
            if(!this.bb_escape_characters)
                return this.raw_text;

            let text = this.raw_text;
            for(const index of this.bb_escape_characters)
                text = text.substring(0, index) + text.substring(index + 1);
            return text;
        }

        build_bbcode(): string {
            return this.raw_text;
        }

        build_html(): string {
            return TextLayer.html_escaped(this.build_text());
        }

        public static html_escaped(text: string) {
            if(typeof(document) !== "undefined" && 'createTextNode' in document) {
                const node_text = document.createTextNode(text);
                const node_p = document.createElement('p');

                node_p.appendChild(node_text);
                return node_p.innerHTML.replace(/\n/g, '<br>');
            } else {
                return text.replace(/[&<"' ]/g, function(m) {
                    switch (m) {
                        case '&':
                            return '&amp;';
                        case '<':
                            return '&lt;';
                        case '"':
                            return '&quot;';
                        case ' ':
                            return '&nbsp';
                        case '\n':
                            return '<br>';
                        default:
                            return '&#039;';
                    }
                });
            }
        }
    }

    function parse_tag(text: string) : { tag: string, close: boolean, options?: string } {
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

    function fix_stack_strings(layer: TagLayer) : TagLayer {
        if(layer.content.length < 2)
            return layer;

        for(let index = 0; index < layer.content.length - 1; index++) {
            let left = layer.content[index];
            if(!(left instanceof TextLayer)) {
                if(left instanceof TagLayer && left.deductible_as_text())
                    left = (layer.content[index] = new TextLayer(left.deduct_as_text(), [], left.text_position));
                else
                    continue;
            } else if(left.bb_escape_characters) {
                continue; /* Text isn't plain. Contains escape characters */
            }

            let right = layer.content[index + 1];
            if(!(right instanceof TextLayer)) {
                if(right instanceof TagLayer && right.deductible_as_text())
                    right = (layer.content[index + 1] = new TextLayer(right.deduct_as_text(), [], right.text_position));
                else {
                    index++; /* if we shift it by one then right will be come left and we will still have a continue! */
                    continue;
                }
            } else if(right.bb_escape_characters) {
                continue; /* Text isn't plain. Contains escape characters */
            }

            (left as TextLayer).raw_text += (right as TextLayer).raw_text;
            (left as TextLayer).text_position.end = (right as TextLayer).text_position.end;
            layer.content.splice(index + 1, 1);
            index--;
        }
        return layer;
    }

    type BlackWhitelist = { blacklist: string[], whitelist?: string[], accept_tag(tag: string) : boolean };
    function build_black_white_list(stack: TagLayer[], options: Options) : BlackWhitelist {
        let blacklist = options.tag_blacklist || [], whitelist: string[] = options.tag_whitelist;

        for(let index = 0; index < stack.length; index++) {
            const element = stack[index].parser;
            if(typeof(element) === "undefined")
                continue;

            if(typeof(element.content_tags_blacklist) !== "undefined") {
                for(const blacklist_entry of element.content_tags_blacklist) {
                    if(blacklist_entry.overridden_by) {
                        let flag_overridden = false;
                        for(let chk_index = index + 1; chk_index < stack.length; chk_index++) {
                            if(blacklist_entry.overridden_by.findIndex(e => e == stack[chk_index].tag_normalized) != -1) {
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

            if(typeof(element.content_tags_whitelist) !== "undefined") {
                if(typeof(whitelist) === "undefined")
                    whitelist = element.content_tags_whitelist;
                else {
                    whitelist = whitelist.filter(e => element.content_tags_whitelist.findIndex(c => c == e) != -1);
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

    function is_list_tag(tag: string) : boolean {
        return ['list', 'ordered-list', 'olist', 'unordered-list', 'ulist'].findIndex(e => e == tag) !== -1;
    }

    function parse_layers(text: string, options: Options) : TagLayer {
        let black_whitelist: BlackWhitelist;
        const stack: TagLayer[] & { back() : TagLayer } = [] as any;
        stack.back = function() {
            return this[this.length - 1];
        };

        stack.push(new TagLayer("", undefined));
        stack.back().text_position = {
            end: text.length,
            start: 0
        };
        black_whitelist = build_black_white_list(stack, options);

        let escaped = [];
        let base_index, index = 0, needle_index, escape_length;
        while(true) {
            base_index = index;

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
                    stack.back().content.push(new TextLayer(text, escaped, index, text.length));
                break;
            }
            if(index != needle_index) {
                /* get the message before */
                stack.back().content.push(new TextLayer(text, escaped, index, needle_index));
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
                    stack.back().content.push(new TextLayer(text, escaped, index - 1, text.length));
                break;
            }

            const raw_tag = text.substring(index, needle_index);
            let ignore_tag = !raw_tag.match(patterns.tag) && raw_tag != "/";

            parse_tag:
            if(!ignore_tag) {
                const tag = parse_tag(raw_tag);
                const parser = tag.tag ? register.find_parser(tag.tag.toLowerCase()) : undefined;

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
                    if(!(tag.close && (tag.tag.length == 0 || tag.tag.toLowerCase() == stack.back().tag_normalized))) {
                        ignore_tag = true;
                        break parse_tag;
                    }
                }

                if(tag.close) {
                    const tag_normalized = tag.tag.toLowerCase();
                    let stack_index = stack.length;
                    while(--stack_index > 0) {
                        if(stack[stack_index].tag_normalized == tag_normalized || tag_normalized.length == 0) {
                            stack[stack_index].properly_closed = true;
                            stack[stack_index].text_position.end = needle_index + 1;

                            while(stack.length > stack_index) {
                                const pos = fix_stack_strings(stack.pop()).text_position;
                                if(pos.end == -1)
                                    pos.end = index - 1; /* we want the brace start as end of the last text! */
                            }

                            black_whitelist = build_black_white_list(stack, options);
                            break;
                        } else if(tag_normalized == '*' && is_list_tag(stack[stack_index].tag_normalized)) /* fix double [/*] within inner lists changing outer behaviours */
                            break;
                    }
                    if(stack_index == 0) {
                        //TODO: Warn for invalid close
                        console.log("Invalid close!");
                        ignore_tag = true;
                    }
                } else {
                    const element = new TagLayer(tag.tag, parser, tag.options);
                    element.text_position = {
                        start: index - 1, /* we want the brace start */
                        end: -1
                    };

                    if(element.tag_normalized == '*') { /* list entry tag */
                        /* search for the base list again and append list entry */
                        const cut_stack: TagLayer[] = [];
                        let stack_index = stack.length;
                        while(--stack_index > 0) {
                            if(is_list_tag(stack[stack_index].tag_normalized)) {
                                while(stack.length > stack_index + 1) /* we don't want to cut the list element itself! */
                                    cut_stack.unshift(fix_stack_strings(stack.pop()));
                                break;
                            } else if(stack[stack_index].tag_normalized == '*' && stack[stack_index].properly_closed)
                                break;
                        }
                        if(stack_index == 0) {
                            console.log("Invalid list handle!");
                            //TODO: Warn for no valid list handle
                            ignore_tag = true;
                        } else {
                            black_whitelist = build_black_white_list(stack, options);

                            /* set the last list tag as closed */
                            cut_stack.forEach(e => e.text_position.end = index - 1); /* we want the brace start as end of the last text! */
                            const elm = cut_stack.filter(e => e.tag_normalized == '*');
                            if(elm.length > 0)
                                elm[0].properly_closed = true;
                        }
                    }

                    if(!ignore_tag) {
                        stack.back().content.push(element);

                        if(!element.parser || !element.parser.instant_close) {
                            stack.push(element);
                            black_whitelist = build_black_white_list(stack, options);
                        } else {
                            element.properly_closed = true;
                        }
                    }
                }
            }

            if(ignore_tag) {
                stack.back().content.push(new TextLayer(text, escaped, index - 1, needle_index + 1));
                escaped = [];
                index = needle_index + 1;
                continue;
            }


            index = needle_index + 1;
        }

        while(stack.length > 1)
            fix_stack_strings(stack.pop());
        return fix_stack_strings(stack[0]);
    }

    function print_stack(layer: Layer, prefix?: string) {
        if(layer instanceof TagLayer) {
            prefix = prefix || "";
            console.log(prefix + "Tag: %s", layer.tag_normalized);
            console.log(prefix + "Closed: %o", layer.properly_closed);
            console.log(prefix + "Range: %d - %d", layer.text_position.start, layer.text_position.end);
            console.log(prefix + "Children: (%d)", layer.content.length);
            layer.content.forEach(e => print_stack(e, prefix + "  "));
        } else if(layer instanceof TextLayer) {
            console.log(prefix + "Range: %d - %d", layer.text_position.start, layer.text_position.end);
            console.log(prefix + "Raw Text: " + layer.raw_text);
        }
    }

    export function parse(text: string, options: Options) : Result {
        const result = parse_layers(text, options);
        if(options.verbose)
            print_stack(result);
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
    }

    export function escape(text: string) {
        return text.replace(patterns.tag_escape, c => "\\" + c);
    }
}

/* register all BBCode tags */
namespace xbbcode {
    export namespace tags {
        function html_enclosed_tag(tag: string | string[], html_tag: string, html_class: string) : register.TagParser {
            return {
                tag: tag,

                build_html_tag_open(layer: xbbcode.TagLayer): string {
                    return '<' + html_tag + ' class="xbbcode-tag xbbcode-tag-' + html_class + '">';
                },

                build_html_tag_close(layer: xbbcode.TagLayer): string {
                    return '</' + html_tag + '>';
                }
            }
        }

        register.register_parser( {
            tag: ['no-parse', 'noparse'],
            content_tags_whitelist: [],
            ignore_black_whitelist: true,

            build_html_tag_open(layer: xbbcode.TagLayer): string {
                return '';
            },

            build_html_tag_close(layer: xbbcode.TagLayer): string {
                return '';
            }
        });

        register.register_parser(html_enclosed_tag(['c', 'center'], 'span', 'center'));
        register.register_parser(html_enclosed_tag(['r', 'right'], 'span', 'right'));
        register.register_parser(html_enclosed_tag(['l', 'left'], 'span', 'left'));

        register.register_parser( {
            tag: ['code', 'icode', 'i-code'],
            content_tags_whitelist: [],

            build_html_tag_open(layer: xbbcode.TagLayer): string {
                const klass = layer.tag_normalized != 'code' ? "xbbcode-tag-inline-code" : "xbbcode-tag-code";
                return '<code class="xbbcode-tag ' + klass + '" x-code-type="' + (layer.options || "").replace("\"", "'") + '">';
            },

            build_html_tag_close(layer: xbbcode.TagLayer): string {
                return '</code>';
            }
        });

        register.register_parser( {
            tag: ['color', 'bg-color', 'bgcolor'],

            build_html_tag_open(layer: xbbcode.TagLayer): string {
                let color;
                const options = layer.options || "black";

                patterns.color_name.lastIndex = 0;
                patterns.color_code.lastIndex = 0;
                if(!patterns.color_name.test(options)) {
                    if(!patterns.color_code.test(options))
                        color = "black";
                    else
                        color = options.startsWith('#') ? options : '#' + options;
                } else {
                    color = options;
                }
                color = color.replace("\"", "'");

                if(layer.tag_normalized == 'color')
                    return '<span class="xbbcode-tag xbbcode-tag-color" style="color: ' + color.toLowerCase() + '">';
                else
                    return '<div class="xbbcode-tag xbbcode-tag-bgcolor" style="background: ' + color.toLowerCase() + '">';
            },

            build_html_tag_close(layer: xbbcode.TagLayer): string {
                if(layer.tag_normalized == 'color')
                    return '</span>';
                else
                    return '</div>';
            }
        });

        register.register_parser( {
            tag: ['face', 'font'],

            build_html_tag_open(layer: xbbcode.TagLayer): string {
                let font_code = layer.options || "inherit";
                patterns.font.lastIndex = 0;
                if (!patterns.font.test(font_code))
                    font_code = "inherit";
                font_code = font_code.replace(/"/g, "'");
                return '<span style="font-family:' + font_code + ';">';
            },

            build_html_tag_close(layer: xbbcode.TagLayer): string {
                return '</span>';
            }
        });

        const size_mapping = ['50%', '70%', '80%', '90%', '100%', '120%', '140%', '160%', '180%'];
        register.register_parser( {
            tag: ['size'],

            build_html_tag_open(layer: xbbcode.TagLayer): string {
                if(layer.options.endsWith('px') || layer.options.endsWith('vp') || layer.options.endsWith('em') || layer.options.endsWith('rem') || layer.options.endsWith('%'))
                    return '<span class="xbbcode-tag xbbcode-tag-size" style="font-size: ' + layer.options.replace('"', "") + '">'; /* the replace should prevent code injection */

                let size = (parseInt(layer.options) || 5) - 1;
                size = size < 0 ? 0 : (size >= size_mapping.length ? size_mapping.length - 1 : size);
                return '<span class="xbbcode-tag xbbcode-tag-size" style="font-size: ' + size_mapping[size] + '">';
            },

            build_html_tag_close(layer: xbbcode.TagLayer): string {
                return '</span>';
            }
        });

        register.register_parser(html_enclosed_tag(['b', 'bold', 'strong'], 'span', 'bold'));
        register.register_parser(html_enclosed_tag(['i', 'italic'], 'span', 'italic'));
        register.register_parser(html_enclosed_tag(['u', 'underlined'], 'span', 'underlined'));
        register.register_parser(html_enclosed_tag(['s', 'strikethrough'], 'span', 'strikethrough'));

        register.register_parser( {
            tag: ['url'],

            build_html_tag_open(layer: xbbcode.TagLayer): string {
                let target;
                if (!layer.options)
                    target = layer.content.map(e => e.build_text()).join("");
                else
                    target = layer.options;

                patterns.url.lastIndex = 0;
                if (!patterns.url.test(target))
                    target = '#';

                return '<a class="xbbcode-tag xbbcode-tag-url" href="' + target.replace("\"", "'") + '" target="_blank">';
            },

            build_html_tag_close(layer: xbbcode.TagLayer): string {
                return '</a>';
            }
        });
        register.register_parser( {
            tag: ['img'],

            build_html(layer: xbbcode.TagLayer) : string {
                let target;
                let content = layer.content.map(e => e.build_text()).join("");
                if (!layer.options) {
                    target = content;
                } else
                    target = layer.options;

                patterns.url.lastIndex = 0;
                if (!patterns.url.test(target))
                    target = '#';

                return '<img class="xbbcode-tag xbbcode-tag-url" src="' + target.replace("\"", "'") + '" title="' + TextLayer.html_escaped(content) + '"/>';
            }
        });
        //register.register_parser(html_enclosed_tag(['quote'], 'span', 'quote'));

        register.register_parser(html_enclosed_tag(['sub'], 'sub', 'sub'));
        register.register_parser(html_enclosed_tag(['sup'], 'sup', 'sup'));


        register.register_parser( {
            tag: ['hr', 'br'],
            instant_close: true,

            build_text_tag_open(layer: xbbcode.TagLayer) : string {
                return '\n';
            },

            build_html(layer: xbbcode.TagLayer) : string {
                return '<' + layer.tag_normalized + '>';
            }
        });

        const list_mapping: {[key: string]:string} = {
            'list': 'ul',
            'ordered-list': 'ol',
            'olist': 'ol',
            'unordered-list': 'ul',
            'ulist': 'ul'
        };
        register.register_parser({
            tag: Object.keys(list_mapping),
            build_html_tag_open(layer: xbbcode.TagLayer): string {
                return '<' + list_mapping[layer.tag_normalized] + ' class="xbbcode-tag xbbcode-tag-list">';
            },

            build_html_tag_close(layer: xbbcode.TagLayer): string {
                return "</" + list_mapping[layer.tag_normalized] + ">";
            }
        });

        register.register_parser({
            tag: '*',
            build_html_tag_open(layer: xbbcode.TagLayer): string {
                return '<li>';
            },

            build_html_tag_close(layer: xbbcode.TagLayer): string {
                return '</li>';
            }
        });

        //TODO: Table ([table] & [td] [th] [tr])
    }
}

//xbbcode.parse("[b=19px]-H[]H[/color]H-[/b]", {});
//xbbcode.parse("[b]XXXX[/b]", {});
//xbbcode.parse("[B][HelloWorld=XXX][/b]", {});
//xbbcode.parse("[list][*] Hello [/*][*] Second [*] Third[*] Fourth [/*] [/list]", {});
//xbbcode.parse("[list][*] Hello [/*][*] [b][color=red]Second[/b] [*] Third[*] Fourth [/*] [/list]", {});

//xbbcode.parse("[list][*] Element A [/*][/*][/list]", {});
//xbbcode.parse("[list][*] Element A [list][*] Inner list [/*][/*][/list] [/*] [*] Element B[/list]", {});
//xbbcode.parse("[b]x[c]y[d]z[/b][/c]", {});

/*
xbbcode.parse("[b][no-parse][b]Hello World[/b][/no-parse][/b]", {
    tag_blacklist: []
});
*/

//xbbcode.parse("[b]Hello <> \\\\[font=arial]:_D[/font] [url=https://google.de]World[/] [hr] [color=FF00FFFF]Second line [/b]", {});