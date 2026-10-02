# Terminal And BrewUI Configuration Comparison

Use when the user supplies configuration reports, asks which mirror is effective, or reports different behavior between Terminal and BrewUI. Present this flow as **“桌面版和终端表现不一样”**, for example “输入命令能下载，Homebrew 应用却失败”. Explain its purpose as “检查这两个地方是否用了不同的下载设置”. Setup and migration commands remain in [desktop-setup.md](desktop-setup.md).

## Collect the minimum evidence

Collect evidence one step at a time. Do not begin with two technical reports, a version checklist, or configuration-file instructions:

1. Use the described symptom and entry point. If missing, ask what works or fails in the Homebrew app versus entering a command in Terminal. A user who only uses the app can describe that one side; do not assume they have tested Terminal.
2. Start with the failing entry's report. For the app, guide **配置 → 复制报告** (Configuration → Copy report), explaining “这能告诉我们应用实际使用了哪些下载设置”. For Terminal, give only `brew config` and explain “这条命令显示 Homebrew 的配置信息，不会修改设置”. Do not also request `brew --version` and `brew --prefix` when the report already contains them. If the user recently changed settings, ask them to completely quit and reopen the app before copying its report.
3. Read that evidence, state what it establishes, then ask for the other side only if comparison is still relevant. In the guided form the source is labeled automatically. In chat, accept “这是应用里的” or “这是终端里的” and label the evidence internally. If the source is unknown, clarify it rather than guessing from the content.
4. If the user does not use Terminal, explain how to open macOS's **终端** app and run the one check when needed. If they prefer to stay in the app, continue with that evidence and explain that a comparison remains incomplete. Do not interpret missing Terminal data as a fault.

The runtime accepts the section headings below and their Chinese equivalents `终端` and `桌面端`. These labels are a tool input format, not something beginners must learn. Preserve them when the guided form or a knowledgeable user supplies them; replace the illustrative values with actual output and never invent a missing report:

```text
[terminal]
HOMEBREW_PREFIX: /opt/homebrew
ORIGIN: https://mirrors.ustc.edu.cn/brew.git
HOMEBREW_API_DOMAIN: https://mirrors.ustc.edu.cn/homebrew-bottles/api
[desktop]
HOMEBREW_PREFIX: /opt/homebrew
ORIGIN: https://mirrors.ustc.edu.cn/brew.git
```

Only if a specific difference needs its source identified, request the relevant setting from one candidate configuration file at a time. Explain `brew.env` as “保存 Homebrew 下载设置的文件”, and explain why this file is relevant before asking the user to inspect it. Use headings containing actual file paths, e.g. `[~/.homebrew/brew.env]`, `[/opt/homebrew/etc/homebrew/brew.env]`, `[/etc/homebrew/brew.env]`. For shell-only assignments use `[shell]`. Label custom XDG files with their actual path and explain which environment selects that file. Do not ask the user to locate every possible file up front.

Use an exact allowlist: `HOMEBREW_BREW_GIT_REMOTE`, `HOMEBREW_CORE_GIT_REMOTE`, `HOMEBREW_CASK_GIT_REMOTE`, `HOMEBREW_BOTTLE_DOMAIN`, `HOMEBREW_API_DOMAIN`, `HOMEBREW_ARTIFACT_DOMAIN`, `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK`. Request `HOMEBREW_SYSTEM_ENV_TAKES_PRIORITY`, `HOMEBREW_XDG_CONFIG_HOME` or `XDG_CONFIG_HOME` only to resolve that specific precedence/path question. Never request a full `env` dump or complete shell profiles. Ask the user to review and redact credentials and private URL paths before sending. The runtime also masks URL credentials/query strings and common credential assignments in diagnostic output; this is defense in depth, not a guarantee that arbitrary logs contain no secrets.

## Interpret evidence

- Lead with what the findings mean for the reported symptom and one next action. For a comparison table, prioritize relevant fields and use understandable labels such as “Homebrew 安装位置”, “更新地址”, “软件目录下载地址” and “安装包下载地址”; include the exact setting names and supplied-file candidates as supporting details. Do not lead with a full variable/file-precedence table. Absent fields are “未提供”, not “未配置”, “官方默认” or proof of a mismatch. Values removed by redaction are not comparable.
- Distinguish `ORIGIN` (Git repository remote), `HOMEBREW_BREW_GIT_REMOTE` (configured remote), API, Bottle and Cask artifact downloads. Matching origin alone does not prove every download is mirrored.
- Compare `HOMEBREW_PREFIX` first. Different prefixes can mean different installations; do not merge their configuration or assume Rosetta from path alone.
- File assignments show intended settings, not necessarily the values used by an already-running process. A matching file value is only a candidate source. Never claim it is the final winning file from partial snippets.
- Normal file precedence is user > installation > system. `HOMEBREW_SYSTEM_ENV_TAKES_PRIORITY=1` in the system file changes system-file precedence. Shell environment and startup behavior can also affect Terminal. Do not equate file precedence with a complete reconstruction of a process environment.
- BrewUI ignores exported `XDG_CONFIG_HOME` and shell exports. Homebrew's `HOMEBREW_XDG_CONFIG_HOME` in system or installation configuration can select a different user file. Confirm the selected paths and relevant files before inferring an override.
- Treat `brew.env` values literally: no `export`, no `source`, no `$HOME` or command expansion. Flag such syntax for review; never evaluate it.
- Multiple lines from separately labeled reports are not duplicate assignments in one file. Repeated assignments in one file, or differing values across files, warrant reviewing precedence rather than blindly deleting lines.
- Identical provided values establish only agreement in those fields at collection time. They do not establish equal proxy configuration, network behavior, API catalogue behavior or download speed.

