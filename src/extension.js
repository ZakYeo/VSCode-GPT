const vscode = require('vscode');
const path = require('path');
const os = require('os');
var ncp = require("copy-paste");
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
    let myDataProvider = new MyDataProvider(context);

    // Load saved conversations from storage and populate them in the data provider
    let savedConversations = context.globalState.get('conversations', []);

    for (let conversation of savedConversations) {
        let state = conversation.state || vscode.TreeItemCollapsibleState.Collapsed; // Default to collapsed if no state is saved
        myDataProvider.addParent(conversation.label, state);
        if(conversation.messages){
            for (let message of conversation.messages) {
                myDataProvider.addChild(conversation.label, message.text, vscode.TreeItemCollapsibleState.None, message.sender);
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
    vscode.commands.registerCommand('gpt-vscode.openai.copyEntryContents', async (label) => {
        if(myDataProvider.getParentFromChildLabel(label.label) == label.label){
            // If this tree item is the parent, copy entire conversation
            const exportFormat = {};
            exportFormat[label.label] = label.children.map(child => ({[child.sender]: child.label}));
            ncp.copy(JSON.stringify(exportFormat, null, '\t'), function () {});

        }else{
            // Else, just copy the selected item
            ncp.copy(label.label, function () {});
        }
        
    });

    vscode.commands.registerCommand('gpt-vscode.openai.openWebView', async (label) => {
        const parent = myDataProvider.getParentFromChildLabel(label.label);
        console.log(parent);
        console.log(myDataProvider.data);
        const panel = vscode.window.createWebviewPanel(
        parent,
        parent,
        vscode.ViewColumn.One,
        {
            // Enable scripts in the WebView
            enableScripts: true
        }
        );
        let convo = null;
        myDataProvider.data.forEach(conversation => {
            if(conversation.label === parent){
                convo = conversation;
            }
        });

        console.log(convo);

        panel.webview.html = getWebviewContent(convo);
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
    
                children.forEach(childObj => {
                    // Extract sender and message from the object
                    const [senderKey, message] = Object.entries(childObj)[0];
                    const sender = senderKey.charAt(0).toUpperCase() + senderKey.slice(1); // Converts 'user' to 'User' and 'ai' to 'AI'
    
                    myDataProvider.addChild(uniqueLabel, message, vscode.TreeItemCollapsibleState.None, sender);
    
                    let savedConversation = savedConversations.find(conv => conv.label === uniqueLabel);
                    if (savedConversation) {
                        savedConversation.messages.push({text: message, sender: sender});
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
                exportFormat[conversation.label] = conversation.children.map(child => ({[child.sender]: child.label}));
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


function getWebviewContent(convo) {
    // Convert the convo object to a JSON string
    const data = JSON.stringify(convo);

    // Include the data as a JavaScript variable within a script tag in your HTML content
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <script type="module">
            import { vscode } from '@vscode/webview-ui-toolkit';
    </script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 1em;
        }
        .user-message, .ai-message {
            max-width: 70%;
            font-weight: bold;
            color: white;
            padding: 10px;
            border-radius: 5px;
            word-wrap: break-word;
        }
        .user-message {
            background-color: var(--vscode-button-background);;
            color: var(--vscode-button-foreground);
            align-self: flex-end;
            text-align: right;
        }
        .ai-message {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            align-self: flex-start;
            text-align: left;
        }
        .conversation-entry {
            display: flex;
            flex-direction: column;
            width: 100%;
            margin-bottom: 10px;
        }
        pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow: auto;
        }
    </style>
    </head>
    <body>
        <div id="conversation"></div>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <script>

        window.addEventListener('DOMContentLoaded', (event) => {
            const data = ${data};

            function escapeHtml(unsafe) {
                return unsafe;
                    /*.replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");*/
            }

            function createConversationEntry(entry) {
                const messageClass = entry.sender.toLowerCase() + '-message';
                const content = marked.parse(escapeHtml(entry.label));
                return \`<div class="conversation-entry">
                    <div class="\${messageClass}">\${content}</div>
                </div>\`;
            }

            if (data.children && data.children.length) {
                const conversationDiv = document.getElementById('conversation');
                const conversationHtml = data.children.map(createConversationEntry).join('');
                conversationDiv.innerHTML = conversationHtml;
            } else {
                console.error('No conversation entries to display');  // Log an error if there are no conversation entries
            }
            
        });
            
        </script>
    </body>
    </html>`;
}








// Export the activate and deactivate functions so that they can be used by VS Code
module.exports = {
    activate,
    deactivate
}
