const vscode = require('vscode');
const { MyDataProvider } = require("./dataProvider");
const { generateComments, generateCode } = require("./openaiInteractions");

/**
 * @param {vscode.ExtensionContext} context
 * The method that gets called when your extension is activated
 * @description Activation function for the extension, responsible for registering commands and initializing the data provider.
 */
function activate(context) {
    console.log('GPT-VSCode Extension Loaded.');

    // Register command to generate comments using GPT
    let disposable = vscode.commands.registerCommand('gpt-vscode.openai.generateComments', async function () {
        await generateComments();
    });

    // Register command to generate code using GPT
    let disposableGenerateCode = vscode.commands.registerCommand('gpt-vscode.openai.generateCode', async function () {
        await generateCode();
    });

    // Initialize data provider and register it
    let myDataProvider = new MyDataProvider();
    vscode.window.registerTreeDataProvider('myListView', myDataProvider);

    // Load saved conversations from storage and populate them in the data provider
    let savedConversations = context.globalState.get('conversations', []); // Use a default value of an empty array
    for (let conversation of savedConversations) {
        myDataProvider.addParent(conversation.label, vscode.TreeItemCollapsibleState.Expanded);
        for (let message of conversation.messages) {
            myDataProvider.addChild(conversation.label, message.text, vscode.TreeItemCollapsibleState.None, message.sender);
        }
    }

    // Register command to create a new conversation
    let disposableNewConversation = vscode.commands.registerCommand('gpt-vscode.openai.addEntry', async function () {
        myDataProvider.createNewConversation(context);
    });

    // Register command to select an existing conversation
    let disposableSelectConversation = vscode.commands.registerCommand('gpt-vscode.openai.selectConversation', function (label) {
        myDataProvider.selectConversation(label);
    });

    // Register command to chat with AI
    let disposableChat = vscode.commands.registerCommand('gpt-vscode.openai.chatWithAI', async function () {
        myDataProvider.chatWithAI(context);
    });

    // Add the disposable commands to the context
    context.subscriptions.push(disposableNewConversation);
    context.subscriptions.push(disposableSelectConversation);
    context.subscriptions.push(disposableChat);
    context.subscriptions.push(disposable);
    context.subscriptions.push(disposableGenerateCode);
}

/**
 * The method that gets called when your extension is deactivated
 * @description Deactivation function for the extension. Add any necessary cleanup tasks here.
 */
function deactivate() {}

// Export the activate and deactivate functions so that they can be used by VS Code
module.exports = {
    activate,
    deactivate
}
