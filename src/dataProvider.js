const vscode = require('vscode');
const { interactWithOpenAI } = require("./openaiInteractions");

const path = require('path');

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

    async chatWithAI(context) {
        let selectedChat = this.currentConversation;

    if (!selectedChat) {
        const chatOptions = this.data.map(node => node.label);
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

                this.addChild(selectedChat, prompt, vscode.TreeItemCollapsibleState.None, "User");
                this.addChild(selectedChat, aiResponse, vscode.TreeItemCollapsibleState.None, "AI");
                this.refresh();

                // Save the conversation to local storage
                let savedConversations = context.globalState.get('conversations', []); // Use a default value of an empty array
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
    }

    selectConversation(label) {
        this.currentConversation = label;
    }

    createNewConversation(context) {
        let conversationCounter = context.globalState.get('conversationCounter', 1); // Use a default value of 1
        let newChatLabel = "Chat " + conversationCounter++;
        this.addParent(newChatLabel, vscode.TreeItemCollapsibleState.Expanded);
        this.currentConversation = newChatLabel;
        context.globalState.update('conversationCounter', conversationCounter);
    
    }
}



module.exports = {
    MyDataProvider
}