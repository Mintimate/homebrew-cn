#!/bin/bash
# Homebrew 镜像源一键安装脚本 (macOS & Linux)
# 参考: https://docs.brew.sh/Installation
#       https://docs.brew.sh/Homebrew-on-Linux
# 镜像源: 清华 TUNA / 中科大 USTC / 阿里云 Aliyun

set -e

# ========== 颜色定义 ==========
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No color

# ========== 工具函数 ==========
info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

error() {
    echo -e "${RED}[错误]${NC} $1"
}

abort() {
    error "$1"
    exit 1
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 获取当前 shell 配置文件
get_shell_profile() {
    local shell_name
    shell_name="$(basename "$SHELL")"
    case "$shell_name" in
        zsh)
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                echo "$HOME/.zshrc"
            elif [[ -f "$HOME/.zshrc" ]]; then
                echo "$HOME/.zshrc"
            else
                echo "$HOME/.zshrc"
            fi
            ;;
        bash)
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                echo "$HOME/.bashrc"
            elif [[ -f "$HOME/.bash_profile" ]]; then
                echo "$HOME/.bash_profile"
            else
                echo "$HOME/.bashrc"
            fi
            ;;
        *)
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                echo "$HOME/.bashrc"
            else
                echo "$HOME/.zshrc"
            fi
            ;;
    esac
}

# ========== 系统检测 ==========
detect_os() {
    local os
    os="$(uname -s)"
    case "$os" in
        Darwin) echo "macos" ;;
        Linux)  echo "linux" ;;
        *)      abort "本脚本仅支持 macOS 和 Linux，当前系统: $os" ;;
    esac
}

detect_arch() {
    local arch
    arch="$(uname -m)"
    case "$arch" in
        x86_64)  echo "x86_64" ;;
        arm64|aarch64) echo "arm64" ;;
        *)       abort "不支持的处理器架构: $arch" ;;
    esac
}

# 获取 Homebrew 安装前缀
get_homebrew_prefix() {
    local arch="$1"
    local os="$2"
    if [[ "$os" == "linux" ]]; then
        echo "/home/linuxbrew/.linuxbrew"
    elif [[ "$arch" == "arm64" ]]; then
        echo "/opt/homebrew"
    else
        echo "/usr/local"
    fi
}

# ========== 前置检查 ==========

# 检测 Xcode Command Line Tools 是否已安装
check_xcode_clt() {
    xcode-select -p &>/dev/null
}

# 等待 Xcode CLT 安装完成（轮询检测）
wait_for_xcode_clt() {
    local max_wait=600  # 最多等待 10 分钟
    local elapsed=0
    local interval=5

    echo ""
    echo -e "${BOLD}${YELLOW}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${YELLOW}║  ⏳ 正在等待 Xcode Command Line Tools 安装...   ║${NC}"
    echo -e "${BOLD}${YELLOW}║                                                  ║${NC}"
    echo -e "${BOLD}${YELLOW}║  请在弹出的对话框中点击 "安装" 按钮，           ║${NC}"
    echo -e "${BOLD}${YELLOW}║  安装完成后脚本将自动继续。                      ║${NC}"
    echo -e "${BOLD}${YELLOW}║                                                  ║${NC}"
    echo -e "${BOLD}${YELLOW}║  💡 如果没有看到弹窗，请手动运行:                ║${NC}"
    echo -e "${BOLD}${YELLOW}║     xcode-select --install                       ║${NC}"
    echo -e "${BOLD}${YELLOW}╚══════════════════════════════════════════════════╝${NC}"
    echo ""

    while ! check_xcode_clt; do
        if [[ $elapsed -ge $max_wait ]]; then
            echo ""
            abort "等待超时（${max_wait}秒）。请手动安装 Xcode Command Line Tools 后重新运行本脚本:\n  xcode-select --install"
        fi
        printf "\r${BLUE}[信息]${NC} 等待安装中... 已等待 %d 秒 ⏳" "$elapsed"
        sleep "$interval"
        elapsed=$((elapsed + interval))
    done

    echo ""
    success "Xcode Command Line Tools 安装完成！ ✅"
    echo ""
}

