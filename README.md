# 🍺 Homebrew 镜像一键安装脚本

> 使用镜像源快速安装 Homebrew 的一键脚本，内置清华 TUNA / 中科大 USTC 镜像源，告别龟速下载。

## ✨ 功能特性

- 🪞 **镜像源可选** — 支持清华 TUNA、中科大 USTC、官方源三选一
- 🖥️ **macOS 全架构** — 兼容 Intel (x86_64) 和 Apple Silicon (M1/M2/M3/M4)
- 🐚 **多 Shell 支持** — 自动适配 Zsh（默认）/ Bash，写入对应配置文件
- 🔍 **智能检测** — 自动检测系统架构、前置依赖（git、curl 等）
- 🔄 **已安装适配** — 已有 Homebrew 时可仅重新配置镜像源
- 💾 **自动备份** — 修改 Shell 配置文件前自动创建备份

## 🚀 快速开始

### 方式一：在线一键安装（推荐）

```zsh
/bin/zsh -c "$(curl -fsSL https://cnb.cool/Mintimate/tool-forge/homebrew-cn/-/git/raw/main/install.sh)"
```

如果无法访问 GitHub，也可以先将脚本下载到本地后运行：

```zsh
curl -fsSL -o install.sh https://cnb.cool/Mintimate/tool-forge/homebrew-cn/-/git/raw/main/install.sh
/bin/zsh install.sh
```

### 方式二：克隆仓库后运行

```zsh
git clone https://cnb.cool/Mintimate/tool-forge/homebrew-cn
cd homebrew-cn
/bin/zsh install.sh
```

### 查看卸载帮助

```zsh
/bin/zsh install.sh --uninstall
```

## 📋 使用流程

运行脚本后，按提示操作即可：

```
======================================
   Homebrew 镜像源一键安装脚本
======================================

请选择镜像源:
  1) 清华大学 TUNA  (https://mirrors.tuna.tsinghua.edu.cn)
  2) 中国科学技术大学 USTC  (https://mirrors.ustc.edu.cn)
  3) 官方源 (不使用镜像，需要良好的网络环境)

请输入选项 [1/2/3] (默认: 1):
```

安装完成后，执行以下命令使配置生效：

```zsh
source ~/.zshrc
```

验证安装：

```zsh
brew --version
brew doctor
```

## 🪞 镜像源说明

| 镜像源 | Git 仓库 | 二进制瓶 (Bottles) | API |
|--------|----------|-------------------|-----|
| **清华 TUNA** | `mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git` | `mirrors.tuna.tsinghua.edu.cn/homebrew-bottles` | `mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/api` |
| **USTC** | `mirrors.ustc.edu.cn/brew.git` | `mirrors.ustc.edu.cn/homebrew-bottles` | `mirrors.ustc.edu.cn/homebrew-bottles/api` |

脚本会自动配置以下环境变量：

```bash
export HOMEBREW_BREW_GIT_REMOTE="..."       # brew 主仓库
export HOMEBREW_CORE_GIT_REMOTE="..."       # homebrew-core 仓库
export HOMEBREW_BOTTLE_DOMAIN="..."         # 预编译二进制包下载地址
export HOMEBREW_API_DOMAIN="..."            # API 地址
export HOMEBREW_CASK_GIT_REMOTE="..."       # homebrew-cask 仓库
```

## 📍 安装路径

| 架构 | 安装路径 |
|------|----------|
| Apple Silicon (M1/M2/M3/M4) | `/opt/homebrew` |
| Intel (x86_64) | `/usr/local` |

## 🔄 切换回官方源

如果之后网络环境改善，想切换回官方源：

1. 编辑 `~/.zshrc`，删除 `# Homebrew 镜像配置` 相关行
2. 运行以下命令：

```zsh
git -C "$(brew --repo)" remote set-url origin https://github.com/Homebrew/brew
brew update-reset
```

## ❓ 常见问题

### Q: 安装后执行 `brew` 提示 "command not found"

A: 请先执行 `source ~/.zshrc` 使环境变量生效，或重新打开终端。

### Q: `brew update` 时报 Git 相关错误

A: 尝试执行：

```zsh
brew update-reset
```

### Q: 想更换镜像源怎么办？

A: 重新运行安装脚本，选择新的镜像源即可。脚本会自动清理旧配置并写入新配置。

### Q: macOS 提示需要安装 Xcode Command Line Tools

A: 脚本会自动触发安装，请在弹出的对话框中点击"安装"，安装完成后重新运行脚本。

### Q: 如何卸载 Homebrew？

A: 运行以下命令：

```zsh
/bin/zsh -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"
```

如果无法访问 GitHub，可使用清华镜像：

```zsh
/bin/zsh -c "$(curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/install/uninstall.sh)"
```

## 🔗 参考链接

- [Homebrew 官方安装文档](https://docs.brew.sh/Installation)
- [清华 TUNA Homebrew 镜像帮助](https://mirrors.tuna.tsinghua.edu.cn/help/homebrew/)
- [中科大 USTC Homebrew 镜像帮助](https://mirrors.ustc.edu.cn/help/brew.git.html)
- [Homebrew 官网](https://brew.sh/)

## 📄 许可证

MIT License
