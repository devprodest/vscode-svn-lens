import { execSync } from "child_process";
import { ExtensionContext, Uri, MarkdownString, workspace } from "vscode";
import { dataFormater } from "../extension";
import { xmlToObject } from '../utils';
import { repoInfo } from "./RepoInfo";


export { saveCommitInfo, loadCommitInfo, getCommitInfo };



type CommitInfo = {
    author: string,
    date: string,
    msg: string
};

let commitsInfo: Record<string, CommitInfo> = {};

const saveCommitInfo = (context: ExtensionContext) => context.globalState.update(repoInfo.uuid, commitsInfo);
const loadCommitInfo = (context: ExtensionContext) => commitsInfo = context.globalState.get(repoInfo.uuid) ?? {};


const makeComitInfoText = (rev: string, { author, date, msg }: CommitInfo): MarkdownString => {
    const space = "&nbsp;&nbsp;";
    const newline = `\n\n`;
    const separator = `${space}|${space}`;
    const line = `${newline}---${newline}`;

    const revisionInfo = `$(git-commit)${rev}`;
    const authorInfo = `$(account)${space}${author}`;
    const dateInfo = `${space}${date}`;

    const header = `${authorInfo},${dateInfo}${separator}${revisionInfo}${separator}[$(globe)](${repoInfo.url})`;

    return new MarkdownString(`[svn lens]${space}${header}${line}${msg}`, true);
};


const readCommitInfo = (rev: string, file: Uri) => {
    const rootPath = workspace.getWorkspaceFolder(file)?.uri.fsPath || ".";
    const filePath = workspace.asRelativePath(file, false);

    const logXML = execSync(`svn log -r ${rev} --xml "${filePath}"`, { cwd: rootPath }).toString();
    const result = xmlToObject<any>(logXML);

    const author = result.log.logentry?.author?._text ?? "";
    const date = dataFormater(result.log.logentry.date._text);
    const msg = result.log.logentry.msg._text;

    commitsInfo[rev] = { author, date, msg };
};


const getCommitInfo = (context: ExtensionContext, rev: string, file: Uri): MarkdownString => {

    if (commitsInfo[rev] === undefined) {
        console.log("read info", rev);
        readCommitInfo(rev, file);

        saveCommitInfo(context);
    }

    return makeComitInfoText(rev, commitsInfo[rev]);
};


