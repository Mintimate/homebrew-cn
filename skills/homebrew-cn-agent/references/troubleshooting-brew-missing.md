# Brew Not Found Troubleshooting

Use this flow when the user reports `command not found: brew`, `brew: command not found`, PATH issues, or follows up with diagnostic output.

## Apple Silicon

Apple Silicon macOS installs Homebrew under `/opt/homebrew`, not `/usr/local`.

If the message mentions M1, M2, M3, M4, Apple Silicon, or arm64:

- Explain the default prefix difference.
- Do not immediately persist changes to `~/.zshrc`.
- First request or analyze read-only troubleshooting output.
- If pasted output already shows `Homebrew <version>`, `/opt/homebrew/bin/brew`, or PATH containing `/opt/homebrew/bin`, state that the current terminal is already OK.

If output is inconclusive, provide only temporary validation commands:

```zsh
command -v brew || echo "brew-not-in-PATH"
brew --version
echo "$PATH"
```

Generate persistent repair commands only after the target prefix and shell profile are clear.

## Default Prefixes

- macOS Apple Silicon: `/opt/homebrew`; shell injection is `eval "$(/opt/homebrew/bin/brew shellenv)"`.
- macOS Intel: `/usr/local`; shell injection is `eval "$(/usr/local/bin/brew shellenv)"`.
- Linux: `/home/linuxbrew/.linuxbrew`; shell injection is `eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"`.

## Shell Profiles

- macOS default: `~/.zshrc`; bash users may use `~/.bash_profile` or `~/.bashrc`.
- Linux default: `~/.bashrc`; zsh users may use `~/.zshrc`.
