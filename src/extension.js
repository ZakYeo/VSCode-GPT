const vscode = require('vscode');
const { MyDataProvider } = require("./dataProvider");
const { generateComments, generateCode } = require("./openaiInteractions");


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('GPT-VSCode Extension Loaded.');

    let disposable = vscode.commands.registerCommand('gpt-vscode.openai.generateComments', async function () {
        await generateComments();
    });

    let disposableGenerateCode = vscode.commands.registerCommand('gpt-vscode.openai.generateCode', async function () {
        await generateCode();
    });

    let myDataProvider = new MyDataProvider();
    vscode.window.registerTreeDataProvider('myListView', myDataProvider);

    //let conversationCounter = context.globalState.get('conversationCounter', 1); // Use a default value of 1
    // load saved conversations from storage
    let savedConversations = context.globalState.get('conversations', []); // Use a default value of an empty array
    for (let conversation of savedConversations) {
        myDataProvider.addParent(conversation.label, vscode.TreeItemCollapsibleState.Expanded);
        for (let message of conversation.messages) {
            myDataProvider.addChild(conversation.label, message.text, vscode.TreeItemCollapsibleState.None, message.sender);
        }
    }


    let disposableNewConversation = vscode.commands.registerCommand('gpt-vscode.openai.addEntry', async function () {
        myDataProvider.createNewConversation(context);
    });

    let disposableSelectConversation = vscode.commands.registerCommand('gpt-vscode.openai.selectConversation', function (label) {
        myDataProvider.selectConversation(label);
    });

    let disposableChat = vscode.commands.registerCommand('gpt-vscode.openai.chatWithAI', async function () {
        myDataProvider.chatWithAI(context);
    });

    context.subscriptions.push(disposableNewConversation);
    context.subscriptions.push(disposableSelectConversation);
    context.subscriptions.push(disposableChat);
    context.subscriptions.push(disposable);
    context.subscriptions.push(disposableGenerateCode);
}


// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
}
