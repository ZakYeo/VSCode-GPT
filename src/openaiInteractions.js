const vscode = require('vscode');
const { Configuration, OpenAIApi } = require("openai");

// Set up OpenAI API configuration using the user's API key from VS Code settings
const configuration = new Configuration({
    apiKey: vscode.workspace.getConfiguration('gptvscode').get('openaiApiKey')
});

// Initialize OpenAI API client with the configuration
const openai = new OpenAIApi(configuration);

// Declare a variable to prevent simultaneous API calls
let isRunning = false;

// Function to interact with OpenAI API
async function interactWithOpenAI(prompt) {
    try {
        // Get the model from the settings
        const model = vscode.workspace.getConfiguration('gptvscode').get('openai.model');

        // Send the prompt to the API and get the response
        const response = await openai.createChatCompletion({
            model: model,
            messages: [{ role: 'user', content: prompt }],
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error(error);
        // Return an error message if something goes wrong
        return 'An error occurred while contacting the OpenAI API: ' + error.message;
    }
}


// Function to generate comments using OpenAI API
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

                /*
                The following regex is designed to remove anything but the content within the triple backtick (```) code blocks.
                
                `(?:\w+\n)?```([\s\S]*?)```/g`: The entire regular expression.

                `(?:\w+\n)?`: This part matches a language identifier at the start of the triple backtick code block, followed by a newline. The `\w+` part matches one or more word characters (equivalent to [a-zA-Z0-9_]), and the `\n` matches a newline. The whole group is made optional by the `?` at the end. The `?:` at the start makes it a non-capturing group, which means it will not be included in the match results.

                ```([\s\S]*?)```/g: This part starts and ends with triple backticks, matching a block of content that is surrounded by these backticks. Inside the backticks, `[\s\S]*?` matches any amount of any character, including newline characters, in a non-greedy way. The `/g` at the end makes the regular expression global, which means it will find all matches rather than stopping after the first match.

                Together, this regular expression matches strings where a block of content is surrounded by triple backticks, optionally preceded by a language identifier. It captures only the content inside the backticks. This version of the regular expression will find these blocks anywhere in the string, not just at the start or end.
                */
                let regex = /```(\w+\n)?([\s\S]*?)```/g;
                let match = content.match(regex);
                let code = "";

                if (match) {
                    match.forEach((m) => {
                        let codeBlock = m.replace(/```(?:\w+\n)?([\s\S]*?)```/g, "$1");
                        code += codeBlock.trim();
                    });
                }

                // Replace the highlighted text with the response from OpenAI API
                editor.edit((editBuilder) => {
                    editBuilder.replace(selection, code);
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

// Function to generate code using OpenAI API
async function generateCode() {
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
                let regex = /```(\w+\n)?([\s\S]*?)```/g;
                let match = content.match(regex);
                let code = "";

                if (match) {
                    match.forEach((m) => {
                        let codeBlock = m.replace(/```(?:\w+\n)?([\s\S]*?)```/g, "$1");
                        code += codeBlock.trim();
                    });
                }

                // Insert the generated code at the current cursor position
                editor.edit((editBuilder) => {
                    editBuilder.insert(editor.selection.start, code);
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

async function extractCodeInCodeTags(content){
    
    let regex = /^(\w+\n)?```([\s\S]*?)```$/;
    let match = content.match(regex);

    if (match) {
        content = match[2];
    }

    return content;

}

// Export the functions to be used in other modules
module.exports = {
    generateComments,
    generateCode,
    interactWithOpenAI
}