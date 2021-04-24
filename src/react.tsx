import * as React from "react";
import {Options, parse} from "./parser";
import ReactRenderer from "./renderer/react";

let fragmentKeyIndexes = 0;
const defaultRenderer = new ReactRenderer();

export function XBBCodeRenderer(props: { children: string, options?: Options, renderer?: ReactRenderer }): React.ReactElement;
export function XBBCodeRenderer(props: { text: string, children: never, options?: Options, renderer?: ReactRenderer }): React.ReactElement;
export function XBBCodeRenderer(props: { text?: string, children: string | never, options?: Options, renderer?: ReactRenderer }) {
    try {
        const elements = parse(props.text || props.children, props.options);
        return (
            <React.Fragment key={"success"}>
                {
                    elements.map(e => (
                        <React.Fragment key={++fragmentKeyIndexes}>
                            {(props.renderer || defaultRenderer).render(e)}
                        </React.Fragment>
                    ))
                }
            </React.Fragment>
        );
    } catch (error) {
        return <React.Fragment key={"error"}>{error}</React.Fragment>
    }
}