preflight_check() {
    local os="$1"
    info "正在进行安装前置检查..."

    # 检查是否以 root 运行（不推荐）
    if [[ "$EUID" -eq 0 ]]; then
        warn "检测到以 root 用户运行，Homebrew 不推荐以 root 安装。"
        warn "如果你确定要继续，请按 Enter 键；否则按 Ctrl+C 退出。"
        read -r
    fi

    if [[ "$os" == "macos" ]]; then
        # 检查 Xcode Command Line Tools（macOS 上 git/curl 等都依赖它）
        if ! check_xcode_clt; then
            warn "未检测到 Xcode Command Line Tools，这是安装 Homebrew 的前置依赖。"
            info "正在触发 Xcode Command Line Tools 安装..."
            xcode-select --install 2>/dev/null || true
            # 等待安装完成，而不是退出脚本
            wait_for_xcode_clt
        else
            success "Xcode Command Line Tools 已安装 ✅"
        fi
    elif [[ "$os" == "linux" ]]; then
        # Linux: 检查必要的构建工具和依赖
        info "检查 Linux 构建依赖..."
        check_linux_dependencies
    fi

    # 检查 git
    if ! command_exists git; then
        if [[ "$os" == "macos" ]]; then
            abort "未检测到 git，请确认 Xcode Command Line Tools 已正确安装:\n  xcode-select --install"
        else
            abort "未检测到 git，请先安装 git:\n  Ubuntu/Debian: sudo apt-get install git\n  Fedora/RHEL: sudo dnf install git\n  Arch: sudo pacman -S git"
        fi
    fi

    # 检查 curl
    if ! command_exists curl; then
        if [[ "$os" == "macos" ]]; then
            abort "未检测到 curl，请先安装 Xcode Command Line Tools: xcode-select --install"
        else
            abort "未检测到 curl，请先安装 curl:\n  Ubuntu/Debian: sudo apt-get install curl\n  Fedora/RHEL: sudo dnf install curl\n  Arch: sudo pacman -S curl"
        fi
    fi
}

# ========== Linux 依赖检查 ==========
check_linux_dependencies() {
    local missing_deps=()

    # 检查基础构建工具
    if ! command_exists gcc && ! command_exists cc; then
        missing_deps+=("gcc/build-essential")
    fi

    if ! command_exists make; then
        missing_deps+=("make")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        warn "检测到以下构建依赖缺失: ${missing_deps[*]}"
        echo ""
        echo -e "${BOLD}请根据你的发行版安装构建工具:${NC}"
        if command_exists apt-get; then
            echo -e "  ${CYAN}sudo apt-get install build-essential procps curl file git${NC}"
        elif command_exists dnf; then
            echo -e "  ${CYAN}sudo dnf group install 'Development Tools'${NC}"
            echo -e "  ${CYAN}sudo dnf install procps-ng curl file git${NC}"
        elif command_exists yum; then
            echo -e "  ${CYAN}sudo yum groupinstall 'Development Tools'${NC}"
            echo -e "  ${CYAN}sudo yum install procps-ng curl file git${NC}"
        elif command_exists pacman; then
            echo -e "  ${CYAN}sudo pacman -S base-devel procps-ng curl file git${NC}"
        elif command_exists apk; then
            echo -e "  ${CYAN}sudo apk add build-base procps curl file git${NC}"
        fi
        echo ""
        echo -n -e "是否继续安装？依赖可以稍后再安装。[${GREEN}Y${NC}/${RED}n${NC}]: "
        read -r continue_choice
        if [[ "$continue_choice" =~ ^[Nn]$ ]]; then
            info "已取消安装。请安装依赖后重新运行本脚本。"
            exit 0
        fi
    else
        success "Linux 构建依赖检查通过 ✅"
    fi
}

