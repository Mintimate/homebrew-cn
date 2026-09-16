# Mirror Diagnostics

Use `mirror_probe_deep` for live mirror diagnostics.

## Targets

- `Official (官方源)`: `https://github.com/Homebrew/brew.git`
- `USTC (中科大)`: `https://mirrors.ustc.edu.cn/brew.git`
- `TUNA (清华大学)`: `https://mirrors.tuna.tsinghua.edu.cn/git/homebrew/brew.git`
- `Aliyun (阿里云)`: `https://mirrors.aliyun.com/homebrew/brew.git`
- `Tencent (腾讯云)`: `https://mirrors.cloud.tencent.com/homebrew/brew.git`

## Behavior

- Call `mirror_probe_deep` without arguments to check all mirrors in parallel.
- The tool reports DNS, TCP, TLS, HTTP, git latency, commit hash, the compared branch (`commit_ref`), and sync status when available.
- Probe the existing Git refs endpoints with bounded streaming reads; stop after finding `refs/heads/main` instead of waiting for the full tags advertisement. Do not replace TUNA's official repository URL just because one probe times out.
- Prefer `main` over legacy `stable/master` refs. Compare hashes only when both the official source and mirror yielded the same branch. If the official baseline is missing, the branches differ, or HTTP connects but refs cannot be read, say **同步未验证**, not **同步正常**.
- A hash mismatch is **与上游不同**, not proof of a synchronization delay or which side is ahead.
- Show concrete probe errors and distinguish edge-fetch versus sandbox execution; HTTP 200 with a read timeout is not proof the mirror is down.
- Tencent Cloud uses dumb HTTP and does not support shallow clone; the install script should use full clone for it.
- If the official GitHub probe fails, explain that this may reflect the current probe node/network rather than an upstream outage; do not call it a sandbox failure when `method` is `edge_fetch`.

## Summary

- Prefer a reachable non-official mirror confirmed synchronized, then compare latency. If none is confirmed synchronized, present a reachable candidate with its uncertainty instead of telling the user it is synchronized or immediately recommending a switch.
- Mention elapsed time, best mirror, approximate latency, and sync status.
- When recommending an installer command, use the project website command: `/bin/zsh -c "$(curl -fsSL https://brew-cn.mintimate.cn/install)"`.
- If recommending a specific mirror, tell the user which interactive mirror option to select in that script: USTC = `1`, Aliyun = `2`, TUNA = `3`, Tencent Cloud = hidden option `5`; do not recommend the official source when non-official mirrors are reachable.
- Keep the full JSON report in the tool result rather than expanding every field in prose.
