import * as React from "react";
import {Renderer} from "xbbcode/renderer/base";
import TextRenderer from "xbbcode/renderer/text";
import {Element, TagElement, TextElement} from "xbbcode/elements";
import * as TagRegistry from "xbbcode/registry";

const cssStyle = require("./react.scss");
const cssClassName = tag => "xbbcode-tag xbbcode-tag-" + tag + " " + cssStyle.tag;

const textRenderer = new TextRenderer();
const TagRenderer: {[key: string]: (tag: TagElement, renderContent: () => React.ReactNode[]) => React.ReactNode} = {};

let reactKeyId = 0;
export default class extends Renderer<React.ReactNode> {
    protected renderDefault(element: Element): React.ReactNode {
        return this.doRender(element, 0);
    };

    private doRender(element: Element, depth: number): React.ReactNode {
        if(depth > 16)
            return <RenderElement key={++reactKeyId} element={element} renderer={this} />;

        if(element instanceof TagElement)
            return this.renderTag(element, depth);
        else if(element instanceof TextElement)
            return this.renderText(element);

        return "<-- invalid node -->";
    };

    private renderTag(tag: TagElement, depth: number) : React.ReactNode {
        if(typeof TagRenderer[tag.tagType?.tag] === "function")
            return TagRenderer[tag.tagType?.tag](tag, () => tag.content.map(e => this.doRender(e, depth + 1)));

        return <span key={++reactKeyId} className={cssClassName("text")}>&lt;!-- unknown tag {tag.tagType?.tag || tag.tag} --&gt;</span>;
    }

    private renderText(text: TextElement) : React.ReactNode {
        const rawText = text.text();

        let lines = rawText.split("\n");
        if(lines.findIndex(e => e.length !== 0) === -1)
            return lines.slice(1).map(() => <br key={++reactKeyId} />);

        return <span key={++reactKeyId} className={cssClassName("text")} dangerouslySetInnerHTML={{ __html: textToHTMLContent(rawText, false) }} />;
    }
}

const textToHTMLContent = (tag: Element | string, stripEmptyLines: boolean) => {
    const rawText = typeof tag === "string" ? tag : textRenderer.render(tag);
    const saveText = rawText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    let lines = saveText.split("\n");

    /* in case of only new lines */
    if(lines.findIndex(e => e.length !== 0) === -1)
        return lines.join("<br/>");

    if(lines.length > 1 && stripEmptyLines) {
        if(lines[0].length === 0)
            lines = lines.slice(1);

        if(lines[lines.length - 1]?.length === 0)
            lines = lines.slice(0, lines.length - 1);
    }

    return lines.map(e => {
        /* replace start spaces */
        let startSpaceCount = 0;
        while(startSpaceCount < e.length && e.charAt(startSpaceCount) === ' ')
            startSpaceCount++;

        if(startSpaceCount === e.length)
            return "";

        let result = "";
        for(let i = 0; i < startSpaceCount; i++)
            result += "&nbsp;";

        return result + e.substr(startSpaceCount);
    }).join("<br/>");
};

const RenderElement = (props: { element: Element, renderer: Renderer<React.ReactNode> }) => props.renderer.render(props.element) as any;

TagRenderer[undefined as any] = tag => {
    const openTag = "[" + tag.tag + (tag.options ? "=" + tag.options : "") + "]";
    if(tag.tagType?.instantClose)
        return openTag;

    return openTag + tag.content.map(this.renderDefault.bind(this)) + "[/" + tag.tag + "]";
};

TagRenderer["no-parse"] = tag => <span key={++reactKeyId} dangerouslySetInnerHTML={{ __html: textToHTMLContent(tag, true) }} />;

TagRenderer["center"] = (tag, renderContent) => <span key={++reactKeyId} className={cssClassName("center")}>{renderContent()}</span>;
TagRenderer["right"] = (tag, renderContent) => <span key={++reactKeyId} className={cssClassName("right")}>{renderContent()}</span>;
TagRenderer["left"] = (tag, renderContent) => <span key={++reactKeyId} className={cssClassName("left")}>{renderContent()}</span>;

TagRenderer["code"] = tag => <code key={++reactKeyId} className={cssClassName("code")} x-code-type={tag.options} dangerouslySetInnerHTML={{ __html: textToHTMLContent(tag, true) }} />;
TagRenderer["i-code"] = tag => <code key={++reactKeyId} className={cssClassName("inline-code")} x-code-type={tag.options} dangerouslySetInnerHTML={{ __html: textToHTMLContent(tag, true) }} />;

const regexColorName = /^(?:aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)$/g;
const regexColorValue = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{8})$/g;

const renderColorContainer = (tag, renderContent, styleProperty, className) => {
    let color;
    const options = tag.options || "black";

    regexColorName.lastIndex = 0;
    regexColorValue.lastIndex = 0;
    if(!regexColorName.test(options)) {
        if(!regexColorValue.test(options))
            color = "black";
        else
            color = options.startsWith('#') ? options : '#' + options;
    } else {
        color = options;
    }

    let style = {};
    style[styleProperty] = color;
    return <div key={++reactKeyId} className={cssClassName(className)} style={style}>{renderContent()}</div>;
};

