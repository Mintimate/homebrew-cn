import { buildSkillInstructions } from './_skill';

export function buildSystemPrompt(_userMessage: string, extraGuidance?: string): string {
  return buildSkillInstructions({ extraGuidance });
}

export function buildUserInput(message: string, contextText?: string): string {
  if (!contextText?.trim()) return message;
  return [
    message,
    '',
    'User-provided environment details or diagnostic context:',
    contextText.trim(),
  ].join('\n');
}

// Enforce the narrow desktop exception documented in references/intent-routing.md.
// The classifier and response guidance remain generated from the skill Markdown.
export function shouldCheckDesktopConfigurationFirst(message: string, contextText?: string): boolean {
  const text = [message, contextText].filter(Boolean).join('\n');
  const desktop = /\bBrewUI\b|\bGUI\b|\bDock\b|桌面端|图形界面|Homebrew\s+desktop/i.test(text);
  const configurationSymptom = /慢|失败|不生效|不读取|不走|不一致|换源|镜像|配置|brew\.env|\.zshrc|slow|fail|config|mirror|environment/i.test(text);
  if (!desktop || !configurationSymptom) return false;

  return !hasExplicitMirrorProbeRequest(diagnosticRequestText(message));
}

// Commands quoted in a diagnostic report are evidence, not a new user request.
export function diagnosticRequestText(message: string): string {
  return message.split(/^\s*(?:```|\[|#{1,6}\s|(?:\*\*)?(?:Warning|Error):|(?:export\s+)?HOMEBREW_[A-Z_]+\s*[:=]|ORIGIN\s*[:=])/m)[0];
}

export function hasExplicitMirrorProbeRequest(message: string): boolean {
  const request = message.replace(/(?:不要|不用|无需|别|不必).{0,8}(?:测速|探测|检测|诊断|测试)/g, '')
    .replace(/(?:do not|don't|no need to)\s+(?:probe|test|diagnose|check|benchmark)\s+(?:the\s+)?(?:mirrors?|network)/gi, '');
  return /测速|(?:在线|云端|沙盒).{0,12}(?:检测|诊断|探测|测试)|(?:检测|诊断|探测|测试|测一下|测一测).{0,12}(?:镜像|网络|源)|(?:镜像|网络).{0,12}(?:检测|诊断|探测|测试)|(?:probe|test|diagnose|check|benchmark).{0,30}(?:mirrors?|network)|(?:online|cloud).{0,20}(?:probe|diagnostic|test)/i.test(request);
}