# ========== 镜像源选择 ==========
select_mirror() {
    echo ""
    echo -e "${BOLD}${CYAN}======================================${NC}"
    echo -e "${BOLD}${CYAN}   Homebrew 镜像源一键安装脚本   ${NC}"
    echo -e "${BOLD}${CYAN}   作者: Mintimate${NC}"
    echo -e "${BOLD}${CYAN}   博客: https://www.mintimate.cn${NC}"
    echo -e "${BOLD}${CYAN}   GitHub: https://github.com/Mintimate${NC}"
    echo -e "${BOLD}${CYAN}======================================${NC}"
    echo ""
    echo -e "请选择镜像源:"
    echo -e "  ${GREEN}1)${NC} 中国科学技术大学 USTC  (${CYAN}https://mirrors.ustc.edu.cn${NC})"
    echo -e "  ${GREEN}2)${NC} 阿里云 Aliyun  (${CYAN}https://mirrors.aliyun.com/homebrew/${NC})"
    echo -e "  ${GREEN}3)${NC} 清华大学 TUNA  (${CYAN}https://mirrors.tuna.tsinghua.edu.cn${NC})"
    echo -e "  ${GREEN}4)${NC} 官方源 (不使用镜像，需要良好的网络环境)"
    echo ""
    echo -n -e "请输入选项 [${GREEN}1${NC}/${GREEN}2${NC}/${GREEN}3${NC}/${GREEN}4${NC}] (默认: 1): "
    read -r mirror_choice

    # 默认使用 shallow clone
    MIRROR_NO_SHALLOW=false

    case "$mirror_choice" in
        2)
            MIRROR_NAME="Aliyun"
            BREW_GIT_REMOTE="https://mirrors.aliyun.com/homebrew/brew.git"
            HOMEBREW_CORE_GIT_REMOTE="https://mirrors.aliyun.com/homebrew/homebrew-core.git"
            HOMEBREW_BOTTLE_DOMAIN="https://mirrors.aliyun.com/homebrew/homebrew-bottles"
            HOMEBREW_API_DOMAIN="https://mirrors.aliyun.com/homebrew/homebrew-bottles/api"
            HOMEBREW_CASK_GIT_REMOTE="https://mirrors.aliyun.com/homebrew/homebrew-cask.git"
            ;;
        3)
            MIRROR_NAME="TUNA"
            BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"
            HOMEBREW_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"
            HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles"
            HOMEBREW_API_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/api"
            HOMEBREW_CASK_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-cask.git"
            ;;
        4)
            MIRROR_NAME="官方源"
            BREW_GIT_REMOTE="https://github.com/Homebrew/brew"
            HOMEBREW_CORE_GIT_REMOTE="https://github.com/Homebrew/homebrew-core"
            HOMEBREW_BOTTLE_DOMAIN=""
            HOMEBREW_API_DOMAIN=""
            HOMEBREW_CASK_GIT_REMOTE=""
            ;;
        5)
            # 🎉 隐藏彩蛋：腾讯云镜像源
            # 腾讯云使用 dumb HTTP 协议，不支持 shallow clone，因此需要完整克隆
            MIRROR_NAME="Tencent (腾讯云)"
            BREW_GIT_REMOTE="https://mirrors.cloud.tencent.com/homebrew/brew.git"
            HOMEBREW_CORE_GIT_REMOTE="https://mirrors.cloud.tencent.com/homebrew/homebrew-core.git"
            HOMEBREW_BOTTLE_DOMAIN="https://mirrors.cloud.tencent.com/homebrew-bottles"
            HOMEBREW_API_DOMAIN="https://mirrors.cloud.tencent.com/homebrew-bottles/api"
            HOMEBREW_CASK_GIT_REMOTE="https://mirrors.cloud.tencent.com/homebrew/homebrew-cask.git"
            MIRROR_NO_SHALLOW=true
            ;;

        *)
            MIRROR_NAME="USTC"
            BREW_GIT_REMOTE="https://mirrors.ustc.edu.cn/brew.git"
            HOMEBREW_CORE_GIT_REMOTE="https://mirrors.ustc.edu.cn/homebrew-core.git"
            HOMEBREW_BOTTLE_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles"
            HOMEBREW_API_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles/api"
            HOMEBREW_CASK_GIT_REMOTE="https://mirrors.ustc.edu.cn/homebrew-cask.git"
            ;;
    esac

    echo ""
    if [[ "$MIRROR_NO_SHALLOW" == true ]]; then
        echo -e "${BOLD}${CYAN}🎉 彩蛋！你发现了隐藏的腾讯云镜像源！${NC}"
        warn "腾讯云镜像使用 dumb HTTP 协议，不支持 shallow clone，将使用完整克隆（速度较慢）。"
    fi
    info "已选择镜像源: ${BOLD}${MIRROR_NAME}${NC}"
}

