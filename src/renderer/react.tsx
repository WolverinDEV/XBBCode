import * as React from "react";
import {Renderer} from "./base";
import TextRenderer from "./text";
import {Element, TagElement, TextElement} from "../elements";
import * as TagRegistry from "../registry";

const cssStyle = require("./react.scss");
const cssClassName = tag => "xbbcode-tag xbbcode-tag-" + tag + " " + cssStyle.tag;

const textRenderer = new TextRenderer();
const TagRenderer: {[key: string]: (tag: TagElement, renderContent: () => React.ReactNode[], renderer: ReactRenderer) => React.ReactNode} = {};

let reactKeyId = 0;
export default class ReactRenderer extends Renderer<React.ReactNode> {
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
            return TagRenderer[tag.tagType?.tag](tag, () => tag.content.map(e => this.doRender(e, depth + 1)), this);

        return <span key={++reactKeyId} className={cssClassName("text")}>&lt;!-- unknown tag {tag.tagType?.tag || tag.tag} --&gt;</span>;
    }

    private renderText(text: TextElement) : React.ReactNode {
        return this.renderAsText(text.text(), false);
    }

    renderAsText(element: Element | string, stripLeadingAnTailingEmptyLines: boolean) : React.ReactNode {
        const text = typeof element === "string" ? element : textRenderer.render(element);
        let lines = text.split("\n");

        if(lines.length > 1 && stripLeadingAnTailingEmptyLines) {
            if(lines[0].length === 0) {
                lines = lines.slice(1);
            }

            if(lines[lines.length - 1]?.length === 0) {
                lines = lines.slice(0, lines.length - 1);
            }
        }

        const children = [];
        for(let index = 0; index < lines.length; index++) {
            if(index > 0) {
                children.push(<br key={++reactKeyId} />);
            }

            if(lines[index].length > 0) {
                children.push(<React.Fragment key={++reactKeyId}>{lines[index]}</React.Fragment>);
            }
        }

        return children;
    }

    renderContentAsText(element: TagElement, stripLeadingAnTailingEmptyLines: boolean) : React.ReactNode {
        return this.renderAsText(textRenderer.renderContent(element).join(""), stripLeadingAnTailingEmptyLines);
    }
}
const RenderElement = (props: { element: Element, renderer: ReactRenderer }) => props.renderer.render(props.element) as any;

TagRenderer[undefined as any] = tag => {
    const openTag = "[" + tag.tag + (tag.options ? "=" + tag.options : "") + "]";
    if(tag.tagType?.instantClose)
        return openTag;

    return openTag + tag.content.map(this.renderDefault.bind(this)) + "[/" + tag.tag + "]";
};

TagRenderer["no-parse"] = (tag, _, renderer) => renderer.renderAsText(textRenderer.render(tag), true);

TagRenderer["center"] = (tag, renderContent) => <span key={++reactKeyId} className={cssClassName("center")}>{renderContent()}</span>;
TagRenderer["right"] = (tag, renderContent) => <span key={++reactKeyId} className={cssClassName("right")}>{renderContent()}</span>;
TagRenderer["left"] = (tag, renderContent) => <span key={++reactKeyId} className={cssClassName("left")}>{renderContent()}</span>;

TagRenderer["code"] = (tag, _, renderer) => <code key={++reactKeyId} className={cssClassName("code")} x-code-type={tag.options}>{renderer.renderAsText(textRenderer.render(tag), true)}</code>;
TagRenderer["i-code"] = (tag, _, renderer) => <code key={++reactKeyId} className={cssClassName("inline-code")} x-code-type={tag.options}>{renderer.renderAsText(textRenderer.render(tag), true)}</code>;

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

TagRenderer["br"] = () => <br key={++reactKeyId} className={cssClassName("br")} />;
TagRenderer["hr"] = () => <hr key={++reactKeyId} className={cssClassName("hr")} />;

TagRenderer["ordered-list"] = (tag, renderContent) => <ol key={++reactKeyId} className={cssClassName("list")} type={tag.options as any} >{renderContent()}</ol>;
TagRenderer["unordered-list"] = (tag, renderContent) => <ul key={++reactKeyId} className={cssClassName("list")} >{renderContent()}</ul>;
TagRenderer["li"] = (tag, renderContent) => <li key={++reactKeyId}>{renderContent()}</li>;

