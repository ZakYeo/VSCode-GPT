# Changelog

All notable changes to this project will be documented in this file.

## [1.3.1] - 2023-07-09

### Added

- Added CHANGELOG.md.
- Added vsc-extension-quickstart.md.
- Added DEVELOPMENT.md.
- WebView's conversations now syncs with TreeView's conversations when prompted.

### Changed

- Updated README.md

## [1.3.0] - 2023-07-04

### Added

- Updated README with more feature information.

## [1.2.0] - 2023-07-03

### Added

- Added more comments to the code for clarification.

## [1.1.0] - 2023-06-30

### Added

- Added custom webview view for conversations. Conversations can now be viewed in VSCode's WebView.
- Added "Copy Contents" in right-click menu for copying response or entire conversation contents.
- Ability to change the GPT model added.

### Fixed

- Bug that did not save newly created but empty conversations.
- Bug that allowed prompting a deleted conversation.
- Bug where renaming a conversation would not pre-fill the rename input box with the conversation name.

### Changed

- Layout of right-click menu in extension.
- Conversation's expanded or collapsed state is now persistent.
- Removed sender from the text. Now only uses an icon to denote the sender (user or ai).
- Removed New Conversation from right-click menu of a conversation.
- Minor refactor + Now cannot prompt with 0 conversations.

### Removed

- Redundant code removed.

## [1.0.0] - 2023-06-12

### Added

- Added import and export capabilities.

### Fixed

- Fixed generate code & comments commands not working.
- Fixed a bug when renaming that caused the wrong placeholder to appear.
- Fixed rename bug.

### Removed

- Unnecessary console log removed.

## [0.3.0] - 2023-06-09

### Added

- Added Search functionality. Search now works on entire conversation, not just the title.
- Added search icon.
- Delete and rename can be done by right-clicking the tree item.

### Changed

- Made color lighter.
- Layout changes.

### Fixed

- Fixed a bug in renaming functionality.

### Removed

- Redundant comments and console logs removed.

## [0.2.0] - 2023-06-08

### Added

- Conversations now save to local storage.
- The ability to converse with chatGPT in the activity bar.
- Added generate code command.
- Now supports multiple conversations with chatGPT separated by the hierarchical structure of the tree view.
- Ability to create a new "conversation" with a plus (+) symbol.

### Changed

- Separated code into different files for easier maintenance.
- Changed color from black to grey.
- Numbers chats and if a conversation is selected it will automatically add to that conversation.

### Fixed

- Fixed a bug. Now removes chat tags from chatGPT's responses.

## [0.1.0] - 2023-06-06

### Added

- Base Application. Includes a "Generate Comments" command in right-click menu (or using ctrl+shift+a).

### Changed

- Separated code into an extra function.
