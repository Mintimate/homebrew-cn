# Restore Official Sources

Use this flow when the user wants to restore Homebrew to official GitHub upstream sources.

Explain that restoring official sources does two things:

- Reset Homebrew Git remotes to GitHub.
- Remove mirror-related shell environment variables from the current shell and persistent profile files.

Use these commands:

```bash
git -C "$(brew --repo)" remote set-url origin https://github.com/Homebrew/brew

if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-core" ]; then
  git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-core" remote set-url origin https://github.com/Homebrew/homebrew-core
fi

if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" ]; then
  git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" remote set-url origin https://github.com/Homebrew/homebrew-cask
fi

unset HOMEBREW_BOTTLE_DOMAIN HOMEBREW_API_DOMAIN
brew update
```

Remind the user that `unset` only affects the current terminal. If `HOMEBREW_BOTTLE_DOMAIN` or `HOMEBREW_API_DOMAIN` was added to `~/.zshrc`, `~/.bashrc`, or `~/.bash_profile`, they should remove those lines and open a new terminal.
