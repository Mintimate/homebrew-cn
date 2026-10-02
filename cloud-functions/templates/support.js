export function getSupportDialog() {
  return `<dialog id="support-dialog" class="support-dialog" aria-labelledby="support-title" aria-describedby="support-description support-scan-hint" hidden>
    <div class="support-heading">
      <h2 id="support-title">支持 Homebrew CN</h2>
      <button id="support-close" class="icon-btn" type="button" aria-label="关闭赞赏窗口" autofocus><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
    </div>
    <p id="support-description" class="support-description">Homebrew CN 是社区项目，<strong>非 Homebrew 官方项目</strong>。赞赏用于支持本项目维护。</p>
    <div class="support-artwork">
      <img class="support-code" src="/assets/wechat-support-poster-simple.png" alt="给开源续一杯：简洁可爱的啤酒杯赞赏卡，中央为原始微信赞赏码" width="1254" height="1254" loading="lazy" decoding="async">
    </div>
    <p id="support-scan-hint" class="support-scan-hint">使用微信扫一扫，或保存图片后识别。</p>
    <a class="support-save" href="/assets/wechat-support-poster-simple.png" download="homebrew-cn-support.png">保存赞赏卡 <span aria-hidden="true">↓</span></a>
  </dialog>`;
}

export function getSupportClientLines() {
  return `
    (function setupSupportDialog() {
        const dialog = document.getElementById("support-dialog");
        const opener = document.getElementById("support-open");
        const closeButton = document.getElementById("support-close");
        let returnFocus = null;
        opener.addEventListener("click", () => {
            if (dialog.open) return;
            returnFocus = document.activeElement;
            dialog.hidden = false;
            dialog.showModal();
            document.body.classList.add("support-open");
            opener.setAttribute("aria-expanded", "true");
        });
        closeButton.addEventListener("click", () => dialog.close());
        dialog.addEventListener("close", () => {
            dialog.hidden = true;
            document.body.classList.remove("support-open");
            opener.setAttribute("aria-expanded", "false");
            if (returnFocus && !returnFocus.inert) returnFocus.focus({preventScroll: true});
        });
        dialog.addEventListener("click", event => {
            if (event.target !== dialog) return;
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
        });
        // Native dialog handles Tab and Escape; the expanded workspace's
        // document keyboard handler must not take over those keys.
        dialog.addEventListener("keydown", event => event.stopPropagation());
    })();
  `.split('\n');
}
