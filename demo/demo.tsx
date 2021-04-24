import * as ReactDOM from "react-dom";
import * as React from "react";
import {BBCodeElement, parseBBCode, renderer} from "xbbcode";

const input = document.getElementsByClassName("input")[0] as HTMLInputElement;
const output_bb = document.getElementsByClassName("output-bb")[0] as HTMLDivElement;
const output_text = document.getElementsByClassName("output-text")[0] as HTMLDivElement;
const output_html = document.getElementsByClassName("output-html")[0] as HTMLDivElement;

const rendererText = new renderer.TextRenderer();
const rendererBBCode = new renderer.BBCodeRenderer();
const rendererReact = new renderer.ReactRenderer();
const rendererHTML = new renderer.HTMLRenderer(rendererReact);

rendererReact.registerCustomRenderer(new class extends renderer.ElementRenderer<BBCodeElement, React.ReactNode> {
    tags(): string | string[] {
        return "bold";
    }

    render(element: BBCodeElement): React.ReactNode {
        return <b onClick={() => alert("Hello World")}>{rendererReact.renderContent(element)}</b>;
    }
});

input.onchange = () => {
    const text = input.value;
    localStorage.setItem("text", text);

    const timings = {
        begin: performance.now(),
        parsed: 0,
        renderedText: 0,
        renderedBBCode: 0,
        renderedReact: 0,
        renderedHTML: 0
    };

    const result = parseBBCode(text, {
        //tag_whitelist: ['b'],
        //enforce_back_whitelist: false,
        tag_blacklist: [],
        maxDepth: 10000000
        // verbose: true
    });
    timings.parsed = performance.now();

    output_text.innerText = result.map(rendererText.render.bind(rendererText)).join("");
    timings.renderedText = performance.now();

    output_bb.innerText = result.map(rendererBBCode.render.bind(rendererBBCode)).join("");
    timings.renderedBBCode = performance.now();

    /* since we're refreshing everything we can unmount the previous data (avoiding unnecessary comparisons) */
    ReactDOM.unmountComponentAtNode(output_html);
    ReactDOM.render(result.map(rendererReact.render.bind(rendererReact)) as React.ReactElement[], output_html);
    
    /* this is alternative B; This will parse the text by itself */
    //ReactDOM.render(<XBBCodeRenderer>{text}</XBBCodeRenderer>, output_html);
    timings.renderedReact = performance.now();

    console.log(result.map(rendererHTML.render.bind(rendererHTML)).join(""));
    timings.renderedHTML = performance.now();

    console.log("Updated output fields. Timings: {parse: %d, render: {text: %d, bb-code: %d, react: %d, html: %d}}",
        timings.parsed - timings.begin,
        timings.renderedText - timings.parsed,
        timings.renderedBBCode - timings.renderedText,
        timings.renderedReact - timings.renderedBBCode,
        timings.renderedHTML - timings.renderedReact);
};
input.onkeyup = input.onchange;

input.textContent = localStorage.getItem("text");
input.onkeyup(undefined);

export = {};