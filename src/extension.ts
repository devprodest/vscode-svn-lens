
import { execSync } from "child_process";
import { ThemeColor, workspace, ExtensionContext, window, Uri, commands, Range, Position } from 'vscode';
import * as dayjs from 'dayjs';
import * as localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);


const svnBlameDecoration = window.createTextEditorDecorationType({});
let doc = "";

let enabled: boolean | undefined;
let dateFormat: string;
let blameFormat: string;
let updateTimout: number;


const getBlameline = (line: string) => {
	const matchRegex: RegExp = RegExp(/ *(\d+) +([\.\w]+) +(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{4} \(.*\d\)) +(.*)/g);
	const defMatch = line.matchAll(matchRegex).next().value;

	if (defMatch) {
		const revision = defMatch[1];
		const author = defMatch[2];
		const date = dayjs(defMatch[3]).format(dateFormat);

		return blameFormat
			.replace(/(\$\{\s*author\s*\})/, author)
			.replace(/(\$\{\s*date\s*\})/, date)
			.replace(/(\$\{\s*revision\s*\})/, revision);
	}
	return "Unposted change";
};



const blameExec = (file: Uri): string[] => {
	let blame: string[] = [];
	if (doc !== file.fsPath) {
		try {
			const rootPath = workspace.getWorkspaceFolder(file)?.uri.fsPath || ".";
			doc = file.fsPath;

			blame = execSync('svn blame -v ' + workspace.asRelativePath(file, false), { cwd: rootPath }).toString().split("\n");
		}
		catch (error) {
		}
	}
	return blame.map(x => getBlameline(x));
};

const getConfig = () => {
	enabled = workspace.getConfiguration().get("svnlens.currentLine.enabled");
	dateFormat = workspace.getConfiguration().get("svnlens.currentLine.dateFormat") ?? "ll";
	blameFormat = workspace.getConfiguration().get("svnlens.currentLine.format") ?? "${author}, ${date} • ⧟r${revision}";
	updateTimout = workspace.getConfiguration().get("svnlens.currentLine.updateTimout") ?? 1000;
};


export function activate(context: ExtensionContext) {
	let lines: string[] = [];

	getConfig();

	/** */

	const command = 'svnlens.updateBlame';
	const updateBlame = commands.registerCommand(command, async () => {
		if (window.activeTextEditor) {
			lines = blameExec(window.activeTextEditor.document.uri);
		}
	});
	context.subscriptions.push(updateBlame);

	/** */

	workspace.onDidChangeConfiguration(ev => {
		getConfig();
	});


	window.onDidChangeActiveTextEditor(ev => {
		if (ev) {
			lines = blameExec(ev.document.uri);
		}
	});


	let timeout: NodeJS.Timeout;
	workspace.onDidChangeTextDocument(ev => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			doc = "";
			lines = blameExec(ev.document.uri);

		}, updateTimout);
	});

	window.onDidChangeTextEditorSelection(ev => {
		if (enabled) {
			if (ev.textEditor.document.isDirty) {
				ev.textEditor.setDecorations(svnBlameDecoration, []);
				return;
			}

			const lightColor = new ThemeColor("svnlens.blameForegroundColor");
			const path = ev.textEditor.document.uri;

			if (lines.length === 0) {
				lines = blameExec(path);
			}


			ev.textEditor.setDecorations(svnBlameDecoration, ev?.selections.map(x => {
				const line = x.active.line;
				return {
					renderOptions: {
						after: {
							contentText: lines[line],
							margin: "2rem",
						},
						light: { after: { color: lightColor } },
						dark: { after: { color: lightColor } }
					},
					range: new Range(
						new Position(line, 1024),
						new Position(line, 1024),
					),
				};
			})
			);
		}
	});
}

export function deactivate() { }
