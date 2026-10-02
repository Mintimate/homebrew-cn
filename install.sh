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
            echo "${ZDOTDIR:-$HOME}/.zshrc"
            ;;
        bash)
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                echo "$HOME/.bashrc"
            elif [[ -f "$HOME/.bash_profile" ]]; then
                echo "$HOME/.bash_profile"
            elif [[ -f "$HOME/.bash_login" ]]; then
                echo "$HOME/.bash_login"
            elif [[ -f "$HOME/.profile" ]]; then
                echo "$HOME/.profile"
            else
                echo "$HOME/.bash_profile"
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

# 在任何安装、换源或卸载操作前检查，避免写出属于 root 的文件。
check_not_root() {
    local current_uid
    current_uid="$(id -u)" || abort "无法确认当前用户身份，尚未修改任何文件。"
    if [[ "$current_uid" == "0" ]]; then
        abort "不能以 root 用户运行本脚本，否则可能导致 Homebrew 文件权限异常，影响安装和更新软件。尚未修改任何文件。请退出 root 会话，使用管理 Homebrew 的普通用户重新运行，不要在安装命令前加 sudo；需要管理员权限时脚本会单独提示。"
    fi
}

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
            MIRROR_CORE_GIT_REMOTE="https://mirrors.aliyun.com/homebrew/homebrew-core.git"
            MIRROR_BOTTLE_DOMAIN="https://mirrors.aliyun.com/homebrew/homebrew-bottles"
            MIRROR_API_DOMAIN="https://mirrors.aliyun.com/homebrew/homebrew-bottles/api"
            MIRROR_CASK_GIT_REMOTE="https://mirrors.aliyun.com/homebrew/homebrew-cask.git"
            ;;
        3)
            MIRROR_NAME="TUNA"
            BREW_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git"
            MIRROR_CORE_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-core.git"
            MIRROR_BOTTLE_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles"
            MIRROR_API_DOMAIN="https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/api"
            MIRROR_CASK_GIT_REMOTE="https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/homebrew-cask.git"
            ;;
        4)
            MIRROR_NAME="官方源"
            BREW_GIT_REMOTE="https://github.com/Homebrew/brew"
            MIRROR_CORE_GIT_REMOTE="https://github.com/Homebrew/homebrew-core"
            MIRROR_BOTTLE_DOMAIN=""
            MIRROR_API_DOMAIN=""
            MIRROR_CASK_GIT_REMOTE="https://github.com/Homebrew/homebrew-cask"
            ;;
        5)
            # 🎉 隐藏彩蛋：腾讯云镜像源
            # 腾讯云使用 dumb HTTP 协议，不支持 shallow clone，因此需要完整克隆
            MIRROR_NAME="Tencent (腾讯云)"
            BREW_GIT_REMOTE="https://mirrors.cloud.tencent.com/homebrew/brew.git"
            MIRROR_CORE_GIT_REMOTE="https://mirrors.cloud.tencent.com/homebrew/homebrew-core.git"
            MIRROR_BOTTLE_DOMAIN="https://mirrors.cloud.tencent.com/homebrew-bottles"
            MIRROR_API_DOMAIN="https://mirrors.cloud.tencent.com/homebrew-bottles/api"
            MIRROR_CASK_GIT_REMOTE="https://mirrors.cloud.tencent.com/homebrew/homebrew-cask.git"
            MIRROR_NO_SHALLOW=true
            ;;

        *)
            MIRROR_NAME="USTC"
            BREW_GIT_REMOTE="https://mirrors.ustc.edu.cn/brew.git"
            MIRROR_CORE_GIT_REMOTE="https://github.com/Homebrew/homebrew-core"
            MIRROR_BOTTLE_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles"
            MIRROR_API_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles/api"
            MIRROR_CASK_GIT_REMOTE="https://github.com/Homebrew/homebrew-cask"
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

    # 新安装必须使用仍在更新的 main；冻结的 master 不能作为回退。
    require_main_branch

    info "开始安装 Homebrew..."
    info "安装目录: $prefix"
    echo ""

    # 创建安装目录并确保权限正确
    if [[ "$os" == "linux" ]]; then
        if [[ ! -d "$prefix" ]]; then
            info "创建 Homebrew 安装目录 $prefix ..."
            sudo mkdir -p "$prefix"
        fi
        sudo chown -R "$(whoami)" "$prefix"
    elif [[ "$arch" == "arm64" ]]; then
        # Apple Silicon: /opt/homebrew 整个目录归 Homebrew 所有
        if [[ ! -d "$prefix" ]]; then
            info "创建 Homebrew 安装目录 $prefix ..."
            sudo mkdir -p "$prefix"
        fi
        sudo chown -R "$(whoami):admin" "$prefix"
    else
        # Intel Mac: /usr/local 通常已存在，但子目录可能没有写入权限
        # 需要确保 Homebrew 所需的子目录存在且当前用户可写
        local brew_dirs=(
            "$prefix/bin"
            "$prefix/etc"
            "$prefix/include"
            "$prefix/lib"
            "$prefix/sbin"
            "$prefix/share"
            "$prefix/var"
            "$prefix/opt"
            "$prefix/Cellar"
            "$prefix/Caskroom"
            "$prefix/Homebrew"
            "$prefix/Frameworks"
        )
        local dirs_to_fix=()
        for dir in "${brew_dirs[@]}"; do
            if [[ ! -d "$dir" ]] || [[ ! -w "$dir" ]]; then
                dirs_to_fix+=("$dir")
            fi
        done
        if [[ ${#dirs_to_fix[@]} -gt 0 ]]; then
            info "创建/修复 Homebrew 安装目录权限 ($prefix) ..."
            sudo mkdir -p "${dirs_to_fix[@]}"
            sudo chown "$(whoami):admin" "${dirs_to_fix[@]}"
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
            if git -C "$homebrew_repo" fetch --force origin +refs/heads/main:refs/remotes/origin/main && git -C "$homebrew_repo" checkout --force -B main origin/main; then
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
            if git -C "$homebrew_repo" fetch "${fetch_args[@]}" +refs/heads/main:refs/remotes/origin/main && git -C "$homebrew_repo" checkout --force -B main origin/main; then
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

    # 保留原始错误输出；核心文件存在不代表安装已经成功。
    update_and_verify "$prefix"
}

# ========== V7 兼容性与配置迁移 ==========
check_macos_support() {
    local os="$1" arch="$2" mode="${3:-existing}" version major
    [[ "$os" == "macos" ]] || return 0
    version="$(sw_vers -productVersion)"
    major="${version%%.*}"
    info "macOS 版本: $version"
    if [[ "$major" -le 10 ]]; then
        if [[ "$mode" == "new" ]]; then
            abort "Homebrew 7 已不支持 macOS 10.15 及更早版本的新安装，无法在当前系统运行。请先升级系统；本脚本不会继续安装。"
        fi
        warn "当前系统无法运行 Homebrew 7；本次只配置镜像，不升级 Homebrew。请先升级系统，再运行 brew update，避免升级后无法安装或管理软件。"
    elif [[ "$major" -lt 15 ]]; then
        warn "macOS $version 已不在 Homebrew 7 的官方支持范围内：Homebrew 可能仍能运行，但安装或升级软件可能失败，部分软件需要自行编译。建议先升级至 macOS 15 或更新版本；继续操作时脚本不会阻止安装或配置。"
    fi
    if [[ "$arch" == "x86_64" ]]; then
        warn "Intel Mac 在 Homebrew 7 中属于 Tier 3：部分软件可能需要自行编译，兼容性与官方支持有限。"
    fi
    if [[ "$major" -lt 26 ]]; then
        info "官方 BrewUI 桌面端要求 macOS 26 或更新版本；当前系统请继续使用命令行。"
    fi
}

require_main_branch() {
    info "检查所选源的 Homebrew main 分支..."
    if ! git ls-remote --exit-code --heads "$BREW_GIT_REMOTE" refs/heads/main >/dev/null; then
        abort "无法读取 $BREW_GIT_REMOTE 的 main 分支。镜像可能尚未同步 Homebrew 7，或网络连接失败。请重试或选择其他源；不会回退到已冻结的 master。"
    fi
}

# 子进程不继承旧 Shell 的镜像键，实际配置由 brew 自己读取 brew.env。
run_brew_clean() {
    env -u HOMEBREW_BREW_GIT_REMOTE -u HOMEBREW_CORE_GIT_REMOTE \
        -u HOMEBREW_CASK_GIT_REMOTE -u HOMEBREW_BOTTLE_DOMAIN \
        -u HOMEBREW_API_DOMAIN "$@"
}

# 确认前的只读展示与操作后的验证共用版本解析。
read_brew_version() {
    local prefix="$1"
    HOMEBREW_DETECTED_VERSION=""
    if ! HOMEBREW_VERSION_OUTPUT="$(run_brew_clean "$prefix/bin/brew" --version)"; then
        return 1
    fi
    # 兼容稳定版及 Git 开发版本后缀；不将仅包含 SHA 等未知输出当成版本。
    HOMEBREW_DETECTED_VERSION="$(printf '%s\n' "$HOMEBREW_VERSION_OUTPUT" | awk '
        NR == 1 && $1 == "Homebrew" && $2 ~ /^[0-9]+\.[0-9]+\.[0-9]+([-+][[:alnum:].+-]+)?$/ { print $2 }
    ')"
}

verify_brew() {
    local prefix="$1" mode="${2:-existing}" major
    if ! read_brew_version "$prefix"; then
        printf '%s\n' "$HOMEBREW_VERSION_OUTPUT"
        abort "Homebrew 验证失败，安装/配置尚未完成。请运行 \"$prefix/bin/brew\" --version 检查错误后重试。"
    fi
    printf '%s\n' "$HOMEBREW_VERSION_OUTPUT"
    if [[ -z "$HOMEBREW_DETECTED_VERSION" ]]; then
        if [[ "$mode" == "new" ]]; then
            abort "Homebrew 可以运行，但无法确认实际版本，安装尚未完成验证。已写入的文件和配置会保留。请运行 \"$prefix/bin/brew\" --version 检查输出，并重新打开终端运行 brew update 后重试；所选源可能尚未同步，也可通过 --configure 更换镜像源。"
        fi
        warn "无法识别当前 Homebrew 版本；本次仅完成配置，不能据此确认已升级到 Homebrew 7。请运行 brew --version 检查实际版本。"
        return 0
    fi
    info "实际 Homebrew 版本: $HOMEBREW_DETECTED_VERSION"
    major="${HOMEBREW_DETECTED_VERSION%%.*}"
    if [[ "$major" -lt 7 ]]; then
        if [[ "$mode" == "new" ]]; then
            abort "当前安装的是 Homebrew $HOMEBREW_DETECTED_VERSION，尚未达到 Homebrew 7，安装尚未完成验证。所选源可能尚未同步更新；已写入的文件和配置会保留。请重新打开终端后运行 brew update，或通过 --configure 更换镜像源后再更新，并用 brew --version 确认版本。"
        fi
        warn "当前仍是 Homebrew $HOMEBREW_DETECTED_VERSION；换源不会自动升级。需要升级到 Homebrew 7 时，请先确认系统兼容，再运行 brew update。"
    fi
}

update_and_verify() {
    local prefix="$1"
    info "运行 brew update..."
    if ! run_brew_clean "$prefix/bin/brew" update --force; then
        abort "Homebrew 核心文件和配置已写入，但 brew update 失败，安装尚未完成。请检查上方错误，再运行 \"$prefix/bin/brew\" update；成功后运行 brew --version 和 brew doctor 验证。"
    fi
    verify_brew "$prefix" new
    success "Homebrew 安装验证通过！"
}

find_existing_homebrew() {
    local candidate prefix
    prefix="$(get_homebrew_prefix "$1" "$2")"
    candidate="$prefix/bin/brew"
    if [[ ! -x "$candidate" ]]; then
        candidate="$(command -v brew 2>/dev/null || true)"
    fi
    [[ -n "$candidate" && -x "$candidate" ]] || return 1
    EXISTING_PREFIX="$(run_brew_clean "$candidate" --prefix)" || abort "无法读取已有 Homebrew 的安装路径。"
    EXISTING_REPOSITORY="$(run_brew_clean "$candidate" --repo)" || abort "无法读取已有 Homebrew 的仓库路径。"
    [[ "$EXISTING_PREFIX" == /* && "$EXISTING_REPOSITORY" == /* && -x "$EXISTING_PREFIX/bin/brew" ]] || abort "已有 Homebrew 返回了无效路径，无法安全配置。"
}

# 不执行配置文件。仅迁移独占一行的镜像赋值；复杂 Shell 语句保留并阻止配置。
filter_mirror_config() {
    local file="$1" mode="$2" check_extra="${3:-yes}"
    awk -v mode="$mode" -v check_extra="$check_extra" '
    BEGIN {
        keys="HOMEBREW_(BREW_GIT_REMOTE|CORE_GIT_REMOTE|CASK_GIT_REMOTE|BOTTLE_DOMAIN|API_DOMAIN)"
        extra="HOMEBREW_ARTIFACT_DOMAIN(_NO_FALLBACK)?"
        sq=sprintf("%c",39)
    }
    /^[[:space:]]*# Homebrew 镜像配置([[:space:](]|$)/ { next }
    /^# (BEGIN|END) homebrew-cn mirror$/ { next }
    /^[[:space:]]*#/ { print; next }
    {
        if (check_extra == "yes" && $0 ~ extra "[[:space:]]*=") {
            print "下载地址覆盖配置需要手动检查: " FILENAME ":" FNR > "/dev/stderr"
            failed=1
        }
        if ($0 ~ keys) {
            if (mode == "env" && $0 ~ "^[[:space:]]*" keys "=") next
            # 允许单一字面量赋值（包括原脚本生成的 export），禁止分号和多变量语句。
            line=$0
            sub(/^[[:space:]]*/, "", line)
            sub(/^export[[:space:]]+/, "", line)
            if (line ~ "^" keys "=") {
                sub(/^[^=]*=/, "", line)
                sub(/[[:space:]]+#.*$/, "", line)
                sub(/[[:space:]]*$/, "", line)
                if (line ~ /^"[^"$`]*"$/ || line ~ "^" sq "[^" sq "]*" sq "$" || line ~ /^[A-Za-z0-9_:\/.@%+?=-]*$/) {
                    # 保留空操作，防止 if/then、函数等控制流因删空而失去合法语法。
                    if (mode == "shell") print ": # homebrew-cn mirror configuration removed"
                    next
                }
            }
            print "无法安全迁移复杂镜像配置: " FILENAME ":" FNR > "/dev/stderr"
            failed=1
        }
        print
    }
    END { if (failed) exit 1 }
    ' "$file"
}

add_user_env_root() {
    local config_root="$1" origin="$2" candidate existing
    [[ -n "$config_root" ]] || return 0
    case "$config_root" in
        /*) ;;
        *) abort "$origin 的 Homebrew 用户配置路径不是绝对路径，无法安全迁移。请改为字面量绝对路径后重试；未修改配置。" ;;
    esac
    case "$config_root" in
        *'$'*|*'`'*|*'\'*|*$'\n'*)
            abort "$origin 的 Homebrew 用户配置路径含未展开的 Shell 表达式或转义，无法安全迁移。brew.env 只支持字面量路径；未修改配置。"
            ;;
    esac
    candidate="${config_root%/}/homebrew/brew.env"
    for existing in "${USER_ENV_FILES[@]}"; do
        [[ "$existing" == "$candidate" ]] && return 0
    done
    USER_ENV_FILES+=("$candidate")
}

collect_env_xdg_file() {
    local file="$1" config_root
    [[ -f "$file" ]] || return 0
    # 与 brew.env 的字面量赋值一致，只读取最后一次赋值，不 source/eval。
    config_root="$(awk '
        /^[[:space:]]*HOMEBREW_XDG_CONFIG_HOME=/ {
            value=$0
            sub(/^[[:space:]]*HOMEBREW_XDG_CONFIG_HOME=/, "", value)
            sub(/[[:space:]]*$/, "", value)
        }
        END { if (value != "") print value }
    ' "$file")" || abort "无法读取 $file 的用户配置路径；未修改配置。"
    add_user_env_root "$config_root" "$file 中 HOMEBREW_XDG_CONFIG_HOME"
}

collect_config_files() {
    local prefix="$1"
    # 数组遍历同时兼容 macOS 自带 Bash 3.2 和公开安装命令使用的 zsh。
    SHELL_CONFIG_FILES=("$HOME/.zshenv" "$HOME/.zprofile" "$HOME/.zshrc" "$HOME/.zlogin" "$HOME/.bash_profile" "$HOME/.bash_login" "$HOME/.bashrc" "$HOME/.profile")
    if [[ -n "${ZDOTDIR:-}" && "$ZDOTDIR" != "$HOME" ]]; then
        SHELL_CONFIG_FILES+=("$ZDOTDIR/.zshenv" "$ZDOTDIR/.zprofile" "$ZDOTDIR/.zshrc" "$ZDOTDIR/.zlogin")
    fi
    USER_ENV_FILES=("$HOME/.homebrew/brew.env")
    add_user_env_root "${XDG_CONFIG_HOME:-}" "环境变量 XDG_CONFIG_HOME"
    add_user_env_root "${HOMEBREW_XDG_CONFIG_HOME:-}" "环境变量 HOMEBREW_XDG_CONFIG_HOME"
    # brew 先读系统/prefix 配置，再选择用户文件；BrewUI 也会读取这里指定的路径。
    # 收集所有已知入口，兼顾终端 XDG 与桌面端干净环境，以及恢复官方/卸载清理。
    collect_env_xdg_file /etc/homebrew/brew.env
    collect_env_xdg_file "$prefix/etc/homebrew/brew.env"
}

check_config_conflicts() {
    local prefix="$1" file
    # 全局文件不属于本项目管理范围；镜像配置留给管理员处理。
    if [[ -f /etc/homebrew/brew.env ]] && grep -Eq '^[[:space:]]*HOMEBREW_(BREW_GIT_REMOTE|CORE_GIT_REMOTE|CASK_GIT_REMOTE|BOTTLE_DOMAIN|API_DOMAIN|ARTIFACT_DOMAIN|ARTIFACT_DOMAIN_NO_FALLBACK)=' /etc/homebrew/brew.env; then
        abort "检测到 /etc/homebrew/brew.env 中的系统级镜像设置。请先由管理员移除或统一这些镜像键，再重新配置；未修改全局文件。"
    fi
    if [[ -n "${HOMEBREW_ARTIFACT_DOMAIN:-}" || -n "${HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK:-}" ]]; then
        abort "当前环境设置了 HOMEBREW_ARTIFACT_DOMAIN 或 HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK，会影响下载来源。请先检查并清除该覆盖配置后重试。"
    fi
    for file in "${SHELL_CONFIG_FILES[@]}"; do
        [[ -f "$file" ]] || continue
        filter_mirror_config "$file" shell >/dev/null || abort "请先手动调整上述复杂/下载覆盖配置，再重试；未迁移任何配置。"
    done
    for file in "$prefix/etc/homebrew/brew.env" "${USER_ENV_FILES[@]}"; do
        [[ -f "$file" ]] || continue
        filter_mirror_config "$file" env >/dev/null || abort "请先检查上述 brew.env 中的下载覆盖配置，再重试；未迁移任何配置。"
    done
}

check_config_writable() {
    local file="$1" directory
    if [[ -e "$file" || -L "$file" ]]; then
        [[ -f "$file" && -w "$file" ]] || abort "配置文件不可写或不是普通文件: $file。未开始配置迁移。"
    fi
    directory="$(dirname "$file")"
    while [[ ! -e "$directory" ]]; do directory="$(dirname "$directory")"; done
    [[ -d "$directory" && -w "$directory" ]] || abort "无法在 $directory 创建配置/备份文件。未开始配置迁移。"
}

check_migration_writable() {
    local prefix="$1" file
    check_config_writable "$prefix/etc/homebrew/brew.env"
    check_config_writable "$(get_shell_profile)"
    for file in "${SHELL_CONFIG_FILES[@]}" "${USER_ENV_FILES[@]}"; do
        [[ -f "$file" ]] || continue
        if grep -Eq 'HOMEBREW_(BREW_GIT_REMOTE|CORE_GIT_REMOTE|CASK_GIT_REMOTE|BOTTLE_DOMAIN|API_DOMAIN)|# Homebrew 镜像配置|# (BEGIN|END) homebrew-cn mirror' "$file"; then
            check_config_writable "$file"
        fi
    done
}

# 仅当内容变化时备份，保留文件权限及符号链接目标，不覆盖已有备份。
save_config_file() {
    local file="$1" prepared="$2" backup
    if [[ -f "$file" ]] && cmp -s "$file" "$prepared"; then
        return 0
    fi
    if [[ -e "$file" && ! -f "$file" ]]; then
        abort "配置路径不是普通文件，未覆盖: $file"
    fi
    if [[ -f "$file" ]]; then
        [[ -w "$file" ]] || abort "配置文件不可写: $file"
        backup="$(mktemp "${file}.homebrew-cn-backup.XXXXXX")"
        cp -p "$file" "$backup"
        info "已备份: $backup"
    else
        mkdir -p "$(dirname "$file")"
    fi
    cat "$prepared" > "$file"
}

migrate_mirror_file() {
    local file="$1" mode="$2" prepared
    [[ -f "$file" ]] || return 0
    prepared="$(mktemp)"
    if ! filter_mirror_config "$file" "$mode" "${3:-yes}" > "$prepared"; then
        rm -f "$prepared"
        abort "无法安全迁移配置文件: $file"
    fi
    save_config_file "$file" "$prepared"
    rm -f "$prepared"
}

configure_mirror() {
    local prefix="$1" homebrew_repo="$2" file prepared tap_repo
    collect_config_files "$prefix"
    check_config_conflicts "$prefix"
    check_migration_writable "$prefix"
    # 检测网络与分支后才开始修改；缺少 main 的镜像不能声称 V7 配置成功。
    require_main_branch
    git -C "$homebrew_repo" remote set-url origin "$BREW_GIT_REMOTE" || abort "无法更新 Homebrew Git 源，配置未完成。"

    # API 模式不创建 core/cask taps，也不持久化不存在的 CASK_GIT_REMOTE 配置。
    # 已有 taps 则更新实际 remote；USTC 已停供这两个 Git 镜像，退回官方。
    for file in core cask; do
        tap_repo="$homebrew_repo/Library/Taps/homebrew/homebrew-$file"
        [[ -d "$tap_repo/.git" || -f "$tap_repo/.git" ]] || continue
        if [[ "$file" == core ]]; then
            git -C "$tap_repo" remote set-url origin "$MIRROR_CORE_GIT_REMOTE" || abort "无法更新已有 core tap 的源。"
        else
            git -C "$tap_repo" remote set-url origin "$MIRROR_CASK_GIT_REMOTE" || abort "无法更新已有 cask tap 的源。"
        fi
    done
    for file in "${SHELL_CONFIG_FILES[@]}"; do migrate_mirror_file "$file" shell; done
    for file in "${USER_ENV_FILES[@]}"; do migrate_mirror_file "$file" env; done

    file="$prefix/etc/homebrew/brew.env"
    prepared="$(mktemp)"
    if [[ -f "$file" ]]; then filter_mirror_config "$file" env > "$prepared"; fi
    if [[ "$MIRROR_NAME" != "官方源" ]]; then
        {
            echo '# BEGIN homebrew-cn mirror'
            echo "HOMEBREW_BREW_GIT_REMOTE=$BREW_GIT_REMOTE"
            echo "HOMEBREW_BOTTLE_DOMAIN=$MIRROR_BOTTLE_DOMAIN"
            echo "HOMEBREW_API_DOMAIN=$MIRROR_API_DOMAIN"
            if [[ -d "$homebrew_repo/Library/Taps/homebrew/homebrew-core/.git" || -f "$homebrew_repo/Library/Taps/homebrew/homebrew-core/.git" ]]; then
                echo "HOMEBREW_CORE_GIT_REMOTE=$MIRROR_CORE_GIT_REMOTE"
            fi
            echo '# END homebrew-cn mirror'
        } >> "$prepared"
    fi
    save_config_file "$file" "$prepared"
    rm -f "$prepared"
    success "镜像配置已保存到 $file（终端与 BrewUI 共用）"
    info "已迁移用户 brew.env 和常见 Shell 启动文件中的镜像键；其他设置保持原样。请重新打开终端，并重启 BrewUI 后检查 Configuration。"
}

shellenv_line() {
    # printf %q 在 Bash 3.2 / zsh 中都可用，避免自定义路径被当作 Shell 代码。
    printf 'eval "$(%s shellenv)"\n' "$(printf '%q' "$1/bin/brew")"
}

filter_shellenv_config() {
    HOMEBREW_CN_TARGET_PREFIX="$2" HOMEBREW_CN_SHELLENV_LINE="$(shellenv_line "$2")" awk '
    BEGIN { prefix=ENVIRON["HOMEBREW_CN_TARGET_PREFIX"]; desired=ENVIRON["HOMEBREW_CN_SHELLENV_LINE"] }
    /^# Homebrew 环境配置$/ { managed=1; next }
    {
        if (managed && ($0 == desired || $0 == "eval \"$(" prefix "/bin/brew shellenv)\"" || $0 == "eval \"$(\"" prefix "/bin/brew\" shellenv)\"")) { managed=0; next }
        if (managed) print "# Homebrew 环境配置"
        managed=0
        print
    }
    END { if (managed) print "# Homebrew 环境配置" }
    ' "$1"
}

configure_shell_env() {
    local arch="$1" prefix="$2" os="${3:-macos}" shell_profile prepared
    shell_profile="$(get_shell_profile)"
    prepared="$(mktemp)"
    if [[ -f "$shell_profile" ]]; then
        # 仅替换本脚本生成的两行；保留用户其他包含 shellenv 的脚本逻辑。
        filter_shellenv_config "$shell_profile" "$prefix" > "$prepared"
    fi
    {
        echo '# Homebrew 环境配置'
        shellenv_line "$prefix"
    } >> "$prepared"
    save_config_file "$shell_profile" "$prepared"
    rm -f "$prepared"
    success "Homebrew PATH 配置已写入 $shell_profile"
}

cleanup_homebrew_config() {
    local prefix="$1" file prepared filtered backup
    collect_config_files "$prefix"
    # 在卸载软件之前检查，以免留下半卸载状态。
    for file in "${SHELL_CONFIG_FILES[@]}"; do
        [[ -f "$file" ]] || continue
        filter_mirror_config "$file" shell no >/dev/null || abort "请先手动整理上述复杂镜像配置，再卸载。"
    done
    # prefix 可能随卸载删除，备份放在用户目录以便保留无关配置。
    if [[ -f "$prefix/etc/homebrew/brew.env" ]]; then
        backup="$(mktemp "$HOME/.homebrew-cn-uninstall-brew.env.XXXXXX")"
        cp -p "$prefix/etc/homebrew/brew.env" "$backup"
        info "安装级 brew.env 已备份到: $backup"
    fi
    for file in "$prefix/etc/homebrew/brew.env" "${USER_ENV_FILES[@]}"; do migrate_mirror_file "$file" env no; done
    for file in "${SHELL_CONFIG_FILES[@]}"; do
        [[ -f "$file" ]] || continue
        prepared="$(mktemp)"
        filtered="$(mktemp)"
        filter_mirror_config "$file" shell no > "$filtered"
        filter_shellenv_config "$filtered" "$prefix" > "$prepared"
        save_config_file "$file" "$prepared"
        rm -f "$prepared" "$filtered"
    done
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
    echo -e "  ${BOLD}实际版本:${NC}    ${HOMEBREW_DETECTED_VERSION:-未能识别，请运行 brew --version 确认}"
    echo -e "  ${BOLD}安装路径:${NC}    $prefix"
    echo -e "  ${BOLD}镜像源:${NC}      $MIRROR_NAME"
    echo -e "  ${BOLD}镜像配置:${NC}    $prefix/etc/homebrew/brew.env"
    echo -e "  ${BOLD}PATH 配置:${NC}   $shell_profile"
    echo ""
    echo -e "${YELLOW}请关闭并重新打开终端，以清除旧会话的镜像变量并加载 PATH。${NC}"
    echo -e "  BrewUI 用户请重启应用，在 Configuration 中核对镜像地址。"
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

    if [[ "$os" == macos ]]; then
        local version
        version="$(sw_vers -productVersion)"
        if [[ "${version%%.*}" -ge 26 ]]; then
            echo -e "${BOLD}可选：安装官方 BrewUI 桌面端（macOS 26+）:${NC}"
            echo -e "  ${CYAN}brew install --cask homebrew-app${NC}"
            echo "  BrewUI 与终端共用以上 brew.env 镜像设置；脚本不会自动安装桌面端。"
            echo ""
        fi
    fi

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
        echo -e "  重新运行本脚本并添加 ${CYAN}--configure${NC}，选择 ${CYAN}4) 官方源${NC}。"
        echo "  脚本会备份并清理镜像键、恢复已有 core/cask tap 的官方源，保留其他配置。"
        echo -e "  确认系统符合上方兼容要求后，重新打开终端运行 ${CYAN}brew update${NC}。"
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

    cleanup_homebrew_config "$prefix"

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

    local shell_profile
    shell_profile="$(get_shell_profile)"
    echo ""
    echo -e "${BOLD}${GREEN}============================================${NC}"
    echo -e "${BOLD}${GREEN}       Homebrew 卸载完成！✅               ${NC}"
    echo -e "${BOLD}${GREEN}============================================${NC}"
    echo ""
    echo -e "  ${BOLD}已清理的配置文件:${NC} $shell_profile"
    echo -e "  ${BOLD}备份文件:${NC} 配置文件旁的 *.homebrew-cn-backup.*；安装级配置备份位于 $HOME/.homebrew-cn-uninstall-brew.env.*"
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
    local mode="install" os arch prefix homebrew_repo
    case "${1:-}" in
        --configure) mode="configure" ;;
        --uninstall|-u) mode="uninstall" ;;
        --help|-h)
            echo "用法: install.sh [--configure | --uninstall]"
            echo "  --configure  仅为已有 Homebrew 配置镜像（选择 4 恢复官方源），不安装或升级 Homebrew"
            echo "  --uninstall  卸载 Homebrew，并备份/清理本脚本管理的配置"
            return 0
            ;;
        "") ;;
        *) abort "未知参数: $1。使用 --help 查看用法。" ;;
    esac
    [[ $# -le 1 ]] || abort "一次只能指定一个操作。"
    check_not_root
    os="$(detect_os)"
    arch="$(detect_arch)"
    info "检测到系统: ${BOLD}$os${NC} (${arch})"

    if [[ "$mode" == "uninstall" ]]; then
        uninstall_homebrew "$arch" "$os"
        return
    fi

    if find_existing_homebrew "$arch" "$os"; then
        prefix="$EXISTING_PREFIX"
        homebrew_repo="$EXISTING_REPOSITORY"
        check_macos_support "$os" "$arch" existing
        if ! read_brew_version "$prefix"; then
            printf '%s\n' "$HOMEBREW_VERSION_OUTPUT"
            abort "无法读取当前 Homebrew 版本，尚未修改任何配置。请运行 \"$prefix/bin/brew\" --version 检查错误后重试。"
        fi
        if [[ -n "$HOMEBREW_DETECTED_VERSION" ]]; then
            info "已安装 Homebrew $HOMEBREW_DETECTED_VERSION，路径：$prefix"
        else
            info "已安装 Homebrew，路径：$prefix"
            warn "当前版本未能识别，可运行 brew --version 检查；仍可继续配置镜像。"
        fi
        info "本次仅调整镜像配置，不升级 Homebrew 或已安装的软件。"
        if [[ "$mode" != "configure" ]]; then
            echo -n -e "是否继续配置镜像？[${GREEN}Y${NC}/${RED}n${NC}]: "
            read -r reinstall_choice
            if [[ "$reinstall_choice" =~ ^[Nn]$ ]]; then
                info "已取消配置。"
                return 0
            fi
        fi
        select_mirror
        configure_mirror "$prefix" "$homebrew_repo"
        configure_shell_env "$arch" "$prefix" "$os"
        verify_brew "$prefix"
        success "镜像配置完成；未更新或升级已有 Homebrew。"
        info "需要更新 Homebrew 时，请先确认系统符合上方兼容要求，再重新打开终端运行 brew update。"
    else
        if [[ "$mode" == "configure" ]]; then
            abort "未找到已有 Homebrew。--configure 只负责配置，不会安装；请先运行不带参数的安装命令。"
        fi
        check_macos_support "$os" "$arch" new
        select_mirror
        preflight_check "$os"
        install_homebrew "$arch" "$os"
        prefix="$(get_homebrew_prefix "$arch" "$os")"
    fi
    show_finish_info "$prefix" "$os"
}

# 允许测试通过 source 加载函数；兼容 bash、zsh 直接运行与 -c 安装命令。
if [[ -n "${ZSH_VERSION:-}" ]]; then
    case "$ZSH_EVAL_CONTEXT" in
        *:file) ;;
        *) main "$@" ;;
    esac
elif [[ "${BASH_SOURCE[0]:-$0}" == "$0" ]]; then
    main "$@"
fi
