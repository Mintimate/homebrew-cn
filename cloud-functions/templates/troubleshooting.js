export function getTroubleshootingGuide() {
  return `<section id="help-guide" class="help-guide" aria-labelledby="help-guide-title" hidden>
    <div class="help-guide-heading"><h2 id="help-guide-title" tabindex="-1"></h2><button type="button" class="text-action" id="help-guide-close">返回直接提问</button></div>
    <p id="help-guide-purpose" class="help-guide-purpose"></p>
    <div id="help-doctor" hidden>
      <p>已经有提示文字？直接粘贴在下面即可。不知道从哪里复制，可以跟着指引操作。</p>
      <div class="help-source" role="group" aria-label="你在哪里使用 Homebrew">
        <button type="button" data-help-source="desktop" aria-pressed="true">Homebrew 桌面版</button>
        <button type="button" data-help-source="terminal" aria-pressed="false">终端 / iTerm</button>
      </div>
      <div id="help-doctor-desktop"><p>在 Homebrew 桌面版左侧点「诊断」，再点「复制 brew doctor 输出」，回到这里粘贴。</p><p class="help-guide-note">Doctor 是 Homebrew 的自检。警告可能只涉及某个软件或更新来源，不一定妨碍安装其他软件；具体影响需要看报告。</p></div>
      <div id="help-doctor-terminal" hidden><p>在你输入安装命令的窗口运行下面这条命令，再复制显示的提示。它会检查 Homebrew 并显示报告。</p><div class="help-command"><code id="help-doctor-command">brew doctor</code><button type="button" class="text-action" data-help-copy="doctor">复制检查命令</button></div></div>
      <label for="help-warning-text">粘贴你看到的提示</label>
      <textarea id="help-warning-text" rows="5" placeholder="英文也可以，保留提示前后的文字有助于判断。"></textarea>
      <button type="button" class="help-primary" id="help-doctor-submit" disabled>帮我看看要不要处理</button>
    </div>
    <div id="help-config" hidden>
      <div id="help-config-first">
        <p class="help-step">第 1 步，共 2 步 · 复制桌面版的信息</p>
        <p>打开 Homebrew 桌面版，左侧点「配置」，再点「复制报告」。把复制到的文字粘贴在下面。</p>
        <label for="help-desktop-text">桌面版的信息</label>
        <textarea id="help-desktop-text" rows="5" placeholder="直接粘贴即可，不需要读懂或挑选里面的字段。"></textarea>
        <button type="button" class="help-primary" id="help-config-next" disabled>下一步：获取终端信息</button>
      </div>
      <div id="help-config-second" hidden>
        <p class="help-step">第 2 步，共 2 步 · 复制终端的信息</p>
        <p>终端就是输入命令的窗口，例如「终端」或 iTerm。在平时使用 Homebrew 的那个窗口运行下面的命令，复制显示的信息。</p>
        <details class="help-terminal-how"><summary>不知道怎么打开终端？</summary><p>在 Mac 上按 ⌘ + 空格，搜索「终端」并打开。粘贴下面的命令后，按回车运行。</p></details>
        <div class="help-command"><code id="help-config-command">brew config</code><button type="button" class="text-action" data-help-copy="config">复制查看命令</button></div>
        <p class="help-guide-note">这条命令显示 Homebrew 的安装信息和下载设置。</p>
        <label for="help-terminal-text">终端显示的信息</label>
        <textarea id="help-terminal-text" rows="5" placeholder="把运行命令后显示的信息粘贴在这里。"></textarea>
        <div class="help-guide-actions"><button type="button" class="text-action" id="help-config-back">上一步</button><button type="button" class="help-primary" id="help-config-submit" disabled>帮我比较下载设置</button></div>
      </div>
    </div>
    <p class="help-guide-note">这里会解释你发送的信息，不会自动修改电脑。发送前请删去密码、密钥和不想分享的个人信息。</p>
    <div id="help-guide-feedback" class="chat-feedback" role="status" aria-live="polite"></div>
    <button type="button" class="text-action" id="help-guide-stuck">我找不到这些信息</button>
  </section>`;
}

