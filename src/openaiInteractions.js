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
                let prompt = `Add suitable comments and docstrings to the following code. Follow conventions and standards. Wrap the code in triple backticks. The language is ${language}. Only include the code in your response: ` + highlightedText;
                let content = await interactWithOpenAI(prompt);

                /*
                The following regex is designed to identify and isolate the content within code blocks enclosed by triple backticks (` ``` `). The code blocks optionally may have a language identifier preceding the code content. If a language identifier is present, it will not be included in the captured groups.

                Here is a breakdown of the regular expression: `/```(?:\w+\n)?([\s\S]*?)```/g`.

                - `/```(?:\w+\n)?([\s\S]*?)```/g`: This is the entire regular expression. It's divided into various components, each of which plays a distinct role.

                - ` ``` `: The regular expression starts and ends with triple backticks. These are the delimiters indicating the start and end of the code block in many markdown-like syntaxes.

                - `(?:\w+\n)?`: This part matches an optional language identifier at the start of the code block. The `\w+` part matches one or more word characters (equivalent to `[a-zA-Z0-9_]`). The `\n` matches a newline, which is the separator between the language identifier and the code content. The `?` at the end makes the entire group optional, meaning it could match a code block with or without a language identifier. The `?:` at the start of the group makes it a non-capturing group. Non-capturing groups are used for matching but not capturing the content for later use. In this case, the language identifier is matched but not included in the captured groups.

                - `([\s\S]*?)`: This is a capturing group, as denoted by the parentheses without a `?:` at the start. It matches any character (`[\s\S]`), including newlines, in a non-greedy way (`*?`). The non-greedy qualifier means it will match the shortest possible string that fulfills the condition, which ensures it doesn't accidentally include multiple code blocks in one match. The content matched by this group, which is the content of the code block, is captured for later use.

                - `/g`: This is the global flag. It means the regular expression should find all matches in the string, not just the first one. Without this flag, the regular expression would stop after finding the first code block.

                Together, this regular expression matches strings where code blocks are surrounded by triple backticks and are optionally preceded by a language identifier. It captures only the content inside the backticks, excluding the language identifier and the backticks themselves. It will find these code blocks anywhere in the string, not just at the start or end.
                */
                let regex = /```(?:\w+\n)?([\s\S]*?)```/g;
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
                let prompt = `Generate code based on the following description. Follow conventions and standards. Wrap the code in triple backticks. The language is ${language}. Description: ${codeDescription}`;
                let content = await interactWithOpenAI(prompt);
                let regex = /```(?:\w+\n)?([\s\S]*?)```/g;
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

// Function to optimise code using OpenAI API
async function optimiseCode() {
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
            title: "Attempting to optimise code. Please Wait...",
            cancellable: false
        }, async (progress) => {
            try {
                let prompt = `Optimise, refactor & improve the following code snippet. Don't remove comments or code (only if it's redundant). The language is ${language}. Wrap the code in triple backticks: ` + highlightedText;
                let content = await interactWithOpenAI(prompt);

                let regex = /```(?:\w+\n)?([\s\S]*?)```/g;
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
                vscode.window.showInformationMessage("Code optimised.");

            } catch (error) {
                vscode.window.showErrorMessage('An error occurred while contacting the OpenAI API: ' + error.message);
                console.error(error);
            } finally {
                isRunning = false;
            }
        });
    }
}

// Export the functions to be used in other modules
module.exports = {
    generateComments,
    generateCode,
    optimiseCode,
    interactWithOpenAI
}