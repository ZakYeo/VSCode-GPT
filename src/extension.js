const vscode = require('vscode');
const { Configuration, OpenAIApi } = require("openai");
const path = require('path');


const configuration = new Configuration({
    apiKey: vscode.workspace.getConfiguration('gptvscode').get('openaiApiKey')
});

const openai = new OpenAIApi(configuration);

let isRunning = false;

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

    let conversationCounter = context.globalState.get('conversationCounter', 1); // Use a default value of 1
    // load saved conversations from storage
    let savedConversations = context.globalState.get('conversations', []); // Use a default value of an empty array
    for (let conversation of savedConversations) {
        myDataProvider.addParent(conversation.label, vscode.TreeItemCollapsibleState.Expanded);
        for (let message of conversation.messages) {
            myDataProvider.addChild(conversation.label, message.text, vscode.TreeItemCollapsibleState.None, message.sender);
        }
    }


    let disposableNewConversation = vscode.commands.registerCommand('gpt-vscode.openai.addEntry', async function () {
        let newChatLabel = "Chat " + conversationCounter++;
        myDataProvider.addParent(newChatLabel, vscode.TreeItemCollapsibleState.Expanded);
        myDataProvider.currentConversation = newChatLabel;
        context.globalState.update('conversationCounter', conversationCounter);
    });

    let disposableSelectConversation = vscode.commands.registerCommand('gpt-vscode.openai.selectConversation', function (label) {
        myDataProvider.currentConversation = label;
    });

    let disposableChat = vscode.commands.registerCommand('gpt-vscode.openai.chatWithAI', async function () {
    let selectedChat = myDataProvider.currentConversation;

    if (!selectedChat) {
        const chatOptions = myDataProvider.data.map(node => node.label);
        selectedChat = await vscode.window.showQuickPick(chatOptions, { placeHolder: 'Select a chat to interact with' });
    }

    if (selectedChat) {
        const prompt = await vscode.window.showInputBox({ prompt: 'Enter your message' });
        if (prompt) {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Contacting OpenAI...",
                cancellable: false
            }, async () => {
                const aiResponse = await interactWithOpenAI(prompt);

                myDataProvider.addChild(selectedChat, prompt, vscode.TreeItemCollapsibleState.None, "User");
                myDataProvider.addChild(selectedChat, aiResponse, vscode.TreeItemCollapsibleState.None, "AI");
                myDataProvider.refresh();

                // Save the conversation to local storage
                let conversationIndex = savedConversations.findIndex((conversation) => conversation.label === selectedChat);
                if (conversationIndex === -1) {
                    // The conversation doesn't exist yet, so create it
                    savedConversations.push({ label: selectedChat, messages: [{ sender: 'User', text: prompt }, { sender: 'AI', text: aiResponse }] });
                } else {
                    // The conversation already exists, so update it
                    savedConversations[conversationIndex].messages.push({ sender: 'User', text: prompt });
                    savedConversations[conversationIndex].messages.push({ sender: 'AI', text: aiResponse });
                }
                await context.globalState.update('conversations', savedConversations);

                vscode.window.showInformationMessage(`Message added to ${selectedChat}`);
            });
        }
    }
    });

    context.subscriptions.push(disposableNewConversation);
    context.subscriptions.push(disposableSelectConversation);
    context.subscriptions.push(disposableChat);
    context.subscriptions.push(disposable);
    context.subscriptions.push(disposableGenerateCode);
}

class MyTreeItem extends vscode.TreeItem {
    constructor(label, iconPath, collapsibleState) {
        super(label, collapsibleState);
        this.iconPath = iconPath;
        this.children = [];
    }
}

class MyDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.data = [];
        this.currentConversation = null;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }
    

    addMessage(sender, message) {
        let iconPath;
        if (sender === 'AI') {
            iconPath = {
                light: path.join(__filename, '..', '..', 'resources', 'ai.svg'),
                dark: path.join(__filename, '..', '..', 'resources', 'ai.svg')
            };
        } else {
            iconPath = {
                light: path.join(__filename, '..', '..', 'resources', 'user.svg'),
                dark: path.join(__filename, '..', '..', 'resources', 'user.svg')
            };
        }

        this.data.push(new MyTreeItem(`${sender}: ${message}`, iconPath));
        this.refresh();
    }

    getTreeItem(element) {
        element.command = {
            command: 'gpt-vscode.openai.selectConversation',
            title: "Select Conversation",
            arguments: [element.label]
        };
        return element;
    }

    getChildren(element) {
        if (element) {
            return element.children;
        } else {
            return this.data;
        }
    }

    getIconPath(sender) {
        return {
            light: path.join(__filename, '..', '..', 'resources', `${sender.toLowerCase()}.svg`),
            dark: path.join(__filename, '..', '..', 'resources', `${sender.toLowerCase()}.svg`)
        };
    }

    addParent(label, collapsibleState) {
        const parent = new MyTreeItem(label, path.join(__filename, '..', '..', 'resources', 'icon.svg'), collapsibleState);
        this.data.push(parent);
        this.refresh();
    }

    addChild(parentLabel, label, collapsibleState, sender) {
        const parent = this.data.find((node) => node.label === parentLabel);
        if (parent) {

            const child = new MyTreeItem(`${sender}: ${label}`, this.getIconPath(sender), collapsibleState)
            parent.children.push(child);
            this.refresh();
        }
    }
}




