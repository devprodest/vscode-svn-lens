import { ExtensionContext, LogOutputChannel, window } from 'vscode';


let logChannel: LogOutputChannel;


export { activateLogger, log, error };



const activateLogger = (context: ExtensionContext, logChannelName: string) => {
    logChannel = window.createOutputChannel(logChannelName, { log: true });
    context.subscriptions.push(logChannel);
}

const log = (message: string, ...args: any[]) => {
    if (logChannel) {
        logChannel.appendLine(message);
        if (args.length > 0) {
            logChannel.appendLine(`Args: ${JSON.stringify(args)}`);
        }
    } else {
        console.log(message, ...args);
    }
}

const error = (message: string, ...args: any[]) => {
    if (logChannel) {
        logChannel.appendLine(`Error: ${message}`);
        if (args.length > 0) {
            logChannel.appendLine(`Args: ${JSON.stringify(args)}`);
        }
    } else {
        console.error(message, ...args);
    }
}
