import * as React from "react";
import {Options, parse} from "./parser";
import ReactRenderer from "./renderer/react";

const defaultRenderer = new ReactRenderer();

export function XBBCodeRenderer(props: { children: string, options?: Options, renderer?: ReactRenderer }): React.ReactElement;
export function XBBCodeRenderer(props: { text: string, children: never, options?: Options, renderer?: ReactRenderer }): React.ReactElement;

export function XBBCodeRenderer(props: { text?: string, children: string | never, options?: Options, renderer?: ReactRenderer }) {
    try {
        const elements = parse(props.text || props.children, props.options);
        return <>{elements.map(e => (props.renderer || defaultRenderer).render(e))}</>;
    } catch (error) {
        return <>{error}</>
    }
}