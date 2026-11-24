import { readFileSync } from 'node:fs';

const { tool_name: tool, tool_input: input } = JSON.parse(readFileSync(0, 'utf8'));
const envPath = /(^|[\s/\\'"=:<>|&;(),\x60])\.env(?=$|[\s/\\'":<>|&;(),\x60])/i;
const command = input?.command ?? input?.patch;

// Patch directives name file targets. The body can mention .env in documentation.
const touchesEnv =
  tool === 'apply_patch' && typeof command === 'string'
    ? [...command.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)]
        .some(([, path]) => envPath.test(path.trim()))
    : envPath.test(command ?? JSON.stringify(input ?? {}));

if (touchesEnv) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: 'The project protects .env files. Ask the user to make any changes.',
    },
  }));
}
