import { execSync } from "child_process";
import { ExtensionContext, Uri, workspace } from "vscode";
import { xmlToObject } from '../utils';
import { updateRepoInfo } from "./RepoInfo";
import { fileExists } from "./FShelper";
import * as logger from "./logger";
import * as localizedFormat from 'dayjs/plugin/localizedFormat';
import * as dayjs from 'dayjs';

export { blameLines, updateBlameInfo, resetFileName, resetBlameInfo, setBlameFormat, dataFormatter };


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
    nline: number
    text: string,
};


let dateFormat: string = "";
let blameFormat: string = "";
let blameLines: BlameInfo[] = [];
let fileName: string = "";


dayjs.extend(localizedFormat);


const dataFormatter = (date: string): string => dayjs(date).format(dateFormat);


const setBlameFormat = (text: string | undefined, date: string | undefined) => {
    dateFormat = date ?? "ll";
    blameFormat = text ?? "${author}, ${date} • ⧟r${revision}";
}


const resetFileName = () => fileName = "";


const resetBlameInfo = () => {
    blameLines = [];
    resetFileName();
    logger.log("Blame info reset");
};


const updateBlameInfo = (context: ExtensionContext, file: Uri) => {
    const filePath = workspace.asRelativePath(file, false);

    if (!fileExists(file)) {
        resetBlameInfo();
        return
    }

    if (filePath !== fileName) {
        fileName = filePath;

        logger.log("file", filePath);

        const rootPath = workspace.getWorkspaceFolder(file)?.uri.fsPath || ".";
        updateRepoInfo(filePath, rootPath, context);

        try {

            const blameXML = execSync(`svn blame --xml "${filePath}"`, { cwd: rootPath }).toString();
            const entry: BlameXMLInfo[] = xmlToObject<any>(blameXML)?.blame?.target?.entry ?? [];

            blameLines = entry.map(x => {

                if (x.commit === undefined) return { text: "Uncommitted changes" } as BlameInfo;

                const date = dataFormatter(x.commit.date._text);
                const author = x.commit.author._text;

                return {
                    author,
                    date,
                    revision: x.commit._attributes.revision,
                    nline: +x._attributes["line-number"],
                    text: blameFormat
                        .replace(/(\$\{\s*author\s*\})/, author)
                        .replace(/(\$\{\s*date\s*\})/, date)
                        .replace(/(\$\{\s*revision\s*\})/, x.commit._attributes.revision),
                };
            });

            blameLines.push({
                text: "Last empty line is missing from blame",
            } as BlameInfo);
        }
        catch (error: Error | any) {
            resetBlameInfo();
            logger.error(error);
        }
    }
};


