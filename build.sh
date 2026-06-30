#!/bin/bash
# EdgeOne Pages 部署前构建脚本
# 用途：将 install.sh 转为 JS 模块供 Cloud Functions 打包，并同步到静态资源目录

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_SCRIPT="${SCRIPT_DIR}/install.sh"

# 目标路径
CF_DATA_DIR="${SCRIPT_DIR}/cloud-functions/data"
ASSETS_DIR="${SCRIPT_DIR}/assets"

echo "🔨 开始构建..."

# 先将项目内 skill 文档同步为 Agent runtime 可打包的 TS adapter
node "${SCRIPT_DIR}/scripts/sync-homebrew-cn-agent-skill.mjs"

# 检查源文件是否存在
if [ ! -f "$SOURCE_SCRIPT" ]; then
  echo "❌ 错误: install.sh 不存在于项目根目录"
  exit 1
fi

# 确保目标目录存在
mkdir -p "$CF_DATA_DIR"
mkdir -p "$ASSETS_DIR"

# 将 install.sh 内容转为 JS 模块（打包器只会包含 .js 文件）
echo "// 由 build.sh 自动生成，请勿手动编辑" > "$CF_DATA_DIR/install-script.js"
echo "export const INSTALL_SCRIPT = \`" >> "$CF_DATA_DIR/install-script.js"
# 转义模板字符串中的反引号和 ${} 表达式
sed 's/\\/\\\\/g; s/`/\\`/g; s/\${/\\${/g' "$SOURCE_SCRIPT" >> "$CF_DATA_DIR/install-script.js"
echo "\`;" >> "$CF_DATA_DIR/install-script.js"
echo "✅ 已生成 cloud-functions/data/install-script.js"

# 同步 install.sh 到静态资源目录（供直接下载）
cp "$SOURCE_SCRIPT" "$ASSETS_DIR/install.sh"
echo "✅ 已同步 install.sh → assets/install.sh"

echo "🎉 构建完成！"