// Included inside the existing chat controller, sharing its request/busy state.
export function getTroubleshootingClientLines() {
  return `
        const helpGuide = document.getElementById("help-guide");
        const helpFeedback = document.getElementById("help-guide-feedback");
        const helpWarning = document.getElementById("help-warning-text");
        const helpDesktop = document.getElementById("help-desktop-text");
        const helpTerminal = document.getElementById("help-terminal-text");
        let helpTask = "doctor";
        let helpSource = /Linux/i.test(navigator.userAgent) ? "terminal" : "desktop";
        let helpStep = 1;
        function updateHelpButtons() {
            document.getElementById("help-doctor-submit").disabled = isGenerating || !helpWarning.value.trim();
            document.getElementById("help-config-next").disabled = isGenerating || !helpDesktop.value.trim();
            document.getElementById("help-config-submit").disabled = isGenerating || !helpDesktop.value.trim() || !helpTerminal.value.trim();
        }
        function chooseHelpSource(source) {
            helpSource = source;
            document.querySelectorAll("[data-help-source]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.helpSource===source)));
            document.getElementById("help-doctor-desktop").hidden = source !== "desktop";
            document.getElementById("help-doctor-terminal").hidden = source !== "terminal";
        }
        function showHelpStep(step) {
            helpStep = step;
            document.getElementById("help-config-first").hidden = step !== 1;
            document.getElementById("help-config-second").hidden = step !== 2;
            updateHelpButtons();
        }
        window.openTroubleshootingGuide = function(task, preserveStep = false) {
            if (isGenerating || !["doctor","desktop"].includes(task)) return;
            helpTask = task;
            switchTerminalTab("ai-chat");
            setPackageQueryMode(false);
            document.getElementById("chat-empty").hidden = true;
            document.getElementById("chat-footer").hidden = true;
            helpGuide.hidden = false;
            document.getElementById("help-guide-resume").hidden = true;
            document.getElementById("help-doctor").hidden = task !== "doctor";
            document.getElementById("help-config").hidden = task !== "desktop";
            const title = document.getElementById("help-guide-title");
            title.textContent = task === "doctor" ? "这些警告需要处理吗？" : "桌面版下载慢或失败？";
            document.getElementById("help-guide-purpose").textContent = task === "doctor"
                ? "出现警告不等于 Homebrew 不能安装软件。把提示发过来，我会先说明影响范围、能否继续安装软件，以及现在是否需要处理；没有报告时还不能下结论。"
                : "先看看应用用了哪些下载设置，再与终端的信息对照。按下面的指引，一次复制一份信息即可。";
            helpFeedback.textContent = "";
            chooseHelpSource(helpSource);
            showHelpStep(preserveStep ? helpStep : 1);
            helpGuide.scrollIntoView({block:"start"});
            title.focus({preventScroll:true});
        };
        function closeHelpGuide() {
            helpGuide.hidden = true;
            document.getElementById("chat-footer").hidden = false;
            document.getElementById("help-guide-resume").hidden = false;
            document.getElementById("chat-empty").hidden = Boolean(messagesContainer.querySelector(".message,.agent-message-row"));
            chatInput.focus();
        }
        function submitHelpReport(text) {
            if (isGenerating) return;
            closeHelpGuide();
            document.getElementById("chat-empty").hidden = true;
            // This form sends only the reports being reviewed. Preserve any
            // unsent composer text and screenshot attachments for the user.
            window.sendQuickAction(text, []);
        }
        [helpWarning, helpDesktop, helpTerminal].forEach(input=>input.addEventListener("input",updateHelpButtons));
        document.querySelectorAll("[data-help-source]").forEach(button=>button.addEventListener("click",()=>chooseHelpSource(button.dataset.helpSource)));
        document.getElementById("help-guide-close").addEventListener("click",closeHelpGuide);
        document.getElementById("help-guide-resume").addEventListener("click",()=>window.openTroubleshootingGuide(helpTask,true));
        document.getElementById("help-config-next").addEventListener("click",()=>{
            if (isGenerating || !helpDesktop.value.trim()) return;
            showHelpStep(2);
            document.getElementById("help-config-second").scrollIntoView({block:"start"});
            helpTerminal.focus({preventScroll:true});
        });
        document.getElementById("help-config-back").addEventListener("click",()=>{showHelpStep(1);helpDesktop.focus();});
        document.getElementById("help-doctor-submit").addEventListener("click",()=>{
            if (!helpWarning.value.trim()) return;
            submitHelpReport("请帮我解释 Homebrew 自检报告。请先直接说明：影响范围是什么，是否影响 Homebrew 安装软件，现在是否需要处理。再用新手能理解的话解释每条警告，并只给当前最需要做的一个下一步；证据不足时说明还缺什么。报告来自" + (helpSource === "desktop" ? "Homebrew 桌面版" : "终端") + "。\\n\\n" + helpWarning.value.trim());
        });
        document.getElementById("help-config-submit").addEventListener("click",()=>{
            if (!helpDesktop.value.trim() || !helpTerminal.value.trim()) return;
            submitHelpReport("我想检查 Homebrew 桌面版的下载设置。请帮我对照这两份信息，用简单的话说明下载设置是否不同，并先给一个下一步。\\n\\n[desktop]\\n" + helpDesktop.value.trim() + "\\n\\n[terminal]\\n" + helpTerminal.value.trim());
        });
        document.getElementById("help-guide-stuck").addEventListener("click",()=>{
            const stage = helpTask === "doctor" ? (helpSource === "desktop" ? "Homebrew 桌面版的诊断页" : "终端里的自检输出") : (helpStep === 1 ? "Homebrew 桌面版的配置页" : "终端里的 Homebrew 信息");
            closeHelpGuide();
            chatFeedback.textContent = "可以直接描述现在看到的内容。已粘贴的信息仍保留在“继续填写信息”中。";
            if (!chatInput.value.trim()) {
                let report = "";
                if (helpTask === "doctor" && helpWarning.value.trim()) report = "\\n\\n已有的自检提示：\\n" + helpWarning.value.trim();
                if (helpTask === "desktop") {
                    if (helpDesktop.value.trim()) report += "\\n\\n[desktop]\\n" + helpDesktop.value.trim();
                    if (helpTerminal.value.trim()) report += "\\n\\n[terminal]\\n" + helpTerminal.value.trim();
                }
                chatInput.value = "我找不到" + stage + "，请一步一步教我。" + report;
            }
            resizeChatInput();updateSendState();
        });
        document.querySelectorAll("[data-help-copy]").forEach(button=>button.addEventListener("click",async()=>{
            const command = button.dataset.helpCopy === "doctor" ? "brew doctor" : "brew config";
            try {await navigator.clipboard.writeText(command);helpFeedback.textContent="命令已复制。在终端粘贴，按回车运行，再复制显示的文字。";}
            catch {helpFeedback.textContent="复制失败，请手动选中上面的命令复制。";}
        }));
        chooseHelpSource(helpSource);
        updateHelpButtons();
  `.split('\n');
}
