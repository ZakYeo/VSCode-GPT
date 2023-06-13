# GPT-VSCode Extension

This VSCode extension allows you to chat with OpenAI's GPT directly from your editor. You can ask it to generate comments, code, or just chat with it.

## Features

- Chat directly with OpenAI's GPT.
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

After setting up your OpenAI API Key, you can use the commands provided by the extension:

- `Chat With AI`: This command allows you to chat directly with OpenAI's GPT-3.

- `Generate Comments`: This command generates comments for your code.

- `Generate Code`: This command generates code based on a description.

You can access these commands from the Command Palette or from the context menu in the editor.

## Contribution

Feel free to contribute to the project by reporting issues or proposing features in the GitHub repository.
