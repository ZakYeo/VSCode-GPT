# VSCode-GPT Extension

Visual Studio Code extension designed to improve & optimise workflow by allowing to chat with OpenAI's ChatGPT directly from your editor. You can use it to generate code or comments on the fly, or simply have conversations with it that are saved and persist in storage.

## Features

- Chat and create conversations directly with OpenAI's GPT.
- Conversations are saved to memory, and can be imported or exported using JSON
- Generate comments for your code via chatGPT.
- Generate code based on a description via chatGPT.
- Optimise your code via chatGPT
- Swap between different OpenAI Chat models (GPT-3.5-turbo, text-davinci-002, text-curie-003, gpt-4, etc).

## Requirements

This extension requires an OpenAI API key. You can get one from [OpenAI's website](https://openai.com/).

## Usage

- [General Usage / Quickstart](vsc-extension-quickstart.md)
- [Development Instructions](DEVELOPMENT.md)

## Screenshots

Below is a screenshot of the Tree View in the Side bar (left-hand side) and a Web View on the right-hand side.
<img
  src="/screenshots/treeview-and-webview.png"
  alt="Side Bar Tree View & Web View for Conversations"
  title="Side Bar Tree View & Web View for Conversations"
  style="display: inline-block; margin: 0 auto;">
Every conversation can be opened in a Web View using the Tree View's right-click context menu
<img
  src="/screenshots/sidebar-context-menu.png"
  alt="Side Bar Context Menu"
  title="Side Bar Context Menu"
  style="display: inline-block; margin: 0 auto;"><br>
Prompts are done by pressing the "Prompt" button from the side-bar, or by using the Tree View's context menu.
<img
  src="/screenshots/prompt.png"
  alt="Side Bar Prompt Menu"
  title="Side Bar Prompt Menu"
  style="display: inline-block; margin: 0 auto;">
Conversations may also be searched
<img
  src="/screenshots/search.png"
  alt="Search Conversations"
  title="Search Conversations"
  style="display: inline-block; margin: 0 auto;">
Share conversations with others using import / export features
<img
  src="/screenshots/import-export-conversations.png"
  alt="Import Export Conversations"
  title="Import Export Conversations"
  style="display: inline-block; margin: 0 auto;">

## Changelog

- [CHANGELOG](CHANGELOG.md)
