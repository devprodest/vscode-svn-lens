
import { execSync } from "child_process";
import * as vscode from 'vscode';
import { Color, ThemeColor, workspace, ExtensionContext, window } from 'vscode';

import * as dayjs from 'dayjs';
import * as localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);

let doc = "";
const svnBlameDecoration = window.createTextEditorDecorationType({});

let enabled: boolean | undefined;
let dateFormat: string;
let blameFormat: string;
let updateTimout: number;


const getBlameline = (line: string) => {
	const matchRegex: RegExp = RegExp(/ *(\d+) +(\w+) +(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{4} \(.*\d\)) +(.*)/g);
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



const blameExec = (path: string): string[] => {
	let blame: string[] = [];
	if (doc !== path) {
		try {
			doc = path;
			blame = execSync('svn blame -v ' + path).toString().split("\n");
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
	getConfig();

	let lines: string[] = [];

	workspace.onDidChangeConfiguration(ev => {
		getConfig();
	});

	let timeout: NodeJS.Timeout;

	window.onDidChangeActiveTextEditor(ev => {
		if (ev) {
			lines = blameExec(ev.document.uri.path);
		}
	});

	workspace.onDidChangeTextDocument(ev => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			doc = "";
			lines = blameExec(ev.document.uri.path);

		}, updateTimout);
	});

	window.onDidChangeTextEditorSelection(ev => {
		if (enabled) {

			const lightColor = new ThemeColor("svnlens.blameForegroundColor");
			const path = ev.textEditor.document.uri.path;

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
					range: new vscode.Range(
						new vscode.Position(line, 1024),
						new vscode.Position(line, 1024),
					),
				};
			})
			);
		}
	});


}

export function deactivate() { }
