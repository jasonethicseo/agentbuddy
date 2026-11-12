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

## Normalized event
The hook command turns every raw payload into one shape, or drops it:

```ts
type AgentId = 'kiro' | 'claude' | 'codex';
type EventKind = 'prompt' | 'task_start' | 'task_done' | 'permission' | 'idle' | 'stop';

interface BuddyEvent {
  v: 1;
  agent: AgentId;
  session: string;      // Kiro/Claude session_id, Codex thread-id
  kind: EventKind;
  at: string;           // ISO time stamped by the hook process when it starts
  cwd: string;
  text?: string;        // prompt or last reply, at most 120 code points
  task?: { name: string; specPath: string; success?: boolean };
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
| Codex `agent-turn-complete` | `stop`, text = `last-assistant-message` |
| Codex internal title turn (trap 1) | dropped |
| Anything else or unparsable | dropped, never thrown |

## Known traps (observed)
1. **Codex title turns.** For each user prompt, Codex also runs a hidden turn that writes a short title. It fires `agent-turn-complete` with a different `thread-id`. Its last `input-messages` item starts with `Generate a concise, single-line task title`, and its `last-assistant-message` is JSON like `{"title":"…"}`. Drop the event if **either** signal matches.
2. **Codex `input-messages` accumulates** within a thread. Use only the last item.
3. **Claude does not send `Stop` after a rejected approval.** A rejection is treated as an interrupt. The buddy would stay in "waiting for approval" forever. The `idle_prompt` notification that follows later must move it out (see State rules).
4. **Kiro `PostTaskExec` only fires when a task runs through the spec task runner** (the task's run button). A task done by chatting fires only `Stop`. Progress must therefore also be recomputed from `tasks.md` on every Kiro `Stop` when a spec path is known for that buddy.
5. **Kiro `Stop` has no message text.** Kiro status messages come from the prompt or the task name.
6. **Kiro starts a new `session_id` for every task run.** Each press of a task's run button produced a new session (`sess_dcdb…`, `sess_0bcd…`), separate from the chat session (`sess_ce19…`). A buddy is therefore not a session (see Buddies).

## Buddies
- A buddy is one **agent + `cwd`** pair. All sessions of that agent in that exact `cwd` string feed the same buddy.
- Display name: `<Agent> @ <folder name>`, where the folder name is the last segment of `cwd` (for example `Kiro @ demo`).
- `session` is kept in every event and in the log, but never used to split buddies.
- Known limit: two windows of the same agent in the same folder merge into one buddy. Their events interleave and the buddy shows whichever happened last.

## State rules (pure core, property-tested)
| State | Entered by |
|---|---|
| `WORKING` | `prompt`, `task_start` |
| `WAITING_APPROVAL` | `permission` |
| `TURN_DONE` | `stop` |
| `IDLE` | `idle`, or no event for 10 minutes while `TURN_DONE` |
| `OFFLINE` | no event for 30 minutes in any state |
| `STALE` | no event for 10 minutes while `WORKING` or `WAITING_APPROVAL` (shown as "?") |

- `task_done` keeps the state and updates progress.
- State is computed per buddy. Each buddy keeps its latest 50 events sorted by `at`, and its state is recomputed from the start of that list on every new event. A late event is inserted in its place, never ignored.
- Each buddy also keeps its latest task event (`task_start` or `task_done`) outside the 50-event list. It is replaced only by a task event that is later in the same order, so arrival order never changes it. The Kiro spec path comes from this event, so long chats after a task run keep progress.
- Ties on `at` are ordered by kind: `prompt`, `task_start`, `permission`, `task_done`, `stop`, `idle`. If still tied, arrival order decides.
- Status text comes from the latest event that carries text (`text`, or `task.name` for task events). Events without text keep the earlier text, so a Kiro `stop` keeps the preceding prompt's text.
- Codex buddies only ever reach `TURN_DONE`, `IDLE`, `OFFLINE`. The UI says "Codex reports finished turns only".
