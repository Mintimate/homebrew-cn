# Formula And Cask Lookup

Use `formula_check` whenever the user asks whether an app/package can be installed with Homebrew or asks for a brew install command.

## Query Handling

- Extract the package or app name from natural language or brew commands.
- Normalize common aliases:
  - VS Code, vscode, Visual Studio Code -> `visual-studio-code`
  - Chrome, Google Chrome, 谷歌浏览器 -> `google-chrome`
  - WeChat, Weixin, 微信 -> `wechat`
  - Docker Desktop -> `docker-desktop`
  - nodejs, node.js -> `node`
  - python3 -> `python`
- Query both formula and cask indexes.

## Answer Format

When a match is found:

- State the matched token and whether it is a Formula or Cask.
- Include a short description when available.
- Include version when available.
- Provide the install command in a shell code block.
- List up to three close alternatives when useful.

When no match is found, say the Homebrew JSON index did not find a clear formula or cask and suggest a more exact product or package name.