# ========== 安装 Homebrew ==========
install_homebrew() {
    local arch="$1"
    local os="$2"
    local prefix
    prefix="$(get_homebrew_prefix "$arch" "$os")"

    # Determine HOMEBREW_REPOSITORY
    local homebrew_repo
    if [[ "$os" == "linux" ]]; then
        homebrew_repo="$prefix/Homebrew"
    elif [[ "$arch" == "arm64" ]]; then
        homebrew_repo="$prefix"
    else
        homebrew_repo="$prefix/Homebrew"
    fi

    # 检查是否已安装
    if [[ -f "$prefix/bin/brew" ]]; then
        warn "检测到 Homebrew 已安装在 $prefix"
        echo -n -e "是否要重新配置镜像源？[${GREEN}Y${NC}/${RED}n${NC}]: "
        read -r reinstall_choice
        if [[ "$reinstall_choice" =~ ^[Nn]$ ]]; then
            info "跳过安装，退出脚本。"
            exit 0
        fi
        info "将为已有的 Homebrew 重新配置镜像源..."
        configure_mirror "$prefix" "$homebrew_repo"
        configure_shell_env "$arch" "$prefix" "$os"
        success "镜像源配置完成！"
        show_finish_info "$prefix" "$os"
        return
    fi

    info "开始安装 Homebrew..."
    info "安装目录: $prefix"
    echo ""

    # 创建安装目录
    if [[ ! -d "$prefix" ]]; then
        info "创建 Homebrew 安装目录 $prefix ..."
        if [[ "$os" == "linux" ]]; then
            sudo mkdir -p "$prefix"
            sudo chown -R "$(whoami)" "$prefix"
        else
            sudo mkdir -p "$prefix"
            sudo chown -R "$(whoami):admin" "$prefix"
        fi
    fi

    # For Linux, HOMEBREW_REPOSITORY is a subdirectory
    if [[ "$homebrew_repo" != "$prefix" && ! -d "$homebrew_repo" ]]; then
        info "创建 Homebrew 仓库目录 $homebrew_repo ..."
        sudo mkdir -p "$homebrew_repo"
        sudo chown -R "$(whoami)" "$homebrew_repo"
    fi

    # 使用 git clone 安装 Homebrew
    info "从 ${MIRROR_NAME} 克隆 Homebrew 仓库..."

    local max_retries=3
    local retry_count=0
    local clone_success=false

    while [[ $retry_count -lt $max_retries ]]; do
        if [[ -d "$homebrew_repo/.git" ]]; then
            info "检测到已有的 git 仓库，更新中... (尝试 $((retry_count+1))/$max_retries)"
            git -C "$homebrew_repo" remote set-url origin "$BREW_GIT_REMOTE"
            if git -C "$homebrew_repo" fetch --force origin && git -C "$homebrew_repo" reset --hard origin/master; then
                clone_success=true
                break
            fi
        else
            info "正在克隆... (尝试 $((retry_count+1))/$max_retries)"
            # 采用 init + fetch + reset 的方式，避免目标目录非空时 clone 失败
            git -C "$homebrew_repo" init -q
            git -C "$homebrew_repo" config remote.origin.url "$BREW_GIT_REMOTE"
            git -C "$homebrew_repo" config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
            local fetch_args=(--force origin)
            if [[ "$MIRROR_NO_SHALLOW" != true ]]; then
                fetch_args=(--force --depth=1 origin)
            fi
            if git -C "$homebrew_repo" fetch "${fetch_args[@]}" && git -C "$homebrew_repo" reset --hard origin/master; then
                clone_success=true
                break
            fi
        fi

        retry_count=$((retry_count+1))
        if [[ $retry_count -lt $max_retries ]]; then
            warn "克隆失败，可能是镜像源服务器不稳定 (如 502 错误)。等待 3 秒后重试..."
            sleep 3
        fi
    done

    if [[ "$clone_success" != true ]]; then
        abort "Homebrew 安装失败！\n  已尝试 $max_retries 次均失败。\n  这通常是因为所选镜像源当前服务不稳定。\n  建议：重新运行脚本并选择【中科大 USTC】镜像源，或稍后再试。"
    fi

    # For Linux/Intel Mac, create the symlink: prefix/bin/brew -> ../Homebrew/bin/brew
    if [[ "$homebrew_repo" != "$prefix" ]]; then
        mkdir -p "$prefix/bin"
        ln -sf "../Homebrew/bin/brew" "$prefix/bin/brew"
    fi

    if [[ ! -f "$prefix/bin/brew" ]]; then
        abort "Homebrew 安装失败！brew 可执行文件未找到。"
    fi

    success "Homebrew 核心仓库克隆完成！"

    # 配置镜像
    configure_mirror "$prefix" "$homebrew_repo"

    # 配置 shell 环境变量
    configure_shell_env "$arch" "$prefix" "$os"

    # 立即加载环境变量
    eval "$("$prefix/bin/brew" shellenv)"

    # 更新
    info "运行 brew update..."
    "$prefix/bin/brew" update --force --quiet 2>/dev/null || true

    success "Homebrew 安装成功！"
}

