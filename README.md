# GPT-VSCode Extension

This VSCode extension allows you to chat with OpenAI's GPT directly from your editor. You can ask it to generate comments, code, or just chat with it.

## Features

- Chat and create conversations directly with OpenAI's GPT.
- Conversations are saved to memory, and can be imported or exported using JSON
- Generate comments for your code.
- Generate code based on a description.
- Swap between different OpenAI Chat models (GPT-3.5-turbo, text-davinci-002, text-curie-003, gpt-4, etc).

## Requirements

This extension requires an OpenAI API key. You can get one from [OpenAI's website](https://openai.com/).

## Installation

1. Clone the repository or download the source code.

   ```bash
   git clone https://github.com/ZakYeo/VSCode-GPT.git
   ```

2. Navigate to the project's directory.

   ```bash
   cd gpt-vscode-extension
   ```

3. Install the dependencies.

   ```bash
   npm install
   ```

4. Open the project in Visual Studio Code.

   ```bash
   code .
   ```

5. Press `F5` to start the debugging process. This will run the extension in a new VS Code window.

## Configuration

After installing the extension, you need to set your OpenAI API key.

1. Open VS Code settings: `File` -> `Preferences` -> `Settings`.

2. Search for `OpenAI API Key`.

3. Enter your OpenAI API key in the input box.

In addition to the API key, you can also select the model to be used for OpenAI API calls.

1. Open VS Code settings: `File` -> `Preferences` -> `Settings`.

2. Search for `OpenAI Model`.

3. Enter the model name in the input box (default is `gpt-3.5-turbo`).

## Usage

After setting up your OpenAI API Key, you can use the following features:

- `Chat With AI In TreeView`: Users can converse with chatGPT, and conversations are saved and stored in the TreeView in the sidebar on the left of VSCode.

- `Chat With AI In WebView`: Users can view specific conversations in a "Web View" that allows for a better view.

- `Generate Comments`: This command generates comments for your code, and is added to the right-click menu also.

- `Generate Code`: This command generates code based on a description, and is added to the right-click menu also.


## Contribution

Feel free to contribute to the project by reporting issues or proposing features in the GitHub repository.
