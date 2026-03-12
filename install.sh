#!/bin/zsh
# Homebrew 镜像源一键安装脚本 (macOS)
# 参考: https://docs.brew.sh/Installation
# 镜像源: 清华 TUNA / 中科大 USTC

set -e

# ========== 颜色定义 ==========
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # 无颜色

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
            echo "$HOME/.zshrc"
            ;;
        bash)
            if [[ -f "$HOME/.bash_profile" ]]; then
                echo "$HOME/.bash_profile"
            else
                echo "$HOME/.bashrc"
            fi
            ;;
        *)
            echo "$HOME/.zshrc"
            ;;
    esac
}

# ========== 系统检测 ==========
detect_os() {
    local os
    os="$(uname -s)"
    case "$os" in
        Darwin) echo "macos" ;;
        *)      abort "本脚本仅支持 macOS，当前系统: $os" ;;
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
    if [[ "$arch" == "arm64" ]]; then
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
    info "正在进行安装前置检查..."

    # 检查是否以 root 运行（不推荐）
    if [[ "$EUID" -eq 0 ]]; then
        warn "检测到以 root 用户运行，Homebrew 不推荐以 root 安装。"
        warn "如果你确定要继续，请按 Enter 键；否则按 Ctrl+C 退出。"
        read -r
    fi

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

    # 检查 git
    if ! command_exists git; then
        abort "未检测到 git，请确认 Xcode Command Line Tools 已正确安装:\n  xcode-select --install"
    fi

    # 检查 curl
    if ! command_exists curl; then
        abort "未检测到 curl，请先安装 Xcode Command Line Tools: xcode-select --install"
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
    echo -e "  ${GREEN}1)${NC} 清华大学 TUNA  (${CYAN}https://mirrors.tuna.tsinghua.edu.cn${NC})"
    echo -e "  ${GREEN}2)${NC} 中国科学技术大学 USTC  (${CYAN}https://mirrors.ustc.edu.cn${NC})"
    echo -e "  ${GREEN}3)${NC} 官方源 (不使用镜像，需要良好的网络环境)"
    echo ""
    echo -n -e "请输入选项 [${GREEN}1${NC}/${GREEN}2${NC}/${GREEN}3${NC}] (默认: 1): "
    read -r mirror_choice

    case "$mirror_choice" in
        2)
            MIRROR_NAME="USTC"
            BREW_GIT_REMOTE="https://mirrors.ustc.edu.cn/brew.git"
            HOMEBREW_CORE_GIT_REMOTE="https://mirrors.ustc.edu.cn/homebrew-core.git"
            HOMEBREW_BOTTLE_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles"
            HOMEBREW_API_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles/api"
            HOMEBREW_CASK_GIT_REMOTE="https://mirrors.ustc.edu.cn/homebrew-cask.git"
            ;;
        3)
            MIRROR_NAME="官方源"
            BREW_GIT_REMOTE="https://github.com/Homebrew/brew"
            HOMEBREW_CORE_GIT_REMOTE="https://github.com/Homebrew/homebrew-core"
            HOMEBREW_BOTTLE_DOMAIN=""
            HOMEBREW_API_DOMAIN=""
            HOMEBREW_CASK_GIT_REMOTE=""
            ;;
        *)
            MIRROR_NAME="TUNA"
            BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"
            HOMEBREW_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"
            HOMEBREW_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles"
            HOMEBREW_API_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/api"
            HOMEBREW_CASK_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-cask.git"
            ;;
    esac

    echo ""
    info "已选择镜像源: ${BOLD}${MIRROR_NAME}${NC}"
}

