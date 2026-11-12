---
inclusion: always
---

# Events

This file is the contract between agent hooks and AgentBuddy. Every mapping below was observed on 2026-11-12 with a probe script on macOS (Kiro IDE 1.4 / Kiro CLI 3.2.1, Claude Code CLI, Codex CLI TUI). Do not add a mapping that was not observed; mark it as unverified instead.

## What each agent reports (observed)

| State we want | Kiro | Claude Code | Codex |
|---|---|---|---|
| Work started | `UserPromptSubmit` (has `prompt`), `PreTaskExec` (has task) | `UserPromptSubmit` (has `prompt`) | none |
| Waiting for approval | not observed | `Notification` with `notification_type: "permission_prompt"` | none via `notify` |
| Turn finished | `Stop` (no message text) | `Stop` (has `last_assistant_message`) | `agent-turn-complete` |
| Spec task progress | `PreTaskExec`, `PostTaskExec` (has `spec_name` = path to tasks.md, `task_name`, `task_success`) | none | none |
| Idle | none | `Notification` with `notification_type: "idle_prompt"` | none |

## Delivery
- Kiro and Claude Code pass a JSON object on **stdin** to the hook command.
- Codex passes a JSON string as the **last command-line argument** to the `notify` command. stdin is empty.
- Every hook call is a separate short-lived process. Two events from the same agent can arrive out of order.

## Raw payload examples (sanitized)

Kiro `UserPromptSubmit` (stdin):
```json
{"session_id":"sess_ce19…","hook_event_name":"UserPromptSubmit","cwd":"/Users/dev/demo","prompt":"hello"}
```

Kiro `PreTaskExec` (stdin):
```json
{"session_id":"sess_0bcd…","hook_event_name":"PreTaskExec","cwd":"/Users/dev/demo","spec_name":"/Users/dev/demo/.kiro/specs/hello-file/tasks.md","task_name":"2. Change the line in hello.txt"}
```

Kiro `PostTaskExec` (stdin):
```json
{"session_id":"sess_0bcd…","hook_event_name":"PostTaskExec","cwd":"/Users/dev/demo","spec_name":"/Users/dev/demo/.kiro/specs/hello-file/tasks.md","task_name":"2. Change the line in hello.txt","task_success":true}
```

Kiro `Stop` (stdin):
```json
{"session_id":"sess_0bcd…","hook_event_name":"Stop","cwd":"/Users/dev/demo"}
```

Claude Code `UserPromptSubmit` (stdin, other fields omitted):
```json
{"session_id":"e697…","cwd":"/Users/dev/demo","permission_mode":"default","hook_event_name":"UserPromptSubmit","prompt":"delete hello.txt"}
```

Claude Code `Notification` (stdin):
```json
{"session_id":"e697…","cwd":"/Users/dev/demo","hook_event_name":"Notification","message":"Claude needs your permission","notification_type":"permission_prompt"}
```
Also observed: `"message":"Claude is waiting for your input","notification_type":"idle_prompt"`.

Claude Code `Stop` (stdin):
```json
{"session_id":"e9a4…","cwd":"/Users/dev/demo","hook_event_name":"Stop","stop_hook_active":false,"last_assistant_message":"I ran ls. The folder has hello.txt."}
```

Codex `agent-turn-complete` (last argv):
```json
{"type":"agent-turn-complete","thread-id":"01a1…","turn-id":"01a1…","cwd":"/Users/dev/demo","client":"codex-tui","input-messages":["delete hello.txt","make hello.txt again"],"last-assistant-message":"Created hello.txt."}
```

Codex internal title turn `agent-turn-complete` (last argv, see trap 1):
```json
{"type":"agent-turn-complete","thread-id":"01a1…","turn-id":"01a1…","cwd":"/Users/dev/demo","client":"codex-tui","input-messages":["Generate a concise, single-line task title of at most 36 characters and under five words where possible. Start with an imperative verb. ...\n\nUser prompt:\nrun ls"],"last-assistant-message":"{\"title\":\"Run ls\"}"}
```

