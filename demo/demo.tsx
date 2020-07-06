import * as ReactDOM from "react-dom";
import * as React from "react";

import { parse as parseBBCode } from "xbbcode/parser";

import TextRenderer from "xbbcode/renderer/text";
import BBCodeRenderer from "xbbcode/renderer/bbcode";
import ReactRenderer from "xbbcode/renderer/react";

import {XBBCodeRenderer} from "xbbcode/react";

const input = document.getElementsByClassName("input")[0] as HTMLInputElement;
const output_bb = document.getElementsByClassName("output-bb")[0] as HTMLDivElement;
const output_text = document.getElementsByClassName("output-text")[0] as HTMLDivElement;
const output_html = document.getElementsByClassName("output-html")[0] as HTMLDivElement;

const rendererText = new TextRenderer();
const rendererBBCode = new BBCodeRenderer();
const rendererReact = new ReactRenderer();

input.onchange = () => {
    const text = input.value;
    localStorage.setItem("text", text);

    const timings = {
        begin: performance.now(),
        parsed: 0,
        renderedText: 0,
        renderedBBCode: 0,
        renderedReact: 0
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

    console.log("Updated output fields. Timings: {parse: %d, render: {text: %d, bb-code: %d, react: %d}}",
        timings.parsed - timings.begin,
        timings.renderedText - timings.parsed,
        timings.renderedBBCode - timings.renderedText,
        timings.renderedReact - timings.renderedBBCode);
};
input.onkeyup = input.onchange;

input.textContent = localStorage.getItem("text");
input.onkeyup(undefined);