async function interactWithOpenAI(prompt) {
    try {
        const response = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error(error);
        return 'An error occurred while contacting the OpenAI API: ' + error.message;
    }
}

async function generateComments() {
    // Check if the command is already running
    if (isRunning) {
        vscode.window.showErrorMessage("Please wait until the current operation finishes.");
        return;
    }

    isRunning = true;

    const editor = vscode.window.activeTextEditor;

    if (editor) {
        let document = editor.document;
        let selection = editor.selection;

        // Get the text the user has highlighted
        let highlightedText = document.getText(selection);

        // If no text was selected, show an error
        if (!highlightedText) {
            vscode.window.showErrorMessage("Please select some text first.");
            isRunning = false;
            return;
        }

        // Get the language of the current file
        let language = document.languageId;

        // Display a progress indicator
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating comments. Please Wait...",
            cancellable: false
        }, async (progress) => {
            try {
                let prompt = `Add suitable comments and docstrings to the following code. Follow conventions and standards. The language is ${language}. Only include the code in your response: ` + highlightedText;
                let content = await interactWithOpenAI(prompt);

                content = content.data.choices[0].message.content;
                /*
                *  Sometimes chatGPT's content can be wrapped in code tags in the following format:
                *
                *                                  language```content```
                *  
                * The following regex is designed to remove anything but the content.
                *    
                * `^(\w+\n)?```([\s\S]*?)```$`: The entire regular expression.
                * 
                * `^`: This matches the start of the string. It ensures that the pattern must start at the beginning of the string.
                * 
                * `(\w+\n)?`: This part matches a language identifier at the start of the string, followed by a newline. 
                * The `\w+` part matches one or more word characters (equivalent to [a-zA-Z0-9_]), 
                * and the `\n` matches a newline. The whole group is made optional by the `?` at the end.
                * 
                * ```([\s\S]*?)```$: This part starts and ends with triple backticks, matching a block of content 
                * that is surrounded by these backticks. Inside the backticks, `[\s\S]*?` matches any amount of 
                * any character, including newline characters, in a non-greedy way. The `$` at the end ensures that 
                * the pattern must go all the way to the end of the string.
                * 
                * Together, this regular expression matches strings where a block of content is surrounded by triple 
                * backticks, optionally preceded by a language identifier. It captures only the content inside the 
                * backticks.
                */
                let regex = /^(\w+\n)?```([\s\S]*?)```$/;
                let match = content.match(regex);

                if (match) {
                    content = match[2];
                }



                // Replace the highlighted text with the response from OpenAI API
                editor.edit((editBuilder) => {
                    editBuilder.replace(selection, content.trim());
                });

                // Display a new notification with a completion message
                vscode.window.showInformationMessage("Comments generated.");

            } catch (error) {
                vscode.window.showErrorMessage('An error occurred while contacting the OpenAI API: ' + error.message);
                console.error(error);
            } finally {
                isRunning = false;
            }
        });
    }
}

async function generateCode() {
    console.log("coding");
    // Check if the command is already running
    if (isRunning) {
        vscode.window.showErrorMessage("Please wait until the current operation finishes.");
        return;
    }
    

    isRunning = true;

    const editor = vscode.window.activeTextEditor;
    

    if (editor) {
        let document = editor.document;
        // Get the language of the current file
        let language = document.languageId;

        // Ask the user for a description of the code to generate
        let codeDescription = await vscode.window.showInputBox({ prompt: 'Enter a description of the code to generate' });
        
        // If the user did not provide a description, show an error
        if (!codeDescription) {
            vscode.window.showErrorMessage("You must provide a description of the code to generate.");
            isRunning = false;
            return;
        }

        // Display a progress indicator
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating code. Please Wait...",
            cancellable: false
        }, async (progress) => {
            try {
                let prompt = `Generate code based on the following description. Follow conventions and standards. The language is ${language}. Description: ${codeDescription}`;
                let content = await interactWithOpenAI(prompt);

                // Insert the generated code at the current cursor position
                editor.edit((editBuilder) => {
                    editBuilder.insert(editor.selection.start, content.data.choices[0].message.content);
                });

            } catch (error) {
                vscode.window.showErrorMessage('An error occurred while contacting the OpenAI API: ' + error.message);
                console.error(error);
            } finally {
                isRunning = false;
            }
        });

        // Display a new notification with a completion message
        await vscode.window.showInformationMessage("Code generated.");
    }
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
}
