
import { ThemeColor, workspace, ExtensionContext, window, commands, Range, Position, Uri, DecorationOptions } from 'vscode';
import { getCommitInfo } from "./helpers/CommitInfo";
import { blameLines, updateBlameInfo } from "./helpers/BlameInfo";



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


    const decoratorPrepare = (nline: number, path: Uri, color: ThemeColor) : DecorationOptions => {

        if(blameLines[nline] === undefined ) return {} as DecorationOptions;

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

            ev.textEditor.setDecorations(
                svnBlameDecoration,
                ev?.selections.map((x) => decoratorPrepare(x.active.line, path, lightColor))
            );
        }
    });
}


export function deactivate() { }
