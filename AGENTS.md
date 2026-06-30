# Repository Instructions

## Homebrew CN Agent Skill

- Treat `skills/homebrew-cn-agent/` as the source of truth for homebrew-cn Agent behavior, routing, and scenario guidance.
- Do not hand-edit `agents/chat/_skill.ts`; it is generated from the skill Markdown files.
- After changing `skills/homebrew-cn-agent/SKILL.md` or any file in `skills/homebrew-cn-agent/references/`, run `npm run sync:agent-skill`.
- `npm run build` runs the sync step automatically before EdgeOne Makers packaging.
- Keep executable runtime tools in `agents/chat/_tools.ts`; keep behavior policy, routing rules, and response procedures in the skill files.