# ========== 配置镜像源 ==========
configure_mirror() {
    local prefix="$1"
    local homebrew_repo="${2:-$prefix}"
    local shell_profile
    shell_profile="$(get_shell_profile)"

    # 先移除旧的 Homebrew 镜像配置
    if [[ -f "$shell_profile" ]]; then
        # 创建备份
        cp "$shell_profile" "${shell_profile}.homebrew_backup.$(date +%Y%m%d%H%M%S)"

        # 移除旧的 Homebrew 镜像相关配置，并清理多余的空行
        local temp_file
        temp_file="$(mktemp)"
        awk '
        /HOMEBREW_BREW_GIT_REMOTE|HOMEBREW_CORE_GIT_REMOTE|HOMEBREW_BOTTLE_DOMAIN|HOMEBREW_API_DOMAIN|HOMEBREW_CASK_GIT_REMOTE|# Homebrew 镜像/ { next }
        NF == 0 { blank++ }
        NF > 0 { blank=0 }
        blank <= 1 { print }
        ' "$shell_profile" > "$temp_file" 2>/dev/null || true
        mv "$temp_file" "$shell_profile"
    fi

    # 设置 brew git remote
    git -C "$homebrew_repo" remote set-url origin "$BREW_GIT_REMOTE" 2>/dev/null || true

    if [[ "$MIRROR_NAME" == "官方源" ]]; then
        info "使用官方源，已清理旧的镜像配置。"
        return
    fi

    info "配置 ${MIRROR_NAME} 镜像源..."

    # 写入新的镜像配置
    {
        echo ""
        echo "# Homebrew 镜像配置 (${MIRROR_NAME})"
        echo "export HOMEBREW_BREW_GIT_REMOTE=\"$BREW_GIT_REMOTE\""
        echo "export HOMEBREW_CORE_GIT_REMOTE=\"$HOMEBREW_CORE_GIT_REMOTE\""
        echo "export HOMEBREW_BOTTLE_DOMAIN=\"$HOMEBREW_BOTTLE_DOMAIN\""
        echo "export HOMEBREW_API_DOMAIN=\"$HOMEBREW_API_DOMAIN\""
        [[ -n "$HOMEBREW_CASK_GIT_REMOTE" ]] && echo "export HOMEBREW_CASK_GIT_REMOTE=\"$HOMEBREW_CASK_GIT_REMOTE\""
    } >> "$shell_profile"

    success "镜像源环境变量已写入 $shell_profile"
}

# ========== 配置 Shell 环境 ==========
configure_shell_env() {
    local arch="$1"
    local prefix="$2"
    local os="${3:-macos}"
    local shell_profile
    shell_profile="$(get_shell_profile)"

    # 先移除旧的 Homebrew 环境配置
    if [[ -f "$shell_profile" ]]; then
        local temp_file
        temp_file="$(mktemp)"
        awk '
        /brew shellenv|# Homebrew 环境配置/ { next }
        NF == 0 { blank++ }
        NF > 0 { blank=0 }
        blank <= 1 { print }
        ' "$shell_profile" > "$temp_file" 2>/dev/null || true
        mv "$temp_file" "$shell_profile"
    fi

    info "配置 Homebrew 环境变量到 $shell_profile ..."

    local shell_name
    shell_name="$(basename "$SHELL")"

    {
        echo ""
        echo "# Homebrew 环境配置"
        echo "eval \"\$($prefix/bin/brew shellenv)\""
    } >> "$shell_profile"

    success "Homebrew 环境变量已写入 $shell_profile"

    # Linux 上额外提示安装 GCC
    if [[ "$os" == "linux" ]]; then
        echo ""
        info "💡 建议在安装完成后运行 ${CYAN}brew install gcc${NC} 以获得最佳体验。"
    fi
}