## Observed after connecting (normal use, 2026-11-12)
Connected on 2026-11-12: Claude Code through `~/.claude/settings.json` hooks (`UserPromptSubmit`, `Notification`, `Stop`, plus a raw-payload probe on those and on `SessionEnd`), Codex through `notify` → `codex-notify.sh`, and a probe on Kiro CLI `SessionEnd`. Versions: Claude Code CLI 2.1.322, Claude app 5.1231.2, Codex CLI 0.165.0, Codex in the ChatGPT app 26.1103.60933, Kiro IDE 1.4.121, Kiro CLI 3.2.1.

Claude app `UserPromptSubmit` (stdin; launched with `__CFBundleIdentifier=com.anthropic.claudefordesktop`, `CLAUDE_CODE_ENTRYPOINT=claude-desktop`):
```json
{"session_id":"81fd…","transcript_path":"/Users/dev/.claude/projects/-Users-dev-demo/81fd….jsonl","cwd":"/Users/dev/demo","scratchpad_dir":"/private/tmp/claude-501/-Users-dev-demo/81fd…/scratchpad","prompt_id":"c0de…","permission_mode":"auto","hook_event_name":"UserPromptSubmit","prompt":"hello"}
```

Claude app `SessionEnd` (stdin):
```json
{"session_id":"aba1…","transcript_path":"/Users/dev/.claude/projects/-Users-dev-demo/aba1….jsonl","cwd":"/Users/dev/demo","scratchpad_dir":"/private/tmp/claude-501/-Users-dev-demo/aba1…/scratchpad","hook_event_name":"SessionEnd","reason":"other"}
```

- The app sends extra fields (`transcript_path`, `scratchpad_dir`, `prompt_id`), and `permission_mode` was `auto`. The fields the mapping reads are the same, so app prompts normalize like CLI prompts (seen in the relay log). No mapping change.
- In the app, the previous session's `SessionEnd` (`reason: "other"`) arrived 0.7 s before the next session's first prompt.
- Claude app `Stop` arrives after every turn (04:13:42, 04:15:28, 04:17:01 UTC for one session). After the session ran `cd`, its `Stop` and later prompts carried the subfolder as `cwd`; with `cwd` in the session key this split the session into two buddies and its `Stop` looked missing from the first one. Fixed by keying sessions on agent + `session` only.
- `SessionEnd` is mapped to `end` from 2026-11-12 (the session goes `OFFLINE` at once). Kiro CLI V3 also has a `SessionEnd` trigger, but no payload has been observed, so Kiro `SessionEnd` stays unmapped.
- `CLAUDE_PROJECT_DIR` is set for hooks by both the app (`claude-desktop`, seen from 04:19 UTC) and the CLI (`cli`, seen at 04:28 UTC). It stays at the project root while `cwd` follows `cd` into a subfolder.
- Claude Code CLI (2.1.322, run in a VS Code terminal: `CLAUDE_CODE_ENTRYPOINT=cli`, `TERM_PROGRAM=vscode`): `UserPromptSubmit` and `Stop` observed at 04:28 UTC. Prompts carry `scratchpad_dir`, `prompt_id`, `permission_mode`; `Stop` also carries `effort`, `stop_hook_active`, `background_tasks`, `session_crons`; app prompts after the first one carry `session_title`. None of these is read by the mapping.
- Replaying all of today's Claude events through the fixed core gives one buddy per session folder: the app session (11 events, 2 different `cwd`) and the CLI session (2 events, 2 different `cwd`).

Claude Code CLI `Stop` (stdin; `CLAUDE_CODE_ENTRYPOINT=cli`, `CLAUDE_PROJECT_DIR=/Users/dev/demo`, after the session ran `cd research`):
```json
{"session_id":"7199…","transcript_path":"/Users/dev/.claude/projects/-Users-dev-demo/7199….jsonl","cwd":"/Users/dev/demo/research","scratchpad_dir":"/private/tmp/claude-501/-Users-dev-demo/7199…/scratchpad","prompt_id":"c0de…","permission_mode":"auto","effort":{"level":"medium"},"hook_event_name":"Stop","stop_hook_active":false,"last_assistant_message":"research has one file.","background_tasks":[],"session_crons":[]}
```

Probe summary at the end of the observation (2026-11-12, 02:29–04:50 UTC; probe connections removed afterwards):

