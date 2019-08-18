/*
    Side note: The tag '[/]' closes the last opened tag!
 */
var xbbcode;
(function (xbbcode) {
    let patterns;
    (function (patterns) {
        patterns.tag = /^\/?(([a-zA-Z_\-]+(=[\S ]+)?)|(\*))$/g;
        patterns.tag_escape = /\[|\\(?=\\*\[)/g;
        patterns.url = /^(?:https?|file|c):(?:\/{1,3}|\\{1})[-a-zA-Z0-9:;,@#%&()~_?\+=\/\\\.]*$/g;
        patterns.color_name = /^(?:aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)$/g;
        patterns.color_code = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/g;
        patterns.email = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
        patterns.font = /^([a-z][a-z0-9_]+|"[a-z][a-z0-9_\s]+")(, ?[a-z0-9\\-]+)*$/gi;
    })(patterns = xbbcode.patterns || (xbbcode.patterns = {}));
    let register;
    (function (register) {
        function register_parser(parser) {
            /*
            if(!parser.build_text && (!parser.build_text_tag_open || !parser.build_text_tag_open))
                throw "Missing text builder!";
            */
            parser.build_text_tag_close = parser.build_text_tag_close || (() => "");
            parser.build_text_tag_open = parser.build_text_tag_open || (() => "");
            if (!parser.build_html && (!parser.build_html_tag_open || !parser.build_html_tag_open))
                throw "Missing html builder!";
            for (const tag of (Array.isArray(parser.tag) ? parser.tag : [parser.tag]))
                registered_tags[tag.toLowerCase()] = parser;
        }
        register.register_parser = register_parser;
        function find_parser(tag) {
            return registered_tags[tag];
        }
        register.find_parser = find_parser;
        const registered_tags = {};
    })(register = xbbcode.register || (xbbcode.register = {}));
    class TagLayer {
        constructor(tag, parser, options, content) {
            this.tag = tag;
            this.tag_normalized = this.tag.toLowerCase();
            this.options = options;
            this.content = content || [];
            this.properly_closed = false;
            this.parser = parser;
        }
        build_text() {
            if (!this.parser)
                throw "tag not text buildable!";
            if (this.parser.build_text)
                return this.parser.build_text(this);
            return this.parser.build_text_tag_open(this) + this.content.map(e => e.build_text()).join("") + this.parser.build_text_tag_close(this);
        }
        build_bbcode() {
            return "[" + this.tag + (this.options ? "=" + this.options : "") + "]" + this.content.map(e => e.build_bbcode()).join("") + "[/" + this.tag + "]";
        }
        build_html() {
            if (!this.parser)
                throw "tag (" + this.tag + ") not html buildable!";
            if (this.parser.build_html)
                return this.parser.build_html(this);
            return this.parser.build_html_tag_open(this) + this.content.map(e => e.build_html()).join("") + this.parser.build_html_tag_close(this);
        }
        /* the case of: [HelloWorld] */
        deductible_as_text() {
            return this.content.length == 0 && !this.properly_closed;
        }
        deduct_as_text() {
            return "[" + this.tag + (this.options ? "=" + this.options : "") + "]";
        }
    }
    xbbcode.TagLayer = TagLayer;
    class TextLayer {
        constructor(text, escapes, position_or_begin, end) {
            if (typeof (position_or_begin) === "number") {
                this.raw_text = text.substring(position_or_begin, end);
                this.text_position = {
                    end: end,
                    start: position_or_begin
                };
                this.bb_escape_characters = escapes.map(e => e - position_or_begin);
            }
            else {
                this.raw_text = text;
                this.text_position = position_or_begin;
                this.bb_escape_characters = escapes;
            }
            this.bb_escape_characters = this.bb_escape_characters.sort((a, b) => b - a);
        }
        build_text() {
            if (!this.bb_escape_characters)
                return this.raw_text;
            let text = this.raw_text;
            for (const index of this.bb_escape_characters)
                text = text.substring(0, index) + text.substring(index + 1);
            return text;
        }
        build_bbcode() {
            return this.raw_text;
        }
        build_html() {
            return TextLayer.html_escaped(this.build_text());
        }
        static html_escaped(text) {
            if (typeof (document) !== "undefined" && 'createTextNode' in document) {
                const node_text = document.createTextNode(text);
                const node_p = document.createElement('p');
                node_p.appendChild(node_text);
                return node_p.innerHTML.replace(/\n/g, '<br>');
            }
            else {
                return text.replace(/[&<"' ]/g, function (m) {
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
    xbbcode.TextLayer = TextLayer;
    function parse_tag(text) {
        const assign_index = text.indexOf('=');
        const close = text.length > 0 && text[0] == '/';
        if (assign_index == -1)
            return {
                close: close,
                tag: text.substr(close ? 1 : 0),
                options: undefined
            };
        return {
            close: close,
            tag: text.substr(close ? 1 : 0, assign_index),
            options: text.substr(assign_index + 1)
        };
    }
    function fix_stack_strings(layer) {
        if (layer.content.length < 2)
            return layer;
        for (let index = 0; index < layer.content.length - 1; index++) {
            let left = layer.content[index];
            if (!(left instanceof TextLayer)) {
                if (left instanceof TagLayer && left.deductible_as_text())
                    left = (layer.content[index] = new TextLayer(left.deduct_as_text(), [], left.text_position));
                else
                    continue;
            }
            else if (left.bb_escape_characters) {
                continue; /* Text isn't plain. Contains escape characters */
            }
            let right = layer.content[index + 1];
            if (!(right instanceof TextLayer)) {
                if (right instanceof TagLayer && right.deductible_as_text())
                    right = (layer.content[index + 1] = new TextLayer(right.deduct_as_text(), [], right.text_position));
                else {
                    index++; /* if we shift it by one then right will be come left and we will still have a continue! */
                    continue;
                }
            }
            else if (right.bb_escape_characters) {
                continue; /* Text isn't plain. Contains escape characters */
            }
            left.raw_text += right.raw_text;
            left.text_position.end = right.text_position.end;
            layer.content.splice(index + 1, 1);
            index--;
        }
        return layer;
    }
    function build_black_white_list(stack, options) {
        let blacklist = options.tag_blacklist || [], whitelist = options.tag_whitelist;
        for (let index = 0; index < stack.length; index++) {
            const element = stack[index].parser;
            if (typeof (element) === "undefined")
                continue;
            if (typeof (element.content_tags_blacklist) !== "undefined") {
                for (const blacklist_entry of element.content_tags_blacklist) {
                    if (blacklist_entry.overridden_by) {
                        let flag_overridden = false;
                        for (let chk_index = index + 1; chk_index < stack.length; chk_index++) {
                            if (blacklist_entry.overridden_by.findIndex(e => e == stack[chk_index].tag_normalized) != -1) {
                                flag_overridden = true;
                                break;
                            }
                        }
                        if (flag_overridden)
                            continue;
                    }
                    blacklist.push(blacklist_entry.tag);
                }
            }
            if (typeof (element.content_tags_whitelist) !== "undefined") {
                if (typeof (whitelist) === "undefined")
                    whitelist = element.content_tags_whitelist;
                else {
                    whitelist = whitelist.filter(e => element.content_tags_whitelist.findIndex(c => c == e) != -1);
                }
            }
        }
        return {
            blacklist: blacklist,
            whitelist: whitelist,
            accept_tag: function (tag) {
                if (typeof (whitelist) !== "undefined" && this.whitelist.findIndex(e => e == tag) == -1)
                    return false;
                return this.blacklist.findIndex(e => e == tag) == -1;
            }
        };
    }
    function is_list_tag(tag) {
        return ['list', 'ordered-list', 'olist', 'unordered-list', 'ulist'].findIndex(e => e == tag) !== -1;
    }
    function parse_layers(text, options) {
        let black_whitelist;
        const stack = [];
        stack.back = function () {
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
        while (true) {
            base_index = index;
            /* find the open bracket */
            needle_index = index;
            while (true) {
                needle_index = text.indexOf('[', needle_index);
                if (needle_index > 0) {
                    escape_length = 0;
                    while (needle_index - escape_length > 0) {
                        if (text[needle_index - escape_length - 1] != '\\')
                            break;
                        escape_length++;
                    }
                    for (let index = 0; index < escape_length; index += 2)
                        escaped.push(needle_index - index - 1);
                    console.log(escape_length);
                    if (escape_length % 2 == 1) {
                        //Tag isn't escaped. The escape has been escaped
                        needle_index++;
                        continue;
                    }
                }
                break;
            }
            if (needle_index == -1) { /* no close bracket */
                /* get the last message */
                if (index < text.length)
                    stack.back().content.push(new TextLayer(text, escaped, index, text.length));
                break;
            }
            if (index != needle_index) {
                /* get the message before */
                stack.back().content.push(new TextLayer(text, escaped, index, needle_index));
                escaped = [];
                index = needle_index;
            }
            index = needle_index + 1; /* tag begin */
            needle_index = index;
            /* find the next close bracket for the open tag */
            while (true) {
                needle_index = text.indexOf(']', needle_index);
                if (needle_index > 0) {
                    escape_length = 0;
                    while (needle_index - escape_length > 0) {
                        if (text[needle_index - escape_length - 1] != '\\')
                            break;
                        escape_length++;
                    }
                    for (let index = 0; index < escape_length; index += 2)
                        escaped.push(needle_index - index - 1);
                    if (escape_length % 2 == 1) {
                        //Tag isn't escaped. The escape has been escaped
                        needle_index++;
                        continue;
                    }
                }
                break;
            }
            if (needle_index == -1) { /* no close bracket for close tag */
                /* get the last message */
                if (index < text.length)
                    stack.back().content.push(new TextLayer(text, escaped, index - 1, text.length));
                break;
            }
            const raw_tag = text.substring(index, needle_index);
            let ignore_tag = !raw_tag.match(patterns.tag) && raw_tag != "/";
            parse_tag: if (!ignore_tag) {
                const tag = parse_tag(raw_tag);
                const parser = register.find_parser(tag.tag.toLowerCase());
                if (tag.tag) {
                    /* we dont want to parse tags which we dont known */
                    if (!parser) {
                        ignore_tag = true;
                        break parse_tag;
                    }
                }
                black_white_check: if (!black_whitelist.accept_tag(tag.tag.toLowerCase())) {
                    /* this check is redundant to the upper check, but we will may make the upper check optional/configurable thats why this is def. required */
                    if (!parser) {
                        ignore_tag = true;
                        break parse_tag;
                    }
                    if (parser.ignore_black_whitelist && !options.enforce_back_whitelist)
                        break black_white_check;
                    /* test if this might be the close tag to the last open tag */
                    if (!(tag.close && (tag.tag.length == 0 || tag.tag.toLowerCase() == stack.back().tag_normalized))) {
                        ignore_tag = true;
                        break parse_tag;
                    }
                }
                console.log("Tag %o", tag);
                if (tag.close) {
                    const tag_normalized = tag.tag.toLowerCase();
                    let stack_index = stack.length;
                    while (--stack_index > 0) {
                        if (stack[stack_index].tag_normalized == tag_normalized || tag_normalized.length == 0) {
                            stack[stack_index].properly_closed = true;
                            stack[stack_index].text_position.end = needle_index + 1;
                            while (stack.length > stack_index) {
                                const pos = fix_stack_strings(stack.pop()).text_position;
                                if (pos.end == -1)
                                    pos.end = index - 1; /* we want the brace start as end of the last text! */
                            }
                            black_whitelist = build_black_white_list(stack, options);
                            break;
                        }
                        else if (tag_normalized == '*' && is_list_tag(stack[stack_index].tag_normalized)) /* fix double [/*] within inner lists changing outer behaviours */
                            break;
                    }
                    if (stack_index == 0) {
                        //TODO: Warn for invalid close
                        console.log("Invalid close!");
                        ignore_tag = true;
                    }
                }
                else {
                    const element = new TagLayer(tag.tag, parser, tag.options);
                    element.text_position = {
                        start: index - 1,
                        end: -1
                    };
                    if (element.tag_normalized == '*') { /* list entry tag */
                        /* search for the base list again and append list entry */
                        const cut_stack = [];
                        let stack_index = stack.length;
                        while (--stack_index > 0) {
                            if (is_list_tag(stack[stack_index].tag_normalized)) {
                                while (stack.length > stack_index + 1) /* we don't want to cut the list element itself! */
                                    cut_stack.unshift(fix_stack_strings(stack.pop()));
                                break;
                            }
                            else if (stack[stack_index].tag_normalized == '*' && stack[stack_index].properly_closed)
                                break;
                        }
                        if (stack_index == 0) {
                            console.log("Invalid list handle!");
                            //TODO: Warn for no valid list handle
                            ignore_tag = true;
                        }
                        else {
                            black_whitelist = build_black_white_list(stack, options);
                            /* set the last list tag as closed */
                            cut_stack.forEach(e => e.text_position.end = index - 1); /* we want the brace start as end of the last text! */
                            const elm = cut_stack.filter(e => e.tag_normalized == '*');
                            if (elm.length > 0)
                                elm[0].properly_closed = true;
                        }
                    }
                    if (!ignore_tag) {
                        stack.back().content.push(element);
                        if (!element.parser || !element.parser.instant_close) {
                            stack.push(element);
                            black_whitelist = build_black_white_list(stack, options);
                        }
                        else {
                            element.properly_closed = true;
                        }
                    }
                }
            }
            if (ignore_tag) {
                stack.back().content.push(new TextLayer(text, escaped, index - 1, needle_index + 1));
                escaped = [];
                index = needle_index + 1;
                continue;
            }
            index = needle_index + 1;
        }
        while (stack.length > 1)
            fix_stack_strings(stack.pop());
        return fix_stack_strings(stack[0]);
    }
    function print_stack(layer, prefix) {
        if (layer instanceof TagLayer) {
            prefix = prefix || "";
            console.log(prefix + "Tag: %s", layer.tag_normalized);
            console.log(prefix + "Closed: %o", layer.properly_closed);
            console.log(prefix + "Range: %d - %d", layer.text_position.start, layer.text_position.end);
            console.log(prefix + "Children: (%d)", layer.content.length);
            layer.content.forEach(e => print_stack(e, prefix + "  "));
        }
        else if (layer instanceof TextLayer) {
            console.log(prefix + "Range: %d - %d", layer.text_position.start, layer.text_position.end);
            console.log(prefix + "Raw Text: " + layer.raw_text);
        }
    }
    function parse(text, options) {
        const result = parse_layers(text, options);
        print_stack(result);
        return {
            root_tag: result,
            build_bbcode() {
                return result.content.map(e => e.build_bbcode()).join("");
            },
            build_html() {
                return result.content.map(e => e.build_html()).join("");
            },
            build_text() {
                return result.content.map(e => e.build_text()).join("");
            }
        };
    }
    xbbcode.parse = parse;
    function escape(text) {
        return text.replace(patterns.tag_escape, c => "\\" + c);
    }
    xbbcode.escape = escape;
})(xbbcode || (xbbcode = {}));
/* register all BBCode tags */
(function (xbbcode) {
    let tags;
    (function (tags) {
        function html_enclosed_tag(tag, html_tag, html_class) {
            return {
                tag: tag,
                build_html_tag_open(layer) {
                    return '<' + html_tag + ' class="xbbcode-tag xbbcode-tag-' + html_class + '">';
                },
                build_html_tag_close(layer) {
                    return '</' + html_tag + '>';
                }
            };
        }
        xbbcode.register.register_parser({
            tag: ['no-parse', 'noparse'],
            content_tags_whitelist: [],
            ignore_black_whitelist: true,
            build_html_tag_open(layer) {
                return '';
            },
            build_html_tag_close(layer) {
                return '';
            }
        });
        xbbcode.register.register_parser(html_enclosed_tag(['c', 'center'], 'span', 'center'));
        xbbcode.register.register_parser(html_enclosed_tag(['r', 'right'], 'span', 'right'));
        xbbcode.register.register_parser(html_enclosed_tag(['l', 'left'], 'span', 'left'));
        xbbcode.register.register_parser({
            tag: ['code', 'icode', 'i-code'],
            content_tags_whitelist: [],
            build_html_tag_open(layer) {
                const klass = layer.tag_normalized != 'code' ? "xbbcode-tag-inline-code" : "xbbcode-tag-code";
                return '<code class="xbbcode-tag ' + klass + '" x-code-type="' + (layer.options || "").replace("\"", "'") + '">';
            },
            build_html_tag_close(layer) {
                return '</code>';
            }
        });
        xbbcode.register.register_parser({
            tag: ['color', 'bg-color', 'bgcolor'],
            build_html_tag_open(layer) {
                let color;
                const options = layer.options || "black";
                xbbcode.patterns.color_name.lastIndex = 0;
                xbbcode.patterns.color_code.lastIndex = 0;
                if (!xbbcode.patterns.color_name.test(options)) {
                    if (!xbbcode.patterns.color_code.test(options))
                        color = "black";
                    else
                        color = options.startsWith('#') ? options : '#' + options;
                }
                else {
                    color = options;
                }
                color = color.replace("\"", "'");
                if (layer.tag_normalized == 'color')
                    return '<span class="xbbcode-tag xbbcode-tag-color" style="color: ' + color.toLowerCase() + '">';
                else
                    return '<div class="xbbcode-tag xbbcode-tag-bgcolor" style="background: ' + color.toLowerCase() + '">';
            },
            build_html_tag_close(layer) {
                if (layer.tag_normalized == 'color')
                    return '</span>';
                else
                    return '</div>';
            }
        });
        xbbcode.register.register_parser({
            tag: ['face', 'font'],
            build_html_tag_open(layer) {
                let font_code = layer.options || "inherit";
                xbbcode.patterns.font.lastIndex = 0;
                if (!xbbcode.patterns.font.test(font_code))
                    font_code = "inherit";
                font_code = font_code.replace(/"/g, "'");
                return '<span style="font-family:' + font_code + ';">';
            },
            build_html_tag_close(layer) {
                return '</span>';
            }
        });
        const size_mapping = ['50%', '70%', '80%', '90%', '100%', '120%', '140%', '160%', '180%'];
        xbbcode.register.register_parser({
            tag: ['size'],
            build_html_tag_open(layer) {
                if (layer.options.endsWith('px') || layer.options.endsWith('vp') || layer.options.endsWith('em') || layer.options.endsWith('rem') || layer.options.endsWith('%'))
                    return '<span class="xbbcode-tag xbbcode-tag-size" style="font-size: ' + layer.options.replace('"', "") + '">'; /* the replace should prevent code injection */
                let size = (parseInt(layer.options) || 5) - 1;
                size = size < 0 ? 0 : (size >= size_mapping.length ? size_mapping.length - 1 : size);
                return '<span class="xbbcode-tag xbbcode-tag-size" style="font-size: ' + size_mapping[size] + '">';
            },
            build_html_tag_close(layer) {
                return '</span>';
            }
        });
        xbbcode.register.register_parser(html_enclosed_tag(['b', 'bold', 'strong'], 'span', 'bold'));
        xbbcode.register.register_parser(html_enclosed_tag(['i', 'italic'], 'span', 'italic'));
        xbbcode.register.register_parser(html_enclosed_tag(['u', 'underlined'], 'span', 'underlined'));
        xbbcode.register.register_parser(html_enclosed_tag(['s', 'strikethrough'], 'span', 'strikethrough'));
        xbbcode.register.register_parser({
            tag: ['url'],
            build_html_tag_open(layer) {
                let target;
                if (!layer.options)
                    target = layer.content.map(e => e.build_text()).join("");
                else
                    target = layer.options;
                xbbcode.patterns.url.lastIndex = 0;
                if (!xbbcode.patterns.url.test(target))
                    target = '#';
                return '<a class="xbbcode-tag xbbcode-tag-url" href="' + target.replace("\"", "'") + '" target="_blank">';
            },
            build_html_tag_close(layer) {
                return '</a>';
            }
        });
        xbbcode.register.register_parser({
            tag: ['img'],
            build_html(layer) {
                let target;
                let content = layer.content.map(e => e.build_text()).join("");
                if (!layer.options) {
                    target = content;
                }
                else
                    target = layer.options;
                xbbcode.patterns.url.lastIndex = 0;
                if (!xbbcode.patterns.url.test(target))
                    target = '#';
                return '<img class="xbbcode-tag xbbcode-tag-url" src="' + target.replace("\"", "'") + '" title="' + xbbcode.TextLayer.html_escaped(content) + '"/>';
            }
        });
        //register.register_parser(html_enclosed_tag(['quote'], 'span', 'quote'));
        xbbcode.register.register_parser(html_enclosed_tag(['sub'], 'sub', 'sub'));
        xbbcode.register.register_parser(html_enclosed_tag(['sup'], 'sup', 'sup'));
        xbbcode.register.register_parser({
            tag: ['hr', 'br'],
            instant_close: true,
            build_text_tag_open(layer) {
                return '\n';
            },
            build_html(layer) {
                return '<' + layer.tag_normalized + '>';
            }
        });
        const list_mapping = {
            'list': 'ul',
            'ordered-list': 'ol',
            'olist': 'ol',
            'unordered-list': 'ul',
            'ulist': 'ul'
        };
        xbbcode.register.register_parser({
            tag: Object.keys(list_mapping),
            build_html_tag_open(layer) {
                return '<' + list_mapping[layer.tag_normalized] + ' class="xbbcode-tag xbbcode-tag-list">';
            },
            build_html_tag_close(layer) {
                return "</" + list_mapping[layer.tag_normalized] + ">";
            }
        });
        xbbcode.register.register_parser({
            tag: '*',
            build_html_tag_open(layer) {
                return '<li>';
            },
            build_html_tag_close(layer) {
                return '</li>';
            }
        });
        //TODO: Table ([table] & [td] [th] [tr])
    })(tags = xbbcode.tags || (xbbcode.tags = {}));
})(xbbcode || (xbbcode = {}));
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
//# sourceMappingURL=parser.js.map