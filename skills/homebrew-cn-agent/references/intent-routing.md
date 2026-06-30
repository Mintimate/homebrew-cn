# Intent Routing

Classify each latest user message into exactly one route.

## Routes

- `model_identity`: asks who the assistant is or what model/agent it is.
- `restore_official`: wants to restore or reset Homebrew to official GitHub upstream sources.
- `mirror_probe_deep`: wants online mirror diagnostics, speed tests, current fastest mirror, or help with connection failures/slow mirror access.
- `formula_check`: asks whether a specific package/app can be installed by Homebrew, asks for `brew install`, `brew info`, `brew search`, or compares formula vs cask.
- `brew_missing`: reports `brew` command not found, PATH issues, or follows up on a previous brew-not-found troubleshooting flow.
- `analysis_fix`: pastes error logs, shell profile content, Git config, PATH, proxy output, or environment information for diagnosis.
- `general_homebrew`: other Homebrew, homebrew-cn, installation, mirror, or local environment questions.
- `reject`: unrelated to Homebrew or the homebrew-cn Agent scope.

## Rules

- Prefer the most specific route.
- Do not use `general_homebrew` when the user clearly asks about installing or querying a specific package.
- Treat "是否可以用 Homebrew 安装 X", "X 能不能用 brew 装", `brew install X`, `brew info X`, and `brew search X` as `formula_check`.
- Treat "Homebrew 怎么安装" without a specific package as `general_homebrew`.
- Treat "Homebrew 是什么" and "brew 有什么用" as `general_homebrew`.
- Consider conversation history. If the user is replying with terminal output after a brew-not-found step, route as `brew_missing`.
- Set `needs_sandbox` to true only for `mirror_probe_deep` when the user explicitly wants online diagnostics from the sandbox.
