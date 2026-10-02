# Conversation And Diagnostic Follow-ups

Use a single conversation for questions, diagnosis, explanation and verification. Users should not need to choose an internal route or paste a report again to ask about it.

## Everyday interaction

- Greetings, thanks, acknowledgements and completion messages are in scope. Reply briefly and naturally; do not reject them as unrelated, repeat a diagnostic checklist or run a network probe.
- Explain ordinary Homebrew questions directly. Use a tool only when the answer needs a current package lookup, explicitly requested network information or analysis of newly supplied evidence.
- Keep the Homebrew specialist scope for genuinely unrelated requests, but acknowledge the user courteously. A short reply such as “好的”“第二条呢”“没看懂” is interpreted in conversation context, not as an unrelated new topic.
- The UI's **新对话** starts a new server conversation. It preserves unsent drafts, while previous answers and reports are no longer context for the new question. An explicit topic change in the same conversation takes precedence over a prior diagnostic task.

## Continue from existing evidence

- “还能装软件吗”“可以先不管吗”“先处理哪条”“解释简单一点” refer to the previous report when one exists. Answer the actual question using that evidence, leading with installation impact and whether action is needed. Do not analyze the words of the follow-up as a new log or claim that no issue was found.
- “临时验证成功”“改好了”“还是失败” are progress reports. Use the preceding advice to explain the next check; never infer successful repair beyond what the user reports. Ask for only the new failed step or changed output if required.
- After a package lookup, “怎么升级它” refers to that package. After a mirror check, “这个结果代表什么” refers to that check. All completed direct responses must be saved through the same session as model-generated conversation.
- New diagnostic evidence supersedes older observations from the same source. Fresh Doctor output must be analyzed on its own; do not keep old warnings as though they are still present.
- Two configuration reports may arrive separately. If the immediately preceding diagnostic context supplies one side and the new message supplies the other, combine them with their source labels. State that they were received at different times and only reflect those supplied snapshots. Never combine reports across a new conversation, a declared topic/machine switch, or an intervening unrelated user task.
- Preserve scoped package identities and uncertainty. If the relevant report has fallen out of available context, say so and request the minimum missing detail; do not invent a remembered result.

## Presentation and interaction

- Start Doctor results with **是否影响安装软件** and **现在是否需要处理**, followed by each warning's **影响范围**. The response must answer these before asking the user a question. Use [doctor-triage.md](doctor-triage.md) for calibrated conclusions.
- Show internal classifier work only in developer observability, not as an action the user needs to understand. Real diagnostic/network/package tools remain visible.
- Offer at most three short follow-up choices after a completed diagnosis. A choice is a conversational question, not approval to run a repair. No choices are auto-sent or emitted as completed on an aborted/failed response.
- Technical details and raw evidence may remain expandable; the installation-impact conclusion must be visible without expansion.

## Runtime conversation copy

<!-- runtime:conversation-copy -->
```json
{
  "replies": {
    "greeting": "你好，可以直接说你遇到的 Homebrew 问题，或把提示文字发来。我会先说明是否影响安装软件、现在是否需要处理。",
    "thanks": "不客气。有新的提示或哪里没看懂，接着问就好。",
    "acknowledgement": "好的，需要继续时直接接着说就可以。",
    "resolved": "好的，之后如果又遇到提示，可以继续发来。",
    "capabilities": "我可以帮你安装 Homebrew、查看软件能不能安装、解释报错和警告，以及检查下载设置。直接说你想做什么就可以。",
    "insufficient_evidence": "这段信息还不足以判断是否影响安装、是否需要处理。请先说明它是哪一步显示的提示；如果有错误，保留最后那一段即可。没有匹配到诊断规则，不代表已经确认安装正常。"
  },
  "followups": {
    "doctor": [
      { "label": "哪些可以先不处理？", "prompt": "根据刚才那份报告，哪些提示可以先不处理，哪些会影响我安装软件？请直接说明影响范围。" },
      { "label": "带我做下一步", "prompt": "根据刚才的诊断，请带我做最需要的下一步，一次只说明一个操作。" },
      { "label": "解释简单一点", "prompt": "刚才的诊断我没完全看懂，请用更简单的话说明是否影响安装软件、是否需要处理。" }
    ],
    "configuration": [
      { "label": "这些差异影响什么？", "prompt": "根据刚才的配置对照，这些差异会影响哪些下载或安装操作？" },
      { "label": "带我做下一步", "prompt": "根据刚才的配置对照，请带我做下一步，一次只说明一个操作。" },
      { "label": "改好后怎么确认？", "prompt": "针对刚才的配置问题，处理后应该怎样确认已经生效？" }
    ]
  }
}
```
