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
- The tool reports DNS, TCP, TLS, HTTP, git latency, commit hash, and sync status when available.
- Tencent Cloud uses dumb HTTP and does not support shallow clone; the install script should use full clone for it.
- If the official GitHub source fails only inside the EdgeOne sandbox, explain that this may reflect sandbox network limits rather than an upstream outage.

## Summary

- Recommend the reachable non-official mirror with the lowest latency unless sync status or errors make it unsuitable.
- Mention elapsed time, best mirror, approximate latency, and sync status.
- Keep the full JSON report in the tool result rather than expanding every field in prose.
