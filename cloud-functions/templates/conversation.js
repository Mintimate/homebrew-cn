// Included in the chat controller so actions share its conversation and request state.
export function getConversationClientLines() {
  return `
        function normalizeSuggestedActions(actions) {
            if (!Array.isArray(actions)) return [];
            const seen = new Set();
            return actions.slice(0, 12).filter(action => {
                if (!action || typeof action.label !== "string" || typeof action.prompt !== "string") return false;
                const label = action.label.trim(), prompt = action.prompt.trim();
                if (!label || label.length > 32 || !prompt || prompt.length > 400 || seen.has(prompt)) return false;
                seen.add(prompt); return true;
            }).slice(0, 3).map(action => ({label: action.label.trim(), prompt: action.prompt.trim()}));
        }
        function renderSuggestedActions(skeleton, actions) {
            if (!actions.length) return;
            const group = document.createElement("div");
            group.className = "answer-followups";
            group.setAttribute("role", "group");
            group.setAttribute("aria-label", "继续这个话题");
            actions.forEach(action => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "answer-followup";
                button.textContent = action.label;
                button.title = action.prompt;
                button.addEventListener("click", () => {
                    if (isGenerating) return;
                    // Only send the chosen follow-up; leave the composer's draft intact.
                    return sendMessage(action.prompt, []);
                });
                group.appendChild(button);
            });
            skeleton.bubble.appendChild(group);
            scrollToLatest();
        }
        function revealDiagnosticAnswer(skeleton) {
            if (!followLatest || typeof messagesContainer.getBoundingClientRect !== "function" || typeof skeleton.textContent.getBoundingClientRect !== "function") return;
            const viewport = messagesContainer.getBoundingClientRect();
            const answer = skeleton.textContent.getBoundingClientRect();
            const maximum = Math.max(0, messagesContainer.scrollHeight - messagesContainer.clientHeight);
            const target = messagesContainer.scrollTop + answer.top - viewport.top - (messagesContainer.clientTop || 0) - 12;
            messagesContainer.scrollTop = Math.max(0, Math.min(maximum, target));
            // Keep this conclusion visible until the user scrolls or chooses the latest reply.
            followLatest = maximum - messagesContainer.scrollTop < 64;
            jumpLatest.hidden = followLatest;
        }
        function startNewConversation() {
            if (isGenerating) return;
            convId = createConversationId();
            messagesContainer.querySelectorAll(".message.user,.agent-message-row").forEach(message => message.remove());
            activeToolCards.clear();
            activeAssistantMessage = activeTextContent = activeUsageElement = null;
            currentToolName = "";
            diagnosticState = {analysis: null, fix: ""};
            resetThinking();resetGlobalToolPanel();renderGlobalToolPanel();
            helpGuide.hidden = true;
            document.getElementById("chat-footer").hidden = false;
            document.getElementById("chat-empty").hidden = false;
            document.getElementById("help-guide-resume").hidden = ![helpWarning, helpDesktop, helpTerminal].some(input => input.value.trim());
            helpFeedback.textContent = "";
            setPackageQueryMode(false);
            chatFeedback.textContent = "已开始新对话，之前的内容不会带入。未发送的文字、截图和报告已保留。";
            updateHelpButtons();scrollToLatest(true);chatInput.focus();
        }
        document.getElementById("chat-new-conversation").addEventListener("click", startNewConversation);
  `.split('\n');
}