## Next action and verification

- If only one report is present, preserve the observed facts and request just the missing side when the user's problem still needs that comparison. Explain what the additional report would resolve; do not ask them to paste the first report again.
- If only shell exports are present, explain why they do not configure BrewUI and offer the existing `--configure` flow after identifying the platform.
- If values differ, start with the affected key and the supplied file candidates; request only missing evidence needed to identify the override. Do not generate writes to a guessed path.
- For a deliberate migration, preserve backups, use the existing configure flow, reopen Terminal and BrewUI, then compare fresh reports and retry the original operation.
- With matching configuration but continued slowness, identify whether the failing request is Git, API, Bottle or a particular app's upstream URL. Only an explicit online-probe request should trigger cloud mirror diagnostics. The P0 feature does not measure local network speed or execute repairs.

## Runtime guidance catalogue

<!-- runtime:configuration-rules -->
```json
{
  "configuration_difference": {
    "severity": "warning",
    "title": "应用和终端使用的设置有不同",
    "message": "两份报告中，同一个设置的值不同。这可能与两边表现不同有关，但还不能确认它就是失败原因，或是哪个文件造成的。",
    "suggestion": "先查看两份报告中的 Homebrew 安装位置（HOMEBREW_PREFIX）是否相同。如果位置相同，再从与你的问题有关的那一项差异继续查；需要补充哪个设置时会单独说明。",
    "same_prefix_suggestion": "两边的 Homebrew 安装位置相同。下一步请告诉我你是否刚改过下载设置；如果改过，先完全退出并重开 Homebrew 应用，再试刚才的下载。",
    "verification": "确认需要修改的设置并先保留备份，再修改；完全退出并重开 Homebrew 应用，在原来出问题的位置重试，再用新报告确认相关设置是否生效。"
  },
  "configuration_incomplete": {
    "severity": "info",
    "title": "还需要一点信息才能比较两边的设置",
    "message": "目前缺少一边的报告或某个设置。这表示信息还不够，不代表你的配置有问题，也不能据此说两边设置相同。",
    "suggestion": "如果缺一份报告，下一步只补那一份：应用里从「配置 → 复制报告」获取，终端里运行只读命令 brew config。如果两份都已有，只补需要确认的那一项。已有内容不用重发，页面会标明来源。",
    "missing_terminal_suggestion": "桌面版的信息已收到。下一步在平时输入 Homebrew 命令的终端中运行 brew config，把显示的信息发来；这条命令只查看设置。已有的桌面版信息不用重发。",
    "missing_desktop_suggestion": "终端的信息已收到。下一步在 Homebrew 桌面版左侧点「配置」，再点「复制报告」，把复制的文字发来。已有的终端信息不用重发。",
    "missing_source_suggestion": "先告诉我，这份信息来自 Homebrew 桌面版，还是输入命令的终端窗口？不用重新复制，我们先确认来源。",
    "both_reports_suggestion": "两份信息都已收到，未显示的设置先留为未知。下一步把桌面版当前的下载提示发来，保留软件名称和出错或停住的位置；暂时不用查找配置文件。",
    "verification": "补充后只核对报告实际提供的设置；没有显示的项目仍记为未知，需要时再单独确认。"
  },
  "configuration_same": {
    "severity": "info",
    "title": "已提供的设置没有差异",
    "message": "能够对照的设置相同，还不能保证两个入口的网络表现一样。",
    "suggestion": "下一步把桌面版当前的下载提示发来，保留软件名称和出错或停住的位置。这样可以继续判断问题出在下载的哪个环节。",
    "verification": "找到并处理原因后，在原来出问题的入口重试同一个软件的下载。"
  },
  "configuration_file_conflict": {
    "severity": "warning",
    "title": "同一个下载设置被写了多次",
    "message": "提供的设置里，同一项目有不同值或重复记录。Homebrew 会按读取规则选择设置，后粘贴到这里的内容不一定生效。",
    "suggestion": "先用应用或终端的实际报告确认这项设置当前显示什么，再核对相关文件。暂时不要删除看起来重复的行；需要查看哪个文件时会具体说明。",
    "verification": "确认需要保留的设置并备份后再修改；重开应用和终端，用新报告检查是否生效。"
  },
  "configuration_invalid_env": {
    "severity": "warning",
    "title": "保存下载设置的文件里混入了终端命令",
    "message": "brew.env 是保存 Homebrew 设置的文件，每行应是 NAME=value。它不会执行 export、变量展开或命令替换，所以这些写法可能让设置与预期不同。",
    "suggestion": "先核对报告指出的那一行及其所在文件。确认后再备份并改成实际值；不要运行整个文件，PATH 和 brew shellenv 等终端启动设置仍放在原来的终端配置中。",
    "verification": "修改后重新打开终端和 Homebrew 应用，用配置报告检查那一项是否生效。"
  }
}
```

## Sources

- [BrewUI environment isolation](https://github.com/Homebrew/BrewUI/blob/main/ARCHITECTURE.md#homebrew-configuration)
- [Homebrew environment files and mirror variables](https://docs.brew.sh/Manpage#environment)
