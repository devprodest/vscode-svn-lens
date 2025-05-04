import { execSync } from "child_process";
import { ExtensionContext, Uri, workspace } from "vscode";
import { dataFormater as dataFormatter, blameFormat } from "../extension";
import { xmlToObject } from '../utils';
import { updateRepoInfo } from "./RepoInfo";

export { blameLines, updateBlameInfo };


type BlameXMLInfo = {
    _attributes: { "line-number": string; };
    commit: {
        _attributes: { revision: string; };
        author: { _text: string; };
        date: { _text: string; };
    };
};

type BlameInfo = {
    author: string,
    date: string,
    revision: string,
    nline: string
    text: string,
};


let blameLines: BlameInfo[] = [];


const updateBlameInfo = (context: ExtensionContext, file: Uri) => {
    const rootPath = workspace.getWorkspaceFolder(file)?.uri.fsPath || ".";
    const filePath = workspace.asRelativePath(file, false);

    console.log("file", filePath);

    updateRepoInfo(filePath, rootPath, context);

    try {

        const blameXML = execSync(`svn blame --xml "${filePath}"`, { cwd: rootPath }).toString();
        const entry: BlameXMLInfo[] = xmlToObject<any>(blameXML).blame.target.entry;

        console.log("blame lines", entry);

        blameLines = entry.map(x => {

            const date = dataFormatter(x.commit.date._text);
            const author = x.commit.author._text;

            return {
                author,
                date,
                revision: x.commit._attributes.revision,
                nline: x._attributes["line-number"],
                text: blameFormat
                    .replace(/(\$\{\s*author\s*\})/, author)
                    .replace(/(\$\{\s*date\s*\})/, date)
                    .replace(/(\$\{\s*revision\s*\})/, x.commit._attributes.revision),
            };
        });
    }
    catch (error: Error | any) { console.error(error); }

};