# ========== 完成信息 ==========
show_finish_info() {
    local prefix="$1"
    local os="${2:-macos}"
    local shell_profile
    shell_profile="$(get_shell_profile)"

    echo ""
    echo -e "${BOLD}${GREEN}============================================${NC}"
    echo -e "${BOLD}${GREEN}       Homebrew 安装/配置完成！🍺          ${NC}"
    echo -e "${BOLD}${GREEN}============================================${NC}"
    echo ""
    echo -e "  ${BOLD}安装路径:${NC}    $prefix"
    echo -e "  ${BOLD}镜像源:${NC}      $MIRROR_NAME"
    echo -e "  ${BOLD}配置文件:${NC}    $shell_profile"
    echo ""
    echo -e "${YELLOW}请执行以下命令使配置生效:${NC}"
    echo ""
    echo -e "  ${CYAN}source $shell_profile${NC}"
    echo ""
    echo -e "然后验证安装:"
    echo ""
    echo -e "  ${CYAN}brew --version${NC}"
    echo -e "  ${CYAN}brew doctor${NC}"
    echo ""
    echo -e "${BOLD}常用命令:${NC}"
    echo -e "  ${CYAN}brew install <软件名>${NC}     安装软件"
    echo -e "  ${CYAN}brew search <关键词>${NC}      搜索软件"
    echo -e "  ${CYAN}brew update${NC}               更新 Homebrew"
    echo -e "  ${CYAN}brew upgrade${NC}              升级所有已安装的软件"
    echo -e "  ${CYAN}brew list${NC}                 列出已安装的软件"
    echo ""

    if [[ "$os" == "linux" ]]; then
        echo -e "${BOLD}Linux 用户推荐:${NC}"
        echo -e "  ${CYAN}brew install gcc${NC}          安装 GCC（编译软件包可能需要）"
        echo ""
        echo -e "${BOLD}安装构建依赖（如果尚未安装）:${NC}"
        if command_exists apt-get; then
            echo -e "  ${CYAN}sudo apt-get install build-essential${NC}"
        elif command_exists dnf; then
            echo -e "  ${CYAN}sudo dnf group install 'Development Tools'${NC}"
        elif command_exists yum; then
            echo -e "  ${CYAN}sudo yum groupinstall 'Development Tools'${NC}"
        elif command_exists pacman; then
            echo -e "  ${CYAN}sudo pacman -S base-devel${NC}"
        elif command_exists apk; then
            echo -e "  ${CYAN}sudo apk add build-base${NC}"
        fi
        echo ""
    fi

    if [[ "$MIRROR_NAME" != "官方源" ]]; then
        echo -e "${BOLD}切换回官方源:${NC}"
        echo -e "  编辑 ${CYAN}$shell_profile${NC}，删除 Homebrew 镜像配置相关行，然后运行:"
        echo -e "  ${CYAN}git -C \"\$(brew --repo)\" remote set-url origin https://github.com/Homebrew/brew${NC}"
        echo -e "  ${CYAN}brew update-reset${NC}"
        echo ""
    fi
}

