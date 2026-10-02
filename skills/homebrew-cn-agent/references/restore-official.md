# Restore Official Sources

Use this flow for requests to restore Homebrew official upstream sources, including BrewUI. No cloud probe is needed. The direct runtime reply below is generated from this reference; do not maintain a separate shell-only reply in TypeScript.

## Direct Reply

恢复官方源需要同时处理 Git 远程地址和持久镜像配置。已经安装 Homebrew 时，可先运行配置模式，并在镜像菜单选择 `4) 官方源`。macOS 使用：

```zsh
/bin/zsh -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)" -- --configure
```

Linux 使用：

```bash
/bin/bash -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)" -- --configure
```

这个模式配置现有 Homebrew，不会重新安装。按脚本提示处理旧配置，并保留备份。项目的持久镜像配置位于 `$(brew --prefix)/etc/homebrew/brew.env`；还需核对 `~/.homebrew/brew.env`、终端使用的 `${XDG_CONFIG_HOME}/homebrew/brew.env`、`/etc/homebrew/brew.env` 中是否有覆盖配置。

手动恢复时，先备份实际使用的配置文件，再清理其中的 `HOMEBREW_BREW_GIT_REMOTE`、`HOMEBREW_CORE_GIT_REMOTE`、`HOMEBREW_BOTTLE_DOMAIN`、`HOMEBREW_API_DOMAIN` 镜像设置，以及旧 shell profile 中对应的镜像 exports；保留 PATH 和 `brew shellenv`。若存在旧的 `HOMEBREW_CASK_GIT_REMOTE`，也应清理；若配置了 `HOMEBREW_ARTIFACT_DOMAIN` 或 `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK`，需确认并移除相应下载覆盖配置，否则仍可能使用其他下载地址。然后执行：

```bash
git -C "$(brew --repo)" remote set-url origin https://github.com/Homebrew/brew

if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-core" ]; then
  git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-core" remote set-url origin https://github.com/Homebrew/homebrew-core
fi

if [ -d "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" ]; then
  git -C "$(brew --repo)/Library/Taps/homebrew/homebrew-cask" remote set-url origin https://github.com/Homebrew/homebrew-cask
fi

unset HOMEBREW_BREW_GIT_REMOTE HOMEBREW_CORE_GIT_REMOTE HOMEBREW_BOTTLE_DOMAIN HOMEBREW_API_DOMAIN
unset HOMEBREW_CASK_GIT_REMOTE HOMEBREW_ARTIFACT_DOMAIN HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK
brew update
```

`unset` 只影响当前终端，不会清理 `brew.env` 或桌面端配置。完成后打开新终端，并退出后重新打开 BrewUI 验证；BrewUI 的隔离环境不会读取 `.zshrc` 中的镜像 exports。
