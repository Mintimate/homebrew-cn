#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const skillDir = path.join(rootDir, 'skills', 'homebrew-cn-agent');
const outputPath = path.join(rootDir, 'agents', 'chat', '_skill.ts');

const references = [
  ['Intent routing', 'references/intent-routing.md'],
  ['Brew not found troubleshooting', 'references/troubleshooting-brew-missing.md'],
  ['Mirror diagnostics', 'references/mirror-diagnostics.md'],
  ['Formula and cask lookup', 'references/formula-check.md'],
  ['Restore official sources', 'references/restore-official.md'],
  ['Desktop setup', 'references/desktop-setup.md'],
  ['Doctor triage', 'references/doctor-triage.md'],
  ['Configuration comparison', 'references/configuration-compare.md'],
  ['Conversation flow', 'references/conversation-flow.md'],
];

function readSkillFile(relativePath, options = {}) {
  const fullPath = path.join(skillDir, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required skill file: ${path.relative(rootDir, fullPath)}`);
  }

  const text = readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n').trim();
  return options.stripFrontmatter ? stripFrontmatter(text) : text;
}

function stripFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}

function constName(title) {
  return `REFERENCE_${title.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

function tsString(value) {
  return JSON.stringify(value, null, 2);
}

function extractCanonicalInstallCommand(text) {
  const match = text.match(/`(\/bin\/zsh -c "\$\(curl -fsSL https:\/\/brew-cn\.mintimate\.cn\/install\)")`/);
  if (!match) {
    throw new Error('Missing canonical Homebrew CN installer command in SKILL.md');
  }
  return match[1];
}

const skillBody = readSkillFile('SKILL.md', { stripFrontmatter: true });
const canonicalInstallCommand = extractCanonicalInstallCommand(skillBody);
const canonicalConfigureCommand = `${canonicalInstallCommand} -- --configure`;
const linuxConfigureCommand = canonicalConfigureCommand.replace('/bin/zsh', '/bin/bash');
if (![canonicalConfigureCommand, linuxConfigureCommand].every(command => skillBody.includes('`' + command + '`'))) {
  throw new Error('Missing canonical Homebrew CN configuration command in SKILL.md');
}
const referenceBodies = references.map(([title, relativePath]) => ({
  title,
  name: constName(title),
  body: readSkillFile(relativePath),
}));
const restoreReply = referenceBodies.find(({ title }) => title === 'Restore official sources').body.split('## Direct Reply\n')[1]?.trim();
if (!restoreReply) throw new Error('Missing Direct Reply section in restore-official.md');

function readRuntimeJson(title, marker) {
  const body = referenceBodies.find(reference => reference.title === title)?.body ?? '';
  const block = body.split(`<!-- runtime:${marker} -->`)[1]?.match(/```json\n([\s\S]*?)\n```/);
  if (!block) throw new Error(`Missing runtime catalogue: ${marker}`);
  return JSON.parse(block[1]);
}

function readRuntimeRules(title, marker) {
  const rules = readRuntimeJson(title, marker);
  for (const [id, rule] of Object.entries(rules)) {
    if (!['error', 'warning', 'info'].includes(rule.severity)
      || !['title', 'message', 'suggestion', 'verification'].every(key => typeof rule[key] === 'string' && rule[key].trim())
      || (rule.commands !== undefined && (!Array.isArray(rule.commands) || !rule.commands.every(command => typeof command === 'string')))) {
      throw new Error(`Invalid runtime guidance: ${id}`);
    }
  }
  return rules;
}
const diagnosticRules = {
  ...readRuntimeRules('Doctor triage', 'doctor-rules'),
  ...readRuntimeRules('Configuration comparison', 'configuration-rules'),
};
for (const [id, rule] of Object.entries(diagnosticRules)) {
  if (id.startsWith('doctor_') && !['impact_scope', 'installation_impact', 'action_required'].every(key => typeof rule[key] === 'string' && rule[key].trim())) {
    throw new Error(`Missing Doctor impact assessment: ${id}`);
  }
}
const doctorSummaries = readRuntimeJson('Doctor triage', 'doctor-summary');
for (const name of ['ready', 'known', 'unknown', 'errors']) {
  if (!['installation_impact', 'action_required'].every(key => typeof doctorSummaries[name]?.[key] === 'string' && doctorSummaries[name][key].trim())) throw new Error(`Invalid Doctor summary: ${name}`);
}
const conversationCopy = readRuntimeJson('Conversation flow', 'conversation-copy');
for (const key of ['greeting', 'thanks', 'acknowledgement', 'resolved', 'capabilities']) {
  if (typeof conversationCopy.replies?.[key] !== 'string') throw new Error(`Missing conversation reply: ${key}`);
}
for (const kind of ['doctor', 'configuration']) {
  const actions = conversationCopy.followups?.[kind];
  if (!Array.isArray(actions) || actions.length > 3 || actions.some(action => typeof action.label !== 'string' || !action.label || action.label.length > 32 || typeof action.prompt !== 'string' || !action.prompt || action.prompt.length > 400)) throw new Error(`Invalid follow-up actions: ${kind}`);
}

const source = `// This file is generated by scripts/sync-homebrew-cn-agent-skill.mjs.
// Edit skills/homebrew-cn-agent/*.md, then run npm run sync:agent-skill.

export const HOMEBREW_CN_AGENT_SKILL_NAME = 'homebrew-cn-agent';
export const HOMEBREW_CN_INSTALL_COMMAND = ${tsString(canonicalInstallCommand)};
export const HOMEBREW_CN_CONFIGURE_COMMAND = ${tsString(canonicalConfigureCommand)};
export const HOMEBREW_CN_LINUX_CONFIGURE_COMMAND = ${tsString(linuxConfigureCommand)};
export const HOMEBREW_CN_RESTORE_OFFICIAL_REPLY = ${tsString(restoreReply)};
export const HOMEBREW_CN_DIAGNOSTIC_RULES = ${tsString(diagnosticRules)} as const;
export const HOMEBREW_CN_DOCTOR_SUMMARIES = ${tsString(doctorSummaries)} as const;
export const HOMEBREW_CN_CONVERSATION_COPY = ${tsString(conversationCopy)} as const;

const SKILL_BODY = ${tsString(skillBody)};

${referenceBodies.map((reference) => `const ${reference.name} = ${tsString(reference.body)};`).join('\n\n')}

function section(title: string, body: string): string {
  return [
    \`## \${title}\`,
    body.trim(),
  ].join('\\n');
}

export function buildSkillInstructions(guidance?: {
  canonicalGuidance?: string;
  extraGuidance?: string;
}): string {
  return [
    'Skill: homebrew-cn-agent.',
    'Use the following project skill as the source of truth for homebrew-cn Agent behavior.',
    section('Skill Body', SKILL_BODY),
    section('Brew Not Found Troubleshooting', REFERENCE_BREW_NOT_FOUND_TROUBLESHOOTING),
    section('Mirror Diagnostics', REFERENCE_MIRROR_DIAGNOSTICS),
    section('Formula And Cask Lookup', REFERENCE_FORMULA_AND_CASK_LOOKUP),
    section('Restore Official Sources', REFERENCE_RESTORE_OFFICIAL_SOURCES),
    section('Desktop Setup', REFERENCE_DESKTOP_SETUP),
    section('Doctor Report Triage', REFERENCE_DOCTOR_TRIAGE),
    section('Configuration Comparison', REFERENCE_CONFIGURATION_COMPARISON),
    section('Conversation Flow', REFERENCE_CONVERSATION_FLOW),
    guidance?.canonicalGuidance ? \`Canonical guidance for this request:\\n\${guidance.canonicalGuidance}\` : '',
    guidance?.extraGuidance ? \`Additional scenario guidance:\\n\${guidance.extraGuidance}\` : '',
  ].filter(Boolean).join('\\n\\n');
}

export function buildIntentClassificationPrompt(): string {
  return [
    'You are the intent classifier for the homebrew-cn Agent. Classify the user\\'s latest message into exactly one route.',
    section('Intent Routing Reference', REFERENCE_INTENT_ROUTING),
    'Output ONLY a valid JSON object with this exact shape and no extra text:',
    '{',
    '  "route": "<route_name>",',
    '  "reason": "<brief reason in Chinese>",',
    '  "is_homebrew_related": true|false,',
    '  "needs_sandbox": true|false',
    '}',
    'needs_sandbox should be true whenever the route is mirror_probe_deep; otherwise false unless a future route explicitly requires sandbox execution.',
  ].join('\\n\\n');
}
`;

const current = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : '';
if (current !== source) {
  writeFileSync(outputPath, source, 'utf8');
  console.log(`Synced ${path.relative(rootDir, outputPath)} from skills/homebrew-cn-agent`);
} else {
  console.log(`${path.relative(rootDir, outputPath)} is already in sync`);
}
