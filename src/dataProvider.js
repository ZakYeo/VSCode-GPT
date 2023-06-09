const vscode = require('vscode');
const { interactWithOpenAI } = require("./openaiInteractions");

const path = require('path');

/**
 * Class representing a tree item in Visual Studio Code extensions.
 * @extends vscode.TreeItem
 */
class MyTreeItem extends vscode.TreeItem {
    /**
     * Create a tree item.
     * @param {string} label - The label of the tree item.
     * @param {string} iconPath - The path to the icon of the tree item.
     * @param {vscode.TreeItemCollapsibleState} collapsibleState - The collapsible state of the tree item.
     */
    constructor(label, iconPath, collapsibleState) {
        super(label, collapsibleState);
        this.iconPath = iconPath;  // Path to the icon to be displayed with this item
        this.children = [];  // Array to store child nodes
    }
}

/**
 * Class acting as a Data Provider in Visual Studio Code extensions.
 * It populates a tree view with data and handles changes in the data.
 */
class MyDataProvider {
    /**
     * Create a data provider.
     */
    constructor(context) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.data = [];  // Array to store tree data
        this.originalData = [];
        this.currentConversation = null;
        this.context = context;  // Variable to store the currently selected conversation
    }

    // Refresh the tree view UI
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    
    // Add a message to the tree view
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

    // Return a tree item
    getTreeItem(element) {
        element.command = {
            command: 'gpt-vscode.openai.selectConversation',
            title: "Select Conversation",
            arguments: [element.label]
        };
        return element;
    }

    // Return children of a tree item
    getChildren(element) {
        if (element) {
            return Promise.resolve(element.children);
        } else {
            return Promise.resolve(this.getData(this.searchQuery));
        }
    }

    onSearch(input) {
        if (input.trim() === '') {
            this.clearSearch();
        } else {
            this.searchQuery = input;
        }
        this.refresh();
        
    }
    

    clearSearch() {
        this.searchQuery = null;
        this.data = JSON.parse(JSON.stringify(this.originalData));
        this.refresh();
    }
    
    

    // Return path to the icon for a sender
    getIconPath(sender) {
        return {
            light: path.join(__filename, '..', '..', 'resources', `${sender.toLowerCase()}.svg`),
            dark: path.join(__filename, '..', '..', 'resources', `${sender.toLowerCase()}.svg`)
        };
    }
    

    // Add a parent item to the tree view
    addParent(label, collapsibleState) {
        const parent = new MyTreeItem(label, path.join(__filename, '..', '..', 'resources', 'icon.svg'), collapsibleState);
        this.data.push(parent);
        this.originalData = JSON.parse(JSON.stringify(this.data)); // update original data
        this.refresh();
    }

    // Add a child item to a parent item in the tree view
    addChild(parentLabel, label, collapsibleState, sender) {
        const parent = this.data.find((node) => node.label === parentLabel);
        if (parent) {

            const child = new MyTreeItem(`${sender}: ${label}`, this.getIconPath(sender), collapsibleState)
            parent.children.push(child);
            this.originalData = JSON.parse(JSON.stringify(this.data)); // update original data
            this.refresh();
        }
    }

    // Start a chat with the AI
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

    // Select a conversation
    selectConversation(label) {
        this.currentConversation = label;
    }

    // Create a new conversation
    createNewConversation(context) {
        let conversationCounter = context.globalState.get('conversationCounter', 1); // Use a default value of 1
        let newChatLabel = "Conversation " + conversationCounter++;
        this.addParent(newChatLabel, vscode.TreeItemCollapsibleState.Expanded);
        this.currentConversation = newChatLabel;
        context.globalState.update('conversationCounter', conversationCounter);
    
    }

    // Delete a conversation
    deleteConversation(label) {
        // Find the parent node if the label is a child
        let parentNode;
        for (let node of this.data) {
            if (node.label === label.label || node.children.some(child => child.label === label.label)) {
                parentNode = node;
                break;
            }
        }
    
        if (parentNode) {
            vscode.window.showInformationMessage('Are you sure you want to delete this conversation?', 'Yes', 'No')
                .then(selection => {
                    if (selection === 'Yes') {
                        const index = this.data.indexOf(parentNode);
                        if (index !== -1) {
                            this.data.splice(index, 1);

                            // Delete from originalData as well
                            const originalIndex = this.originalData.indexOf(parentNode);
                            if (originalIndex !== -1) {
                                this.originalData.splice(originalIndex, 1);
                            }
                            
    
                            let savedConversations = this.context.globalState.get('conversations', []);
                            const savedNodeIndex = savedConversations.findIndex(node => node.label === parentNode.label);
                            if (savedNodeIndex !== -1) {
                                savedConversations.splice(savedNodeIndex, 1);
                                this.context.globalState.update('conversations', savedConversations);
                            }

                            this.refresh();
                        }
                    }
                });
        }
    }

    // Rename a conversation
    renameConversation(oldLabel, newLabel) {
        // Find the parent node if the label is a child
        let parentNode = this.data.find(node => node.label === oldLabel.label || node.children.some(child => child.label === oldLabel.label));
    
        if (parentNode) {
            
            
    
            let savedConversations = this.context.globalState.get('conversations', []);
            let savedNodeIndex = savedConversations.findIndex(node => node.label === parentNode.label);
            if (savedNodeIndex !== -1) {
                savedConversations[savedNodeIndex].label = newLabel;
                this.context.globalState.update('conversations', savedConversations);
            }

            // Rename in originalData as well
            let originalNode = this.originalData.find(node => node.label === oldLabel.label || node.children.some(child => child.label === oldLabel.label));
            if (originalNode) {
                originalNode.label = newLabel;
            }
            parentNode.label = newLabel;
            this.refresh();
            
        }
    }

    getData() {
        const searchQuery = this.searchQuery;
        if (!searchQuery) {
            return this.data;
        }
    
        // deep copy the original data to avoid modifying it
        const copiedData = JSON.parse(JSON.stringify(this.originalData)); 

        const result = [];
        copiedData.forEach(conversation => {
            if (conversation.label && conversation.label.toLowerCase().includes(searchQuery.toLowerCase())) {
                result.push(conversation);
            } else {
                const matchingMessages = conversation.children.filter(msg => {
                    console.log(searchQuery);
                    console.log(msg);
                    msg.label.toLowerCase().includes(searchQuery.toLowerCase());
                });
                if (matchingMessages.length > 0) {
                    // Clone the conversation and assign matching messages as children
                    const matchingConversation = new MyTreeItem(conversation.label, vscode.TreeItemCollapsibleState.Collapsed);
                    matchingConversation.children = matchingMessages;
                    result.push(matchingConversation);
                }
            }
        });
        this.data = result; // update the data with the search results
        return result;
    }
    
    

}


// Export the Data Provider class
module.exports = {
    MyDataProvider
}