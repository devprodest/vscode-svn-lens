
import { ThemeColor, workspace, ExtensionContext, window, commands, Range, Position, Uri, DecorationOptions } from 'vscode';
import { getCommitInfo } from "./helpers/CommitInfo";
import { blameLines, resetFileName, updateBlameInfo } from "./helpers/BlameInfo";



import * as localizedFormat from 'dayjs/plugin/localizedFormat';
import * as dayjs from 'dayjs';
dayjs.extend(localizedFormat);

export function dataFormater(date: string) {
    return dayjs(date).format(dateFormat);
}


const svnBlameDecoration = window.createTextEditorDecorationType({});

let dateFormat: string = "";
export let blameFormat: string = "";


const getConfig = () => {
    dateFormat = workspace.getConfiguration().get("svnlens.currentLine.dateFormat") ?? "ll";
    blameFormat = workspace.getConfiguration().get("svnlens.currentLine.format") ?? "${author}, ${date} • ⧟r${revision}";
};


export function activate(context: ExtensionContext) {
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

    window.onDidChangeActiveTextEditor(async (ev) => { if (ev) { updateBlameInfo(context, ev.document.uri); } });


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


    let timeout: NodeJS.Timeout;
    workspace.onDidChangeTextDocument(ev => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (!ev.document.isDirty) {
                resetFileName();
                updateBlameInfo(context, ev.document.uri);
            }
        }, 1000);
    });


    window.onDidChangeTextEditorSelection(async (ev) => {
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

            console.log(options);

            ev.textEditor.setDecorations(svnBlameDecoration, options);
        }
    });
}


export function deactivate() { }
