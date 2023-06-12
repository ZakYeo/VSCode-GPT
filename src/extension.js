const vscode = require('vscode');
const path = require('path');
const os = require('os');
const { MyDataProvider, MyTreeItem } = require("./dataProvider");
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
    let myDataProvider = new MyDataProvider(context);
    vscode.window.registerTreeDataProvider('myListView', myDataProvider);

    // Load saved conversations from storage and populate them in the data provider
    let savedConversations = context.globalState.get('conversations', []); // Use a default value of an empty array
    for (let conversation of savedConversations) {
        myDataProvider.addParent(conversation.label, vscode.TreeItemCollapsibleState.Expanded);
        if(conversation.messages){
            for (let message of conversation.messages) {
                myDataProvider.addChild(conversation.label, message.text, vscode.TreeItemCollapsibleState.None, message.sender);
            }
        }
        if(conversation.children){
            for (let message of conversation.children) {
                myDataProvider.addChild(conversation.label, message, vscode.TreeItemCollapsibleState.None, "ai");
            }
        }
        
    }
    let lastValue = "";
    context.subscriptions.push(vscode.commands.registerCommand('gpt-vscode.openai.search', async () => {
        const inputBox = vscode.window.createInputBox();
        inputBox.onDidChangeValue((value) => {
            lastValue = value;
            myDataProvider.onSearch(value);
        });
        inputBox.onDidAccept(() => {
            inputBox.hide();
        });
        inputBox.placeholder = "Search conversations...";
        inputBox.value = lastValue;
        inputBox.show();
    }));

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

    vscode.commands.registerCommand('gpt-vscode.openai.deleteEntry', (label) => {
        myDataProvider.deleteConversation(label);
    });
    
    vscode.commands.registerCommand('gpt-vscode.openai.renameEntry', async (label) => {
        const newLabel = await vscode.window.showInputBox({ 
            prompt: 'Enter new name for the conversation',
            value: myDataProvider.getParentFromChildLabel(label.label)
         });
        if (newLabel) {
            myDataProvider.renameConversation(label, newLabel);
        }
    });

    context.subscriptions.push(vscode.commands.registerCommand('gpt-vscode.openai.importConversations', async () => {
        const options = {
            canSelectMany: false,
            openLabel: 'Open',
            filters: {
                'JSON files': ['json']
            }
        };
        const fileUri = await vscode.window.showOpenDialog(options);
        if (fileUri && fileUri[0]) {
            const fileContent = await vscode.workspace.fs.readFile(fileUri[0]);
            const conversations = JSON.parse(fileContent.toString());
    
            // Append these conversations to your data structure
            Object.entries(conversations).forEach(([label, children]) => {
                let uniqueLabel = label;
    
                // If the label already exists, append a unique number
                let i = 1;
                while (myDataProvider.data.find(conv => conv.label === uniqueLabel)) {
                    uniqueLabel = `${label} (${i})`;
                    i++;
                }
    
                myDataProvider.createNewConversation(context, uniqueLabel);
    
                // Update the global state
                savedConversations.push({label: uniqueLabel, messages: []});
                context.globalState.update('conversations', savedConversations);
    
                Object.entries(children).forEach(child => {
                    if(child[1].toLowerCase().startsWith("user")){
                        myDataProvider.addChild(uniqueLabel, child[1], vscode.TreeItemCollapsibleState.None, "user");
                        let savedConversation = savedConversations.find(conv => conv.label === uniqueLabel);
                        if (savedConversation) {
                            savedConversation.messages.push({text: child[1], sender: "User"});
                        }
                    }else{
                        myDataProvider.addChild(uniqueLabel, child[1], vscode.TreeItemCollapsibleState.None, "ai")
                        let savedConversation = savedConversations.find(conv => conv.label === uniqueLabel);
                        if (savedConversation) {
                            savedConversation.messages.push({text: child[1], sender: "AI"});
                        }
                    }
                });
    
                context.globalState.update('conversations', savedConversations);
            });
    
            // Update the tree view
            myDataProvider.refresh();
        }
    }));
    
    
      
      context.subscriptions.push(vscode.commands.registerCommand('gpt-vscode.openai.exportConversations', async () => {
        const options = {
          defaultUri: vscode.Uri.file(path.join(os.homedir(), 'conversations.json'))
        };
        const fileUri = await vscode.window.showSaveDialog(options);
        if (fileUri) {
          const exportFormat = {};

            myDataProvider.data.forEach(conversation => {
                exportFormat[conversation.label] = conversation.children.map(child => (child.label));
            });
            const conversationsJson = JSON.stringify(exportFormat, null, 2);
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(conversationsJson, 'utf8'));
        }
      }));
      

    

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
