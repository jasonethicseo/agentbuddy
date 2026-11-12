# AgentBuddy

A 2000s-messenger-style buddy list for your AI coding agents. Kiro, Claude Code and Codex show up as buddies with a status and a status message, and they ping you when they finish or need your OK.

Everything stays on your machine: the relay listens on `127.0.0.1` only, and nothing is sent anywhere else.

Status: the core pipeline works end to end with a plain, unstyled list. The messenger look, the "ding" and pop-ups, the inbox, the demo build and a setup command come in later specs.

## How it works

```
agent hook ──► agentbuddy-hook <agent> ──POST──► relay (127.0.0.1:4343) ──SSE──► buddy list in the browser
                (normalize, cut text,            (token check, daily log,
                 always exit 0 within 1 s)        state, Kiro progress)
```

- **`agentbuddy-hook`** turns each raw hook payload into one small event and posts it with a token from `~/.agentbuddy/token`. It never writes to stdout or stderr and always exits 0, by 900 ms at the latest, even when the relay is down.
- **`agentbuddy`** (the relay) keeps the state in memory, appends every event to `~/.agentbuddy/events-YYYY-MM-DD.jsonl`, restores the last 24 hours on start, and serves the list at `http://127.0.0.1:4343/`.
- **Buddies and sessions.** A buddy is one agent in one project folder (`Kiro @ agentbuddy`). Under it, each conversation window is a session with its own state. The buddy shows its most urgent session: waiting for approval, then working, then `?` (no news for 10 minutes), then turn done, idle, offline. Expand a buddy to see its sessions; idle and offline ones are hidden until you ask.
- **Kiro progress.** On a Kiro task start, task done or stop, the relay reads the spec's `tasks.md` and shows `task n/m` (top-level tasks only).

## Requirements

- Node.js 20 or later, on macOS or Linux

## Install and run

```sh
npm install
npm run build
npm link          # puts agentbuddy and agentbuddy-hook on your PATH
agentbuddy        # starts the relay; open http://127.0.0.1:4343/
```

`npm run relay` builds and starts the relay without linking. To use another port, set `AGENTBUDDY_PORT` for both the relay and the hooks.

## Connect your agents

Every hook command ends with `|| true`, so a missing or half-built command still exits 0 and never blocks a prompt, blocks a task, or restarts a turn.

**Kiro**: add one file per trigger under the project's `.kiro/hooks/`, for `UserPromptSubmit`, `PreTaskExec`, `PostTaskExec` and `Stop`. This repository's own `.kiro/hooks/agentbuddy-*.json` are working examples:

```json
{
  "version": "v1",
  "hooks": [
    { "name": "AgentBuddy: turn finished", "trigger": "Stop",
      "action": { "type": "command", "command": "agentbuddy-hook kiro || true" }, "timeout": 5 }
  ]
}
```

**Claude Code**: in `~/.claude/settings.json`, append one group to the hook list of `UserPromptSubmit`, `Notification`, `Stop` and `SessionEnd`, next to any hooks you already have. Use `"timeout": 1` on `SessionEnd`, because those hooks share a 1.5-second budget.

```json
{ "hooks": [{ "type": "command", "command": "agentbuddy-hook claude || true", "timeout": 5 }] }
```

**Codex**: `notify` takes one program, so AgentBuddy uses a small relay script that runs your existing `notify` program first, unchanged, and then `agentbuddy-hook codex` with a 0.9-second limit. Install the copy and point `notify` at it in `~/.codex/config.toml`, followed by your old `notify` program and its arguments (or nothing, if you had none):

```sh
mkdir -p ~/.agentbuddy/bin && cp scripts/codex-notify.sh ~/.agentbuddy/bin/ && chmod 700 ~/.agentbuddy/bin/codex-notify.sh
```

```toml
notify = ["/Users/dev/.agentbuddy/bin/codex-notify.sh", "/path/to/your/old/notify-program", "its-args"]
```

The repository script is the original. Check that the installed copy matches with `cmp scripts/codex-notify.sh ~/.agentbuddy/bin/codex-notify.sh`.

## What is stored, and where

All in `~/.agentbuddy/` (folder mode 700, files mode 600):

| File | Contents |
|---|---|
| `token` | random token the hooks send to the relay |
| `events-YYYY-MM-DD.jsonl` | one line per accepted event; prompts and replies are cut to 120 characters before they leave the hook |
| `hook-errors.log` | fixed error codes only (no payload, no text, no token) |
| `bin/codex-notify.sh` | the installed Codex relay script |

Old daily logs are not deleted yet.

## Known limits

- A session's folder is fixed when it is first seen (Claude: `CLAUDE_PROJECT_DIR`). Starting an agent in a subfolder makes a separate buddy; moving into a subfolder later does not.
- Two projects with the same folder name share a display name; the list also shows the full folder.
- Kiro never reports waiting for approval, and its `Stop` has no reply text, so a Kiro status shows the last prompt or task name. Codex reports finished turns only.
- Only Claude reports a session end. Other sessions go offline after 30 minutes and are removed after 24 hours.
- Not yet observed: Claude `Notification`, any Codex `notify` call (Codex in the ChatGPT app may not call it at all, see [openai/codex#13019](https://github.com/openai/codex/issues/13019)), Kiro CLI `SessionEnd`.
- After a restart, progress comes back only if the last Kiro task run is within the last 24 hours.

## Development

```sh
npm test          # unit and property tests
npm run typecheck
npm run dev       # UI dev server, proxying /stream to a running relay
```

`scripts/probe.mjs` is an observation tool that records raw hook payloads (including full prompt text) to `~/.agentbuddy/probe/`. It is not connected by default; remove it from your hooks and delete that folder when you are done observing.

## Third-party libraries

Development only; AgentBuddy has no runtime dependencies.

| Library | Use | License |
|---|---|---|
| [TypeScript](https://www.typescriptlang.org/) | type checking | Apache-2.0 |
| [Vite](https://vite.dev/) | UI dev server and build | MIT |
| [Vitest](https://vitest.dev/) | unit and property test runner | MIT |
| [fast-check](https://fast-check.dev/) | property-based tests | MIT |
| [esbuild](https://esbuild.github.io/) | bundles the hook command and the relay | MIT |
| [@types/node](https://github.com/DefinitelyTyped/DefinitelyTyped) | Node.js type definitions | MIT |

## License

MIT, see [LICENSE](LICENSE).