| Agent / launcher | Event | Calls |
|---|---|---|
| Claude app (`claude-desktop`) | `UserPromptSubmit` | 10 |
| Claude app | `Stop` | 10 |
| Claude app | `SessionEnd` (`reason: "other"`) | 1 |
| Claude Code CLI (`cli`) | `UserPromptSubmit` | 1 |
| Claude Code CLI | `Stop` | 1 |
| Claude, any | `Notification` | 0 |
| Codex CLI, Codex in the ChatGPT app | `notify` | 0 |
| Kiro CLI | `SessionEnd` | 0 |

- Value types seen on Claude `Stop`: `effort` an object (`{"level":"medium"}`), `background_tasks` and `session_crons` arrays (empty), `stop_hook_active` boolean (`false`). `permission_mode` was `auto` in every call.
- The relay log over the same span: 64 events from 4 Kiro sessions and 2 Claude sessions, no hook errors.

Not yet observed after connecting:
- Claude app and CLI: `Notification` (`permission_prompt`, `idle_prompt`).
- Claude `SessionEnd` with a reason other than `other` (`clear`, `resume`, `logout`, `prompt_input_exit`).
- Codex CLI and Codex in the ChatGPT app: no `notify` call yet.
- Kiro CLI `SessionEnd`: no call yet.

## Normalized event
The hook command turns every raw payload into one shape, or drops it:

```ts
type AgentId = 'kiro' | 'claude' | 'codex';
type EventKind = 'prompt' | 'task_start' | 'task_done' | 'permission' | 'idle' | 'stop' | 'end';

interface BuddyEvent {
  v: 1;
  agent: AgentId;
  session: string;      // Kiro/Claude session_id, Codex thread-id
  kind: EventKind;
  at: string;           // ISO time stamped by the hook process when it starts
  cwd: string;
  text?: string;        // prompt or last reply, at most 120 code points
  task?: { name: string; specPath: string; success?: boolean };
  firstInput?: string;  // Codex stop only: first `input-messages` item, at most 120 code points
  projectDir?: string;  // Claude only: CLAUDE_PROJECT_DIR from the hook's environment
}
```

| Raw | Normalized |
|---|---|
| Kiro `UserPromptSubmit` | `prompt`, text = `prompt` |
| Kiro `PreTaskExec` | `task_start`, task = { name, specPath } |
| Kiro `PostTaskExec` | `task_done`, task = { name, specPath, success } |
| Kiro `Stop` | `stop` |
| Claude `UserPromptSubmit` | `prompt`, text = `prompt` |
| Claude `Notification` + `permission_prompt` | `permission` |
| Claude `Notification` + `idle_prompt` | `idle` |
| Claude `Notification` + any other type | dropped |
| Claude `Stop` | `stop`, text = `last_assistant_message` |
| Claude `SessionEnd` (any `reason`) | `end` |
| Codex `agent-turn-complete` | `stop`, text = `last-assistant-message`, firstInput = first `input-messages` item |
| Codex internal title turn (trap 1) | dropped |
| Anything else or unparsable | dropped, never thrown |

All Claude rows also set `projectDir` from the hook process's `CLAUDE_PROJECT_DIR` environment variable when it is set (Claude Code sets it for hooks: the project root where the session started).