# ========== 安装 Homebrew ==========
install_homebrew() {
    local arch="$1"
    local prefix
    prefix="$(get_homebrew_prefix "$arch")"

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
        configure_mirror "$prefix"
        configure_shell_env "$arch" "$prefix"
        success "镜像源配置完成！"
        show_finish_info "$prefix"
        return
    fi

    info "开始安装 Homebrew..."
    info "安装目录: $prefix"
    echo ""

    # 创建安装目录
    if [[ ! -d "$prefix" ]]; then
        info "创建 Homebrew 安装目录 $prefix ..."
        sudo mkdir -p "$prefix"
        sudo chown -R "$(whoami):admin" "$prefix"
    fi

    # 使用 git clone 安装 Homebrew
    info "从 ${MIRROR_NAME} 克隆 Homebrew 仓库..."
    
    local max_retries=3
    local retry_count=0
    local clone_success=false

    while [[ $retry_count -lt $max_retries ]]; do
        if [[ -d "$prefix/.git" ]]; then
            info "检测到已有的 git 仓库，更新中... (尝试 $((retry_count+1))/$max_retries)"
            git -C "$prefix" remote set-url origin "$BREW_GIT_REMOTE"
            if git -C "$prefix" fetch --force origin; then
                git -C "$prefix" reset --hard origin/master
                clone_success=true
                break
            fi
        else
            info "正在克隆... (尝试 $((retry_count+1))/$max_retries)"
            if git clone --depth=1 "$BREW_GIT_REMOTE" "$prefix"; then
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

    if [[ "$clone_success" != true || ! -f "$prefix/bin/brew" ]]; then
        abort "Homebrew 安装失败！\n  已尝试 $max_retries 次均失败。\n  这通常是因为所选镜像源（如清华 TUNA）当前服务不稳定或正在同步中（返回 502/504 错误）。\n  建议：重新运行脚本并选择【中科大 USTC】镜像源，或稍后再试。"
    fi

    success "Homebrew 核心仓库克隆完成！"

    # 配置镜像
    configure_mirror "$prefix"

    # 配置 shell 环境变量
    configure_shell_env "$arch" "$prefix"

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

    if [[ "$MIRROR_NAME" == "官方源" ]]; then
        info "使用官方源，跳过镜像配置。"
        return
    fi

    info "配置 ${MIRROR_NAME} 镜像源..."

    # 设置 brew git remote
    git -C "$prefix" remote set-url origin "$BREW_GIT_REMOTE" 2>/dev/null || true

    # 设置环境变量到 shell 配置文件
    local shell_profile
    shell_profile="$(get_shell_profile)"

    # 先移除旧的 Homebrew 镜像配置
    if [[ -f "$shell_profile" ]]; then
        # 创建备份
        cp "$shell_profile" "${shell_profile}.homebrew_backup.$(date +%Y%m%d%H%M%S)"

        # 移除旧的 Homebrew 镜像相关配置
        local temp_file
        temp_file="$(mktemp)"
        grep -v "HOMEBREW_BREW_GIT_REMOTE\|HOMEBREW_CORE_GIT_REMOTE\|HOMEBREW_BOTTLE_DOMAIN\|HOMEBREW_API_DOMAIN\|HOMEBREW_CASK_GIT_REMOTE\|# Homebrew 镜像" "$shell_profile" > "$temp_file" 2>/dev/null || true
        mv "$temp_file" "$shell_profile"
    fi

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
    local shell_profile
    shell_profile="$(get_shell_profile)"

    # 检查是否已经有 brew shellenv 配置
    if [[ -f "$shell_profile" ]] && grep -q "brew shellenv" "$shell_profile" 2>/dev/null; then
        info "Shell 环境变量已配置，跳过。"
        return
    fi

    info "配置 Homebrew 环境变量到 $shell_profile ..."

    {
        echo ""
        echo "# Homebrew 环境配置"
        echo "eval \"\$($prefix/bin/brew shellenv)\""
    } >> "$shell_profile"

    success "Homebrew 环境变量已写入 $shell_profile"
}

# ========== 完成信息 ==========
show_finish_info() {
    local prefix="$1"
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

    if [[ "$MIRROR_NAME" != "官方源" ]]; then
        echo -e "${BOLD}切换回官方源:${NC}"
        echo -e "  编辑 ${CYAN}$shell_profile${NC}，删除 Homebrew 镜像配置相关行，然后运行:"
        echo -e "  ${CYAN}git -C \"\$(brew --repo)\" remote set-url origin https://github.com/Homebrew/brew${NC}"
        echo -e "  ${CYAN}brew update-reset${NC}"
        echo ""
    fi
}

# ========== 卸载功能 ==========
show_uninstall_help() {
    echo ""
    echo -e "${BOLD}${RED}卸载 Homebrew:${NC}"
    echo ""
    echo -e "  运行以下命令卸载:"
    echo -e "  ${CYAN}/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)\"${NC}"
    echo ""
    echo -e "  如果无法访问 GitHub，可使用镜像:"
    echo -e "  ${CYAN}/bin/bash -c \"\$(curl -fsSL https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/install/uninstall.sh)\"${NC}"
    echo ""
}

# ========== 主流程 ==========
main() {
    # 检测系统
    local os arch
    os="$(detect_os)"
    arch="$(detect_arch)"

    info "检测到系统: ${BOLD}macOS${NC} (${arch})"

    # 处理命令行参数
    if [[ "${1:-}" == "--uninstall" || "${1:-}" == "-u" ]]; then
        show_uninstall_help
        exit 0
    fi

    # 选择镜像源
    select_mirror

    # 前置检查
    preflight_check

    # 安装 Homebrew
    install_homebrew "$arch"

    # 显示完成信息
    local prefix
    prefix="$(get_homebrew_prefix "$arch")"
    show_finish_info "$prefix"
}

# 运行主流程
main "$@"
