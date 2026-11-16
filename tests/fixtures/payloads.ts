// Raw payload fixtures from .kiro/steering/events.md.
//
// label:
//   observed  - seen by the probe on 2026-11-12. `verbatim: true` means the
//               raw text is copied character for character from events.md
//               (tests/unit/fixtures.test.ts checks this).
//   derived   - not observed; built from the nearest example by changing only
//               the fields named in `note`.
//
// Codex payloads arrive as the last argv item; the others arrive on stdin.

import type { AgentId, BuddyEvent } from '../../src/core/event';

export type Expected = Omit<BuddyEvent, 'v' | 'at'> | null;

export interface Fixture {
  id: string;
  /** Row of the events.md mapping table this fixture covers. */
  row: string;
  label: 'observed' | 'derived';
  verbatim: boolean;
  agent: AgentId;
  raw: string;
  expected: Expected;
  note?: string;
}

const KIRO_SPEC = '/Users/dev/demo/.kiro/specs/hello-file/tasks.md';
const KIRO_TASK = '2. Change the line in hello.txt';

export const FIXTURES: readonly Fixture[] = [
  {
    id: 'kiro-user-prompt-submit',
    row: 'Kiro UserPromptSubmit',
    label: 'observed',
    verbatim: true,
    agent: 'kiro',
    raw: String.raw`{"session_id":"sess_ce19…","hook_event_name":"UserPromptSubmit","cwd":"/Users/dev/demo","prompt":"hello"}`,
    expected: { agent: 'kiro', session: 'sess_ce19…', kind: 'prompt', cwd: '/Users/dev/demo', text: 'hello' },
  },
  {
    id: 'kiro-pre-task-exec',
    row: 'Kiro PreTaskExec',
    label: 'observed',
    verbatim: true,
    agent: 'kiro',
    raw: String.raw`{"session_id":"sess_0bcd…","hook_event_name":"PreTaskExec","cwd":"/Users/dev/demo","spec_name":"/Users/dev/demo/.kiro/specs/hello-file/tasks.md","task_name":"2. Change the line in hello.txt"}`,
    expected: {
      agent: 'kiro',
      session: 'sess_0bcd…',
      kind: 'task_start',
      cwd: '/Users/dev/demo',
      task: { name: KIRO_TASK, specPath: KIRO_SPEC },
    },
  },
  {
    id: 'kiro-post-task-exec',
    row: 'Kiro PostTaskExec',
    label: 'observed',
    verbatim: true,
    agent: 'kiro',
    raw: String.raw`{"session_id":"sess_0bcd…","hook_event_name":"PostTaskExec","cwd":"/Users/dev/demo","spec_name":"/Users/dev/demo/.kiro/specs/hello-file/tasks.md","task_name":"2. Change the line in hello.txt","task_success":true}`,
    expected: {
      agent: 'kiro',
      session: 'sess_0bcd…',
      kind: 'task_done',
      cwd: '/Users/dev/demo',
      task: { name: KIRO_TASK, specPath: KIRO_SPEC, success: true },
    },
  },
  {
    id: 'kiro-stop',
    row: 'Kiro Stop',
    label: 'observed',
    verbatim: true,
    agent: 'kiro',
    raw: String.raw`{"session_id":"sess_0bcd…","hook_event_name":"Stop","cwd":"/Users/dev/demo"}`,
    expected: { agent: 'kiro', session: 'sess_0bcd…', kind: 'stop', cwd: '/Users/dev/demo' },
  },
  {
    id: 'claude-user-prompt-submit',
    row: 'Claude UserPromptSubmit',
    label: 'observed',
    verbatim: true,
    agent: 'claude',
    raw: String.raw`{"session_id":"e697…","cwd":"/Users/dev/demo","permission_mode":"default","hook_event_name":"UserPromptSubmit","prompt":"delete hello.txt"}`,
    expected: { agent: 'claude', session: 'e697…', kind: 'prompt', cwd: '/Users/dev/demo', text: 'delete hello.txt' },
  },
  {
    id: 'claude-notification-permission',
    row: 'Claude Notification + permission_prompt',
    label: 'observed',
    verbatim: true,
    agent: 'claude',
    raw: String.raw`{"session_id":"e697…","cwd":"/Users/dev/demo","hook_event_name":"Notification","message":"Claude needs your permission","notification_type":"permission_prompt"}`,
    expected: { agent: 'claude', session: 'e697…', kind: 'permission', cwd: '/Users/dev/demo' },
  },
  {
    id: 'claude-notification-idle',
    row: 'Claude Notification + idle_prompt',
    label: 'observed',
    verbatim: false,
    agent: 'claude',
    raw: String.raw`{"session_id":"e697…","cwd":"/Users/dev/demo","hook_event_name":"Notification","message":"Claude is waiting for your input","notification_type":"idle_prompt"}`,
    expected: { agent: 'claude', session: 'e697…', kind: 'idle', cwd: '/Users/dev/demo' },
    note: 'Claude Notification example with the observed message and notification_type values from events.md',
  },
  {
    id: 'claude-notification-other',
    row: 'Claude Notification + any other type',
    label: 'derived',
    verbatim: false,
    agent: 'claude',
    raw: String.raw`{"session_id":"e697…","cwd":"/Users/dev/demo","hook_event_name":"Notification","message":"Signed in","notification_type":"auth_success"}`,
    expected: null,
    note: 'Claude Notification example with message and notification_type changed (not observed)',
  },
  {
    id: 'claude-app-user-prompt-submit',
    row: 'Claude UserPromptSubmit',
    label: 'observed',
    verbatim: true,
    agent: 'claude',
    raw: String.raw`{"session_id":"81fd…","transcript_path":"/Users/dev/.claude/projects/-Users-dev-demo/81fd….jsonl","cwd":"/Users/dev/demo","scratchpad_dir":"/private/tmp/claude-501/-Users-dev-demo/81fd…/scratchpad","prompt_id":"c0de…","permission_mode":"auto","hook_event_name":"UserPromptSubmit","prompt":"hello"}`,
    expected: { agent: 'claude', session: '81fd…', kind: 'prompt', cwd: '/Users/dev/demo', text: 'hello' },
    note: 'Claude app (claude-desktop), observed in normal use on 2026-11-12',
  },
  {
    id: 'claude-app-session-end',
    row: 'Claude SessionEnd',
    label: 'observed',
    verbatim: true,
    agent: 'claude',
    raw: String.raw`{"session_id":"aba1…","transcript_path":"/Users/dev/.claude/projects/-Users-dev-demo/aba1….jsonl","cwd":"/Users/dev/demo","scratchpad_dir":"/private/tmp/claude-501/-Users-dev-demo/aba1…/scratchpad","hook_event_name":"SessionEnd","reason":"other"}`,
    expected: { agent: 'claude', session: 'aba1…', kind: 'end', cwd: '/Users/dev/demo' },
    note: 'Claude app SessionEnd, observed on 2026-11-12',
  },
  {
    id: 'claude-cli-stop-after-cd',
    row: 'Claude Stop',
    label: 'observed',
    verbatim: true,
    agent: 'claude',
    raw: String.raw`{"session_id":"7199…","transcript_path":"/Users/dev/.claude/projects/-Users-dev-demo/7199….jsonl","cwd":"/Users/dev/demo/research","scratchpad_dir":"/private/tmp/claude-501/-Users-dev-demo/7199…/scratchpad","prompt_id":"c0de…","permission_mode":"auto","effort":{"level":"medium"},"hook_event_name":"Stop","stop_hook_active":false,"last_assistant_message":"research has one file.","background_tasks":[],"session_crons":[]}`,
    expected: { agent: 'claude', session: '7199…', kind: 'stop', cwd: '/Users/dev/demo/research', text: 'research has one file.' },
    note: 'Claude Code CLI Stop after cd into a subfolder, observed on 2026-11-12',
  },
  {
    id: 'claude-stop',
    row: 'Claude Stop',
    label: 'observed',
    verbatim: true,
    agent: 'claude',
    raw: String.raw`{"session_id":"e9a4…","cwd":"/Users/dev/demo","hook_event_name":"Stop","stop_hook_active":false,"last_assistant_message":"I ran ls. The folder has hello.txt."}`,
    expected: {
      agent: 'claude',
      session: 'e9a4…',
      kind: 'stop',
      cwd: '/Users/dev/demo',
      text: 'I ran ls. The folder has hello.txt.',
    },
  },
  {
    id: 'claude-app-post-tool-use',
    row: 'Claude PostToolUse',
    label: 'observed',
    verbatim: true,
    agent: 'claude',
    raw: String.raw`{"session_id":"cde2…","transcript_path":"/Users/dev/.claude/projects/-Users-dev-demo/cde2….jsonl","cwd":"/Users/dev/demo","scratchpad_dir":"/private/tmp/claude-501/-Users-dev-demo/cde2…/scratchpad","prompt_id":"c0de…","permission_mode":"auto","effort":{"level":"high"},"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"ls","description":"List files"},"tool_response":{"stdout":"hello.txt","stderr":"","interrupted":false,"isImage":false,"noOutputExpected":false},"tool_use_id":"toolu_01…","duration_ms":40}`,
    expected: { agent: 'claude', session: 'cde2…', kind: 'tool', cwd: '/Users/dev/demo' },
    note: 'Claude app PostToolUse after an approval, observed on 2026-11-16 (tool input and output replaced)',
  },
  {
    id: 'claude-app-post-tool-use-failure',
    row: 'Claude PostToolUseFailure + is_interrupt false',
    label: 'observed',
    verbatim: true,
    agent: 'claude',
    raw: String.raw`{"session_id":"509b…","transcript_path":"/Users/dev/.claude/projects/-Users-dev-demo/509b….jsonl","cwd":"/Users/dev/demo","scratchpad_dir":"/private/tmp/claude-501/-Users-dev-demo/509b…/scratchpad","prompt_id":"c0de…","permission_mode":"auto","effort":{"level":"high"},"hook_event_name":"PostToolUseFailure","tool_name":"mcp__ccd_session_mgmt__set_session_title","tool_input":{},"tool_use_id":"toolu_01…","error":"MCP error -32602: Input validation error: Invalid arguments …","is_interrupt":false,"duration_ms":4,"mcp_server":{"name":"ccd_session_mgmt","source":"sdk"}}`,
    expected: { agent: 'claude', session: '509b…', kind: 'tool', cwd: '/Users/dev/demo' },
    note: 'Claude app PostToolUseFailure, observed on 2026-11-16 (error text cut)',
  },
  {
    id: 'claude-post-tool-use-interrupted',
    row: 'Claude PostToolUseFailure + is_interrupt not false',
    label: 'derived',
    verbatim: false,
    agent: 'claude',
    raw: String.raw`{"session_id":"509b…","transcript_path":"/Users/dev/.claude/projects/-Users-dev-demo/509b….jsonl","cwd":"/Users/dev/demo","scratchpad_dir":"/private/tmp/claude-501/-Users-dev-demo/509b…/scratchpad","prompt_id":"c0de…","permission_mode":"auto","effort":{"level":"high"},"hook_event_name":"PostToolUseFailure","tool_name":"mcp__ccd_session_mgmt__set_session_title","tool_input":{},"tool_use_id":"toolu_01…","error":"MCP error -32602: Input validation error: Invalid arguments …","is_interrupt":true,"duration_ms":4,"mcp_server":{"name":"ccd_session_mgmt","source":"sdk"}}`,
    expected: null,
    note: 'The observed PostToolUseFailure with is_interrupt changed to true (not observed)',
  },
  {
    id: 'codex-turn-complete',
    row: 'Codex agent-turn-complete',
    label: 'observed',
    verbatim: true,
    agent: 'codex',
    raw: String.raw`{"type":"agent-turn-complete","thread-id":"01a1…","turn-id":"01a1…","cwd":"/Users/dev/demo","client":"codex-tui","input-messages":["delete hello.txt","make hello.txt again"],"last-assistant-message":"Created hello.txt."}`,
    expected: {
      agent: 'codex',
      session: '01a1…',
      kind: 'stop',
      cwd: '/Users/dev/demo',
      text: 'Created hello.txt.',
      firstInput: 'delete hello.txt',
    },
  },
  {
    id: 'codex-title-turn',
    row: 'Codex internal title turn',
    label: 'observed',
    verbatim: true,
    agent: 'codex',
    raw: String.raw`{"type":"agent-turn-complete","thread-id":"01a1…","turn-id":"01a1…","cwd":"/Users/dev/demo","client":"codex-tui","input-messages":["Generate a concise, single-line task title of at most 36 characters and under five words where possible. Start with an imperative verb. ...\n\nUser prompt:\nrun ls"],"last-assistant-message":"{\"title\":\"Run ls\"}"}`,
    expected: null,
  },
  {
    id: 'codex-suggestions-turn',
    note: 'Rebuilt from a normalized event of the 2026-11-13 daily log (the raw payload is not kept): another thread-id, cwd "/", an input starting with the template, and the reply {"suggestions":[]} (trap 7).',
    row: 'Codex internal suggestions turn',
    label: 'derived',
    verbatim: false,
    agent: 'codex',
    raw: String.raw`{"type":"agent-turn-complete","thread-id":"01a1…","turn-id":"01a1…","cwd":"/","input-messages":["# Overview\nGenerate 0 to 3 hyperpersonalized suggestions for what this user can do ..."],"last-assistant-message":"{\"suggestions\":[]}"}`,
    expected: null,
  },
  {
    id: 'codex-safety-turn',
    note: 'Rebuilt from two normalized events of the 2026-11-15 and 2026-11-16 daily logs (the raw payload is not kept): another thread-id, cwd "/", an input starting with the safety-check template, and the reply {"exclude":[]} (trap 8).',
    row: 'Codex internal suggestion safety check',
    label: 'derived',
    verbatim: false,
    agent: 'codex',
    raw: String.raw`{"type":"agent-turn-complete","thread-id":"01a1…","turn-id":"01a1…","cwd":"/","input-messages":["You are an expert at upholding safety and compliance standards for Codex ambient suggestions. I will present you with t..."],"last-assistant-message":"{\"exclude\":[]}"}`,
    expected: null,
  },
];

/** "Anything else or unparsable" row: all derived, all dropped. */
export const ANYTHING_ELSE: readonly Fixture[] = [
  ['kiro', 'not json'],
  ['claude', ''],
  ['codex', '[]'],
  ['kiro', 'null'],
  ['claude', '"Stop"'],
  ['kiro', String.raw`{"session_id":"sess_ce19…","hook_event_name":"PreToolUse","cwd":"/Users/dev/demo"}`],
  ['claude', String.raw`{"session_id":"e697…","cwd":"/Users/dev/demo","hook_event_name":"SessionStart"}`],
  ['codex', String.raw`{"type":"approval-requested","thread-id":"01a1…","cwd":"/Users/dev/demo"}`],
].map(([agent, raw], i) => ({
  id: `anything-else-${i + 1}`,
  row: 'Anything else or unparsable',
  label: 'derived' as const,
  verbatim: false,
  agent: agent as AgentId,
  raw: raw as string,
  expected: null,
  note: 'unparsable input, or an example with hook_event_name / type changed to an unrecorded value',
}));