TagRenderer["color"] = (tag, renderContent) => renderColorContainer(tag, renderContent, "color", "color");
TagRenderer["bg-color"] = (tag, renderContent) => renderColorContainer(tag, renderContent, "background", "bg-color");

const regexFont = /^([a-z][a-z0-9_]+|"[a-z][a-z0-9_\s]+")(, ?[a-z0-9\\-]+)*$/gi;
TagRenderer["font"] = (tag, renderContent) => {
    let font = tag.options || "inherit";

    regexFont.lastIndex = 0;
    if (!regexFont.test(font))
        font = "inherit";

    return <span key={++reactKeyId} style={{ fontFamily: font }}>{renderContent()}</span>;
};

const fontSizeMapping = ['50%', '70%', '80%', '90%', '100%', '120%', '140%', '160%', '180%'];
TagRenderer["size"] = (tag, renderContent) => {
    if(tag.options.endsWith('px') || tag.options.endsWith('vp') || tag.options.endsWith('em') || tag.options.endsWith('rem') || tag.options.endsWith('%'))
        return <span key={++reactKeyId} className={cssClassName("size")} style={{ fontSize: tag.options }}>{renderContent()}</span>;

    let size = (parseInt(tag.options) || 5) - 1;
    size = size < 0 ? 0 : (size >= fontSizeMapping.length ? fontSizeMapping.length - 1 : size);
    return <span key={++reactKeyId} className={cssClassName("size")} style={{ fontSize: fontSizeMapping[size] }}>{renderContent()}</span>;
};

TagRenderer["bold"] = (tag, renderContent) => <span key={++reactKeyId} className={cssClassName("bold")}>{renderContent()}</span>;
TagRenderer["italic"] = (tag, renderContent) => <span key={++reactKeyId} className={cssClassName("italic")}>{renderContent()}</span>;
TagRenderer["underlined"] = (tag, renderContent) => <span key={++reactKeyId} className={cssClassName("underlined")}>{renderContent()}</span>;
TagRenderer["strikethrough"] = (tag, renderContent) => <span key={++reactKeyId} className={cssClassName("strikethrough")}>{renderContent()}</span>;

const regexUrl = /^(?:[a-zA-Z]{1,16}):(?:\/{1,3}|\\)[-a-zA-Z0-9:;,@#%&()~_?+=\/\\.]*$/g;
TagRenderer["url"] = (tag, renderContent) => {
    let target;
    if (!tag.options)
        target = textRenderer.render(tag);
    else
        target = tag.options;

    regexUrl.lastIndex = 0;
    if (!regexUrl.test(target))
        target = '#';

    return <a key={++reactKeyId} className={cssClassName("url")} href={target} target={"_blank"}>{renderContent()}</a>;
};

const regexImage = /^(?:https?):(?:\/{1,3}|\\)[-a-zA-Z0-9:;,@#%&()~_?+=\/\\.]*$/g;
TagRenderer["img"] = (tag) => {
    let target;
    let content = textRenderer.render(tag);
    if (!tag.options) {
        target = content;
    } else
        target = tag.options;

    regexImage.lastIndex = 0;
    if (!regexImage.test(target))
        target = '#';

    return <img key={++reactKeyId} className={cssClassName("img")} src={target} title={content} alt={target} />;
};

TagRenderer["sub"] = (tag, renderContent) => <sub key={++reactKeyId} className={cssClassName("sub")}>{renderContent()}</sub>;
TagRenderer["sup"] = (tag, renderContent) => <sup key={++reactKeyId} className={cssClassName("sup")}>{renderContent()}</sup>;

TagRenderer["br"] = () => <br key={++reactKeyId} />;
TagRenderer["hr"] = () => <hr key={++reactKeyId} />;

TagRenderer["ordered-list"] = (tag, renderContent) => <ol key={++reactKeyId} className={cssClassName("list")} type={tag.options as any} >{renderContent()}</ol>;
TagRenderer["unordered-list"] = (tag, renderContent) => <ul key={++reactKeyId} className={cssClassName("list")} >{renderContent()}</ul>;
TagRenderer["li"] = (tag, renderContent) => <li key={++reactKeyId}>{renderContent()}</li>;

/* TODO: Table! */

const patternYtVideoId = /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|youtube\.com\/(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed|v|vi|user)\/))([^?&"'>]{10,11})$/;
TagRenderer["youtube"] = (tag, renderContent) => {
    const text = textRenderer.render(tag);
    const result = text.match(patternYtVideoId);
    if(!result || !result[1])
        return TagRenderer["url"](tag, renderContent);

    return <iframe key={++reactKeyId} className={cssClassName("video")} src={"https://www.youtube.com/embed/" + result[1]} frameBorder={0} allow="autoplay; encrypted-media" allowFullScreen={true} />;
};

/* some testing */
TagRegistry.Default.tags().forEach(tag => {
    if(!TagRenderer[tag.tag])
        console.warn("XBBCode missing React renderer for %s", tag.tag);
});