// 页脚模板
export function getFooter() {
  return `
        <div class="card reveal section" style="text-align:center;padding:40px">
            <div class="card-title" style="justify-content:center">官方资源</div>
            <div class="footer-links" style="margin-bottom:0">
                <a href="https://brew.sh/" target="_blank">Homebrew 官网</a>
                <a href="https://docs.brew.sh/" target="_blank">官方文档</a>
                <a href="https://docs.brew.sh/Homebrew-on-Linux" target="_blank">Linux 安装指南</a>
                <a href="https://mirrors.ustc.edu.cn/help/brew.git.html" target="_blank">USTC 镜像帮助</a>
                <a href="https://mirrors.tuna.tsinghua.edu.cn/help/homebrew/" target="_blank">清华 TUNA 镜像帮助</a>
            </div>
        </div>
        <div class="footer">
            <p>Made by <a href="https://www.mintimate.cn" target="_blank">Mintimate</a> · Open Source on <a href="https://github.com/Mintimate/homebrew-cn" target="_blank">GitHub</a></p>
            <p class="footer-sub">本站仅提供安装脚本托管，Homebrew 商标归原作者所有</p>
        </div>`;
}