## Known traps (observed)
1. **Codex title turns.** For each user prompt, Codex also runs a hidden turn that writes a short title. It fires `agent-turn-complete` with a different `thread-id`. Its last `input-messages` item starts with `Generate a concise, single-line task title`, and its `last-assistant-message` is JSON like `{"title":"…"}`. Drop the event if **either** signal matches.
2. **Codex `input-messages` accumulates** within a thread. Use only the last item for the title-turn check. The first item is the thread's first user request (observed: `["delete hello.txt","make hello.txt again"]`), so it names the Codex session.
3. **Claude does not send `Stop` after a rejected approval.** A rejection is treated as an interrupt. The buddy would stay in "waiting for approval" forever. The `idle_prompt` notification that follows later must move it out (see State rules).
4. **Kiro `PostTaskExec` only fires when a task runs through the spec task runner** (the task's run button). A task done by chatting fires only `Stop`. Progress must therefore also be recomputed from `tasks.md` on every Kiro `Stop` when a spec path is known for that buddy.
5. **Kiro `Stop` has no message text.** Kiro status messages come from the prompt or the task name.
6. **Kiro starts a new `session_id` for every task run.** Each press of a task's run button produced a new session (`sess_dcdb…`, `sess_0bcd…`), separate from the chat session (`sess_ce19…`). Progress and the spec path therefore belong to the buddy, not to a session (see Buddies and sessions).

## Buddies and sessions
- Two levels. A **buddy** is one **agent + session folder** pair. Under it, each **session** (agent + `session`) is one conversation window. Several sessions of the same agent in the same folder at once are normal; each keeps its own state.
- A **session's folder is fixed**: Claude's `CLAUDE_PROJECT_DIR` (sent as `projectDir`) when the session reports it, else the `cwd` of the session's earliest event. `cwd` is not part of the session key, so a session that runs `cd` stays in its buddy (observed: a Claude app session moved into a subfolder and its `Stop` events carried the subfolder as `cwd`).
- Display name of a buddy: `<Agent> @ <folder name>`, where the folder name is the last segment of `cwd` (for example `Kiro @ demo`).
- **Buddy state** is the most urgent displayed state among its sessions: `WAITING_APPROVAL` > `WORKING` > `STALE` > `TURN_DONE` > `IDLE` > `OFFLINE`. The buddy row shows the status text of that session (if tied, the one with the latest event).
- **Session name**: the session's first prompt text; for Codex, its `firstInput`; else its first task name; else its start time (the earliest `at`). Names are cut to 40 code points.
- Per buddy, not per session: the latest task event (the latest of its sessions' latest task events), the Kiro spec path, and progress.
- `IDLE` and `OFFLINE` sessions are hidden by default when a buddy is expanded. The buddy itself stays.
- A session whose last event is more than 24 hours old is removed from memory (the same 24 hours as the restore window). A buddy's latest task event is kept for 24 hours even when no session of that buddy is left.
- Notifications (later spec) are per session.

## State rules (pure core, property-tested)
| State | Entered by |
|---|---|
| `WORKING` | `prompt`, `task_start` |
| `WAITING_APPROVAL` | `permission` |
| `TURN_DONE` | `stop` |
| `IDLE` | `idle`, or no event for 10 minutes while `TURN_DONE` |
| `OFFLINE` | no event for 30 minutes in any state |
| `STALE` | no event for 10 minutes while `WORKING` or `WAITING_APPROVAL` (shown as "?") |
| `ENDED` | `end`; shown as `OFFLINE` at once, whatever the time |

- `task_done` keeps the state and updates progress.
- `end` (Claude `SessionEnd`) ends that session_id whatever the reason; `/clear` and `/resume` continue under another session_id. Earlier events of the session that arrive late do not bring it back, because `end` is later in event order (and last on `at` ties). A later event with the same session_id does bring it back, by the normal rules: Claude `--resume <id>` continues a session under its old session_id.
- State is computed per session. Each session keeps its latest 50 events sorted by `at`, and its state is recomputed from the start of that list on every new event. A late event is inserted in its place, never ignored. The time rules (10 and 30 minutes) apply per session.
- Each session also keeps, outside the 50-event list, its earliest event, earliest prompt with text, earliest `firstInput`, earliest task event and earliest `projectDir`, for its name and folder. Each session keeps its latest task event too.
- Each buddy keeps its latest task event (`task_start` or `task_done`, from any of its sessions) outside the lists. It is replaced only by a task event that is later in the same order, so arrival order never changes it. The Kiro spec path comes from this event, so long chats and new task-run sessions keep progress.
- Event order: `at`, then kind (`prompt`, `task_start`, `permission`, `task_done`, `stop`, `idle`, `end`), then `session`, then arrival order. Within one session only arrival order can break a full tie.
- Status text of a session comes from its latest event that carries text (`text`, or `task.name` for task events). Events without text keep the earlier text, so a Kiro `stop` keeps the preceding prompt's text.
- Codex sessions only ever reach `TURN_DONE`, `IDLE`, `OFFLINE`. The UI says "Codex reports finished turns only".
