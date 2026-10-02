# Desktop Setup And Shared Configuration

## Scope

- Homebrew 7 provides the optional BrewUI app on macOS 26 or newer. Verify the user's macOS version before recommending the desktop app. Homebrew CLI users on other supported systems can continue using the installer and mirror configuration without BrewUI.
- BrewUI starts Homebrew in an isolated environment with `zsh --no-rcs --no-global-rcs`. It does not inherit shell profile exports or `XDG_CONFIG_HOME`. A working Terminal configuration does not prove the Dock-launched app has the same configuration.
- Never claim that a cloud sandbox has inspected the user's installed apps, local files, proxies, or network.

## Existing Homebrew Installation

Use this interactive configuration flow for an existing installation, including switching mirrors and migrating legacy shell exports:

```zsh
/bin/zsh -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)" -- --configure
```

For Linux CLI users, use `/bin/bash` instead of `/bin/zsh`; BrewUI is not available on Linux.

Explain that this configures the existing Homebrew installation rather than reinstalling it. The script persists its mirror settings in `$(brew --prefix)/etc/homebrew/brew.env`, keeps PATH setup separate, and checks for conflicting user or XDG configuration. Follow the script's migration prompts and keep its configuration backups.

## Configuration Rules

- Mirror settings in `brew.env` are literal `NAME=value` lines, without `export`, command substitution, or shell startup code. Do not tell users to `source` this file.
- `$(brew --prefix)/etc/homebrew/brew.env` is this project's shared mirror configuration for CLI and BrewUI. `~/.homebrew/brew.env`, the terminal's `${XDG_CONFIG_HOME}/homebrew/brew.env`, and `/etc/homebrew/brew.env` may also affect the effective values. Inspect conflicts instead of assuming a prefix file overrides every other setting.
- BrewUI ignores custom `XDG_CONFIG_HOME`; a Terminal using that variable can read a different user file. Check both the default user file and the terminal's XDG location when relevant.
- Homebrew can also read `HOMEBREW_XDG_CONFIG_HOME` from system or prefix `brew.env` before choosing its user configuration file. Check that literal path when present; do not assume the default user file is the only one BrewUI reads.
- Keep `brew shellenv` and PATH in shell startup configuration. Do not move those shell commands into `brew.env` or add duplicate mirror exports to shell profiles.

## Terminal Works, Desktop Does Not

1. Start with the user's visible problem: whether the Homebrew app cannot download, reports an error, or behaves differently from a command they ran. If already stated, use it rather than asking again. Explain the likely distinction in plain language: “应用和终端可能读取不同的下载设置；先看出问题的那一边”. Do not lead with process isolation, version checks, installation prefixes, or XDG paths.
2. Follow [configuration-compare.md](configuration-compare.md) to collect one report from the failing side, explain what it shows, and then request only the next missing evidence. For app users start with **配置 → 复制报告**; for Terminal users start with `brew config`, explained as a read-only check. A user need not learn the term BrewUI or manually label reports to begin. Ask macOS version or app launch path only when it matters to the remaining question; an already-running app does not need an installation compatibility checklist.
3. If old shell-only mirror configuration is confirmed or the user wants migration, explain “把下载设置保存到应用和终端都能读取的位置”, then provide the `--configure` command after identifying the platform. State that it changes settings for the existing installation, keep its backups, and retry the failed task after fully quitting and reopening the app. Give the additional verification step when ready rather than presenting every future command at once.
4. When the user explicitly requests mirror/network probes, run the cloud tool and label its vantage point. A successful cloud check cannot confirm the user's app settings, local download speed, software catalogue access, or installation package downloads.

Do not invent a completed local diagnosis from a generic "BrewUI 很慢" report. P0 supports supplied Doctor reports and labeled configuration comparisons, plus interactive migration; it does not include a local agent, local network probe or automatic repair executor. Use [configuration-compare.md](configuration-compare.md) to request and compare actual reports, and [doctor-triage.md](doctor-triage.md) for Doctor warnings.

When suggesting configuration collection commands, use an exact allowlist of `HOMEBREW_BREW_GIT_REMOTE`, `HOMEBREW_CORE_GIT_REMOTE`, `HOMEBREW_CASK_GIT_REMOTE`, `HOMEBREW_BOTTLE_DOMAIN`, `HOMEBREW_API_DOMAIN`, `HOMEBREW_ARTIFACT_DOMAIN`, and `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK`. Do not use a broad `grep HOMEBREW_`, `env`, or a whole-file dump: other Homebrew variables can contain credentials. Only inspect optional XDG paths when their setting is nonempty, and ask the user to review/redact results before sharing them.

For desktop configuration guidance that takes priority over cloud diagnostics, disable optional model thinking and answer directly from this reference. Slowness/error keywords or a long configuration excerpt alone must not enable a reasoning loop for this first guidance step. Explicitly requested network diagnostics retain their normal tool route.

## Official Reference

- [BrewUI architecture and environment isolation](https://github.com/Homebrew/BrewUI/blob/main/ARCHITECTURE.md)
