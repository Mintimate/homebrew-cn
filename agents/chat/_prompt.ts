import { buildSkillInstructions } from './_skill';

export function buildSystemPrompt(userMessage: string, extraGuidance?: string): string {
  const canonicalGuidance = inferCanonicalGuidance(userMessage);

  return buildSkillInstructions({
    canonicalGuidance,
    extraGuidance,
  });
}

export function buildUserInput(message: string, contextText?: string): string {
  if (!contextText?.trim()) return message;
  return [
    message,
    '',
    'User-provided environment details or diagnostic context:',
    contextText.trim(),
  ].join('\n');
}

function inferCanonicalGuidance(message: string): string {
  const text = message.toLowerCase();
  const arm64PathIssue = /command not found: brew|brew: command not found/.test(text) && /m1|m2|m3|m4|apple silicon|arm64/i.test(text);
  const resetOfficial = /恢复官方|重置官方|官方源|reset official|restore official/.test(text);

  if (arm64PathIssue) {
    return [
      'The user is on Apple Silicon macOS and brew command is not found.',
      'Explain that Apple Silicon Macs install Homebrew to `/opt/homebrew` instead of `/usr/local`.',
      'Do not immediately persist changes to `~/.zshrc` or generate repair commands.',
      'First ask for read-only troubleshooting output. If the user already pasted output showing `Homebrew <version>`, `/opt/homebrew/bin/brew`, or PATH containing `/opt/homebrew/bin`, state that the current terminal is already OK.',
      'Only provide temporary validation commands if the output is still inconclusive:',
      '```zsh',
      'command -v brew || echo "brew-not-in-PATH"',
      'brew --version',
      'echo "$PATH"',
      '```',
    ].join('\n');
  }

  if (resetOfficial) {
    return [
      'The user wants to restore Homebrew to the official upstream repositories.',
      'Explain that they can use the script to switch back, or run the official git commands manually.',
      'Provide the manual commands to reset git remotes to official GitHub repositories:',
      '```bash',
      '# Reset brew core repository',
      'git -C "$(brew --repo)" remote set-url origin https://github.com/Homebrew/brew',
      '',
      '# Reset core formulae repository',
      'git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-core" remote set-url origin https://github.com/Homebrew/homebrew-core',
      '',
      '# Reset cask repository (if installed)',
      'if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" ]; then',
      '  git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" remote set-url origin https://github.com/Homebrew/homebrew-cask',
      'fi',
      '',
      '# Unset mirror environment variables in their shell profiles',
      '# Advise the user to open ~/.zshrc or ~/.bash_profile, and remove lines containing:',
      '# HOMEBREW_BOTTLE_DOMAIN or HOMEBREW_API_DOMAIN',
      '```',
      'Remind them to run `brew update` to pull the latest changes from official GitHub.',
    ].join('\n');
  }

  return '';
}