# ========== 卸载功能 ==========
uninstall_homebrew() {
    local arch="$1"
    local os="$2"
    local prefix
    prefix="$(get_homebrew_prefix "$arch" "$os")"

    echo ""
    echo -e "${BOLD}${RED}============================================${NC}"
    echo -e "${BOLD}${RED}       Homebrew 卸载程序 🗑️               ${NC}"
    echo -e "${BOLD}${RED}============================================${NC}"
    echo ""

    # 检查 Homebrew 是否已安装
    if [[ ! -f "$prefix/bin/brew" ]]; then
        warn "未检测到 Homebrew 安装（$prefix/bin/brew 不存在）。"
        echo ""
        echo -e "如果 Homebrew 安装在其他位置，你可以手动删除相关目录。"
        echo -e "常见安装位置："
        echo -e "  ${CYAN}/opt/homebrew${NC}                  (macOS Apple Silicon)"
        echo -e "  ${CYAN}/usr/local${NC}                     (macOS Intel)"
        echo -e "  ${CYAN}/home/linuxbrew/.linuxbrew${NC}     (Linux)"
        echo ""
        exit 1
    fi

    info "检测到 Homebrew 安装在: ${BOLD}$prefix${NC}"
    echo ""

    # 列出已安装的软件包数量
    local formula_count=0
    local cask_count=0
    formula_count=$("$prefix/bin/brew" list --formula 2>/dev/null | wc -l | tr -d ' ') || true
    cask_count=$("$prefix/bin/brew" list --cask 2>/dev/null | wc -l | tr -d ' ') || true

    if [[ "$formula_count" -gt 0 || "$cask_count" -gt 0 ]]; then
        warn "当前已安装 ${BOLD}${formula_count}${NC}${YELLOW} 个 Formula、${BOLD}${cask_count}${NC}${YELLOW} 个 Cask。${NC}"
    fi

    echo ""
    echo -e "${BOLD}${YELLOW}⚠️  此操作将执行以下步骤:${NC}"
    echo -e "  1. 卸载所有已安装的 Cask 应用"
    echo -e "  2. 卸载所有已安装的 Formula 软件包"
    echo -e "  3. 删除 Homebrew 安装目录 ($prefix)"
    echo -e "  4. 清理相关缓存目录"
    echo -e "  5. 清理 Shell 配置文件中的 Homebrew 环境变量"
    echo ""
    echo -e "${BOLD}${RED}此操作不可逆！${NC}"
    echo ""
    echo -n -e "确认要卸载 Homebrew 吗？请输入 ${RED}yes${NC} 确认: "
    read -r confirm

    if [[ "$confirm" != "yes" ]]; then
        info "已取消卸载。"
        exit 0
    fi

    echo ""

    # Step 1: 卸载所有 Cask
    if [[ "$cask_count" -gt 0 ]]; then
        info "正在卸载所有 Cask 应用..."
        local cask_list
        cask_list=$("$prefix/bin/brew" list --cask 2>/dev/null) || true
        if [[ -n "$cask_list" ]]; then
            echo "$cask_list" | while read -r cask; do
                echo -e "  ${CYAN}卸载 Cask:${NC} $cask"
                "$prefix/bin/brew" uninstall --cask --force "$cask" 2>/dev/null || true
            done
        fi
        success "Cask 应用卸载完成。"
    fi

    # Step 2: 卸载所有 Formula
    if [[ "$formula_count" -gt 0 ]]; then
        info "正在卸载所有 Formula 软件包..."
        local formula_list
        formula_list=$("$prefix/bin/brew" list --formula 2>/dev/null) || true
        if [[ -n "$formula_list" ]]; then
            echo "$formula_list" | while read -r formula; do
                echo -e "  ${CYAN}卸载 Formula:${NC} $formula"
                "$prefix/bin/brew" uninstall --formula --force "$formula" 2>/dev/null || true
            done
        fi
        success "Formula 软件包卸载完成。"
    fi

    # Step 3: 执行 brew cleanup
    info "清理 Homebrew 缓存..."
    "$prefix/bin/brew" cleanup --prune=all -s 2>/dev/null || true

    # Step 4: 删除 Homebrew 相关目录
    info "删除 Homebrew 安装目录..."

    # 参考官方卸载脚本定义的目录列表
    local homebrew_dirs=()

    if [[ "$os" == "linux" ]]; then
        # Linux: 整个 /home/linuxbrew/.linuxbrew 都是 Homebrew 的
        homebrew_dirs=(
            "$prefix"
        )
    elif [[ "$arch" == "arm64" ]]; then
        # Apple Silicon: 整个 /opt/homebrew 都是 Homebrew 的
        homebrew_dirs=(
            "$prefix"
        )
    else
        # Intel Mac: /usr/local 下需要精确删除 Homebrew 相关子目录
        homebrew_dirs=(
            "$prefix/Homebrew"
            "$prefix/Caskroom"
            "$prefix/Cellar"
            "$prefix/bin/brew"
            "$prefix/share/doc/homebrew"
            "$prefix/etc/bash_completion.d/brew"
            "$prefix/lib/homebrew"
            "$prefix/share/man/man1/brew.1"
            "$prefix/share/zsh/site-functions/_brew"
            "$prefix/var/homebrew"
            "$prefix/opt"
        )
    fi

    # 通用缓存目录
    local cache_dirs=()
    if [[ "$os" == "linux" ]]; then
        cache_dirs=(
            "$HOME/.cache/Homebrew"
            "$HOME/.local/share/Homebrew"
        )
    else
        cache_dirs=(
            "$HOME/Library/Caches/Homebrew"
            "$HOME/Library/Logs/Homebrew"
        )
    fi

    for dir in "${homebrew_dirs[@]}"; do
        if [[ -e "$dir" ]]; then
            echo -e "  ${RED}删除:${NC} $dir"
            sudo rm -rf "$dir"
        fi
    done

    for dir in "${cache_dirs[@]}"; do
        if [[ -e "$dir" ]]; then
            echo -e "  ${RED}删除缓存:${NC} $dir"
            rm -rf "$dir"
        fi
    done

    success "Homebrew 目录清理完成。"

    # Step 5: 清理 Shell 配置文件中的 Homebrew 相关配置
    info "清理 Shell 配置文件..."
    local shell_profile
    shell_profile="$(get_shell_profile)"

    if [[ -f "$shell_profile" ]]; then
        # 创建备份
        cp "$shell_profile" "${shell_profile}.homebrew_uninstall_backup.$(date +%Y%m%d%H%M%S)"

        local temp_file
        temp_file="$(mktemp)"
        awk '
        /HOMEBREW_BREW_GIT_REMOTE|HOMEBREW_CORE_GIT_REMOTE|HOMEBREW_BOTTLE_DOMAIN|HOMEBREW_API_DOMAIN|HOMEBREW_CASK_GIT_REMOTE/ { next }
        /brew shellenv/ { next }
        /# Homebrew 镜像/ { next }
        /# Homebrew 环境配置/ { next }
        NF == 0 { blank++ }
        NF > 0 { blank=0 }
        blank <= 1 { print }
        ' "$shell_profile" > "$temp_file" 2>/dev/null || true
        mv "$temp_file" "$shell_profile"

        success "已清理 $shell_profile 中的 Homebrew 相关配置。"
    fi

    echo ""
    echo -e "${BOLD}${GREEN}============================================${NC}"
    echo -e "${BOLD}${GREEN}       Homebrew 卸载完成！✅               ${NC}"
    echo -e "${BOLD}${GREEN}============================================${NC}"
    echo ""
    echo -e "  ${BOLD}已清理的配置文件:${NC} $shell_profile"
    echo -e "  ${BOLD}备份文件:${NC} ${shell_profile}.homebrew_uninstall_backup.*"
    echo ""
    echo -e "${YELLOW}请执行以下命令使配置生效:${NC}"
    echo ""
    echo -e "  ${CYAN}source $shell_profile${NC}"
    echo ""
    echo -e "或者直接重新打开终端即可。"
    echo ""
}

# ========== 主流程 ==========
main() {
    # 检测系统
    local os arch
    os="$(detect_os)"
    arch="$(detect_arch)"

    if [[ "$os" == "macos" ]]; then
        info "检测到系统: ${BOLD}macOS${NC} (${arch})"
    else
        info "检测到系统: ${BOLD}Linux${NC} (${arch})"
    fi

    # 处理命令行参数
    if [[ "${1:-}" == "--uninstall" || "${1:-}" == "-u" ]]; then
        uninstall_homebrew "$arch" "$os"
        exit 0
    fi

    # 选择镜像源
    select_mirror

    # 前置检查
    preflight_check "$os"

    # 安装 Homebrew
    install_homebrew "$arch" "$os"

    # 显示完成信息
    local prefix
    prefix="$(get_homebrew_prefix "$arch" "$os")"
    show_finish_info "$prefix" "$os"
}

# 运行主流程
main "$@"
