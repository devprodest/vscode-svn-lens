
import { Uri } from 'vscode';
import { existsSync } from "fs";


const fileExists = (filePath: Uri): boolean => {
    const filename = filePath.fsPath;

    if (existsSync(filename)) {
        return true;
    }

    return false;
}

export { fileExists };
