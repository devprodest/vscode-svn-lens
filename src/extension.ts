
import { ThemeColor, workspace, ExtensionContext, window, commands, Range, Position, Uri, DecorationOptions } from 'vscode';
import { getCommitInfo } from "./helpers/CommitInfo";
import { blameLines, resetFileName, setBlameFormat, updateBlameInfo } from "./helpers/BlameInfo";

import { fileExists } from './helpers/FShelper';
import * as logger from "./helpers/logger";



const svnBlameDecoration = window.createTextEditorDecorationType({});

const getConfig = () => {
    const dateFormat = workspace.getConfiguration().get<string>("svnlens.currentLine.dateFormat");
    const textFormat = workspace.getConfiguration().get<string>("svnlens.currentLine.format");

    setBlameFormat(textFormat, dateFormat);
};


export function activate(context: ExtensionContext) {
    logger.activateLogger(context, 'SVN Lens');
    getConfig();

    /** */

    const updateBlame = commands.registerCommand('svnlens.updateBlame', async () => {
        if (window.activeTextEditor) {
            updateBlameInfo(context, window.activeTextEditor.document.uri);
        }
    });
    context.subscriptions.push(updateBlame);

    /** */

    workspace.onDidChangeConfiguration(() => getConfig());

    const decoratorPrepare = (nline: number, path: Uri, color: ThemeColor): DecorationOptions => {
        return {
            renderOptions: {
                after: {
                    contentText: blameLines[nline].text,
                    margin: "2rem",
                },
                light: { after: { color: color } },
                dark: { after: { color: color } }
            },
            hoverMessage: getCommitInfo(context, blameLines[nline].revision, path),
            range: new Range(
                new Position(nline, Number.MAX_VALUE),
                new Position(nline, Number.MAX_VALUE),
            ),
        };
    };

    window.onDidChangeActiveTextEditor(async (ev) => {
        if (ev && fileExists(ev.document.uri)) {
            logger.log("active editor", ev.document.uri.fsPath);
            updateBlameInfo(context, ev.document.uri);
        }
    });

    let timeout: NodeJS.Timeout;
    workspace.onDidChangeTextDocument(ev => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (fileExists(ev.document.uri) && !ev.document.isDirty) {
                resetFileName();
                updateBlameInfo(context, ev.document.uri);
            }
        }, 1000);
    });

    window.onDidChangeTextEditorSelection(async (ev) => {
        if (!fileExists(ev.textEditor.document.uri)) {
            return;
        }

        if (ev.textEditor.document.isDirty) {
            ev.textEditor.setDecorations(svnBlameDecoration, []);
            return;
        }

        const path = ev.textEditor.document.uri;

        if (blameLines.length === 0) {
            updateBlameInfo(context, path);
        }

        if (blameLines.length > 0) {
            const lightColor = new ThemeColor("svnlens.blameForegroundColor");


            const options = ev.textEditor.selections.map((x) => {
                const lineNumber = x.active.line;
                return decoratorPrepare(lineNumber, path, lightColor)
            }) ?? [];


            // const info = blameLines.map((x) : DecorationOptions => {

            //     const color = new ThemeColor("vscode.sideBar-background");

            //     return {
            //         renderOptions: {
            //             before: {
            //                 contentText: x.text,
            //                 margin: "2rem",
            //                 width: "300px",
            //                 border: "solid 2px"
            //             },
            //             light: { after: { color: color } },
            //             dark: { after: { color: color } }
            //         },
            //         hoverMessage: getCommitInfo(context, x.revision, path),
            //         range: new Range(
            //             new Position(x.nline, 0),
            //             new Position(x.nline, 0),
            //         ),
            //     }
            // }) ?? [];





            ev.textEditor.setDecorations(svnBlameDecoration, [...options]);
        }
    });
}


export function deactivate() { }
