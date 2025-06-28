
import { Uri } from 'vscode';
import * as fs from "fs";


function fileExists(filePath: Uri): boolean {
    const filename = filePath.fsPath;

    if (fs.existsSync(filename)) {
        return true;
    }

	return false;
}

export { fileExists };
