import { execSync } from "child_process";
import { ExtensionContext } from "vscode";
import { loadCommitInfo } from "./CommitInfo";
import { xmlToObject } from '../utils';
import * as logger from "./logger";

export { updateRepoInfo, resetRepoInfo, repoInfo };


type RepoInfoType = {
    url: string,
    uuid: string,
};


const repoInfo: RepoInfoType = { url: "", uuid: "" };

const resetRepoInfo = () => {
    repoInfo.url = "";
    repoInfo.uuid = "";
}

const updateRepoInfo = (filePath: string, rootPath: string, context: ExtensionContext) => {
    try {
        const infoXML = execSync(`svn info --xml "${filePath}"`, { cwd: rootPath }).toString();
        const result = xmlToObject<any>(infoXML);

        repoInfo.url = result.info.entry.url._text;
        repoInfo.uuid = result.info.entry.repository.uuid._text;

        logger.log("repo info", repoInfo);

        loadCommitInfo(context);
    }
    catch (error: Error | any) {
        resetRepoInfo();
        logger.error(error);
    }
}