/* TODO: Table! */
const alignments = {
    "center": "center",
    "c": "center",

    "left": "left",
    "l": "left",

    "right": "right",
    "r": "right"
};

TagRenderer["table"] = (tag, _, renderer) => {
    const rowsTable = tag.content.filter(e => e instanceof TagElement && e.tagNormalized === "tr").map(e => e as TagElement);
    const rowHeader = rowsTable.find(e => e.content.find(e => e instanceof TagElement && e.tagNormalized === "th") !== undefined);
    const rowsBody = rowsTable.filter(e => e !== rowHeader);

    let renderedHeader = undefined;
    let renderedBody = [];
    if(rowHeader) {
        //Apply style from the header to the full column
        const columnStyles = rowHeader.content.filter(e => e instanceof TagElement).map(e => e as TagElement).map(e => {
            const style = e.options || "left";
            e.options = undefined;
            return style;
        });

        for(const row of rowsTable) {
            const columns = row.content.filter(e => e instanceof TagElement).map(e => e as TagElement);
            if(columns.length == 0) continue;
            if(columns[0].tagNormalized === "th") continue;

            columns.forEach((column, index) => {
                if(index < columnStyles.length)
                    column.options = column.options || columnStyles[index];
            });
        }

        const renderedRow = [];
        for(const column of rowHeader.content) {
            if(!(column instanceof TagElement))
                continue;

            renderedRow.push(<th key={++reactKeyId} style={{ textAlign: alignments[column.options] }}>{renderer.render(column)}</th>);
        }

        renderedHeader = <tr key={++reactKeyId}>{renderedRow}</tr>;
    }

    for(const bodyRow of rowsBody) {
        const renderedRow = [];
        for(const column of bodyRow.content) {
            if(!(column instanceof TagElement))
                continue;

            renderedRow.push(<td key={++reactKeyId} style={{ textAlign: alignments[column.options] }}>{renderer.render(column)}</td>);
        }

        renderedBody.push(<tr key={++reactKeyId}>{renderedRow}</tr>);
    }

    return <table key={++reactKeyId} className={cssClassName("table")}>
        {renderedHeader ? <thead key={++reactKeyId}>{renderedHeader}</thead> : undefined}
        <tbody key={++reactKeyId}>{renderedBody}</tbody>
    </table>;
};
TagRenderer["table-row"] = (tag, renderContent) => {
    const alignment = alignments[(tag.options || "").toLowerCase()];
    return <tr key={++reactKeyId} style={{ textAlign: alignment }}>{renderContent()}</tr>;
};

/* the container (th; tr; td) are already rendered */
TagRenderer["table-row"] = (tag, renderContent) => renderContent();
TagRenderer["table-head"] = (tag, renderContent) => renderContent();
TagRenderer["td"] = (tag, renderContent) => renderContent();

const patternYtVideoId = /^(?:http(?:s)?:\/\/)?(?:www\.)?(?:m\.)?(?:youtu\.be\/|youtube\.com\/(?:(?:watch)?\?(?:.*&)?v(?:i)?=|(?:embed|v|vi|user)\/))([^?&"'>]{10,11})$/;
TagRenderer["youtube"] = (tag, renderContent, renderer) => {
    const text = textRenderer.render(tag);
    const result = text.match(patternYtVideoId);
    if(!result || !result[1])
        return TagRenderer["url"](tag, renderContent, renderer);

    return <iframe key={++reactKeyId} className={cssClassName("video")} src={"https://www.youtube.com/embed/" + result[1]} frameBorder={0} allow="autoplay; encrypted-media" allowFullScreen={true} />;
};

TagRenderer["quote"] = (tag, renderContent) => {
    return <blockquote key={++reactKeyId} className={cssClassName("quote")}>
        {renderContent()}
    </blockquote>
};

/* some testing */
TagRegistry.Default.tags().forEach(tag => {
    if(!TagRenderer[tag.tag])
        console.warn("XBBCode missing React renderer for %s", tag.tag);
});