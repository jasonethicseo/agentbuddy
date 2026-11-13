# AgentBuddy

A 2000s-messenger-style buddy list for your AI coding agents. Kiro, Claude Code and Codex show up as buddies with a status and a status message, and they ping you when they finish or need your OK.

Everything stays on your machine: the relay listens on `127.0.0.1` only, and nothing is sent anywhere else.

Status: the hooks, the relay and the macOS desktop app work (run from source). The demo build for the web and a setup command come in later specs.

## How it works

```
agent hook ──► agentbuddy-hook <agent> ──POST──► relay (127.0.0.1:4343) ──SSE──► desktop app (window, pop-ups, menu bar)
                (normalize, cut text,            (token check, daily log,  └─SSE──► buddy list in a browser
                 always exit 0 within 1 s)        state, Kiro progress)
```

- **`agentbuddy-hook`** turns each raw hook payload into one small event and posts it with a token from `~/.agentbuddy/token`. It never writes to stdout or stderr and always exits 0, by 900 ms at the latest, even when the relay is down.
- **`agentbuddy`** (the relay) keeps the state in memory, appends every event to `~/.agentbuddy/events-YYYY-MM-DD.jsonl`, restores the last 24 hours on start, and serves the list at `http://127.0.0.1:4343/`.
- **Buddies and sessions.** A buddy is one agent in one project folder (`Kiro @ agentbuddy`). Under it, each conversation window is a session with its own state. The buddy shows its most urgent session: waiting for approval, then working, then `?` (no news for 10 minutes), then turn done, idle, offline. Expand a buddy to see its sessions; idle and offline ones are hidden until you ask.
- **Kiro progress.** On a Kiro task start, task done or stop, the relay reads the spec's `tasks.md` and shows `n/m` with a bar (top-level tasks only).

## Requirements

- Node.js 20 or later, on macOS or Linux, for the hooks and the relay
- macOS for the desktop app

## Install and run

```sh
npm install
npm run build
npm link          # puts agentbuddy and agentbuddy-hook on your PATH
agentbuddy        # starts the relay; open http://127.0.0.1:4343/
```

`npm run relay` builds and starts the relay without linking. To use another port, set `AGENTBUDDY_PORT` for both the relay and the hooks.

## Desktop app

```sh
npm run app       # builds, then starts the app from source (Electron)
```

- **Own or attached relay.** The app starts its own relay on the port. If an `agentbuddy` relay already runs there, the app attaches to it and only reads its stream; quitting the app then leaves that relay running. If the attached relay goes away, the app starts its own on the next retry (every 3 s). Settings › Connections shows which one is in use.
- **Window and menu bar.** A 320 px window in the top-right corner, always on top by default (the ▲ pin button or Settings). A toolbar under the title bar switches between Buddies, Inbox and Settings, and its Skin button opens the Skin group; from the keyboard it is one Tab stop, and ←/→, Home and End move between its buttons. Closing it keeps the app in the menu bar; the bubble icon there shows a count of sessions waiting for your OK plus finished turns you have not looked at, and its menu shows the list or the inbox, or quits. There is no Dock icon. Cmd+Q also quits.
- **Pings.** When a session finishes a turn or needs your OK, the app plays a synthesized ding and slides up a pop-up in the bottom-right corner. Pop-ups never take focus, close by themselves after 6 s and stack upward. `Go there ▶` (or a click on the card) brings forward the app the session runs in, × closes and marks it read, `Later` only closes. States the app finds when it connects never ping.
- **Inbox.** Every ping of the day, newest first, with the ones you have not looked at marked. A click goes there; `Mark all read` marks everything read.
- **Jump.** A click on a buddy, a session, a pop-up or an inbox entry brings that agent's app forward with `/usr/bin/open -b <bundle ID>`, after `/usr/bin/lsappinfo` confirms it is running (it never starts an app). No folder is passed, so a click never opens a new window. The bundle ID comes from the environment of the agent's hook process; Codex in the ChatGPT app reports none, so a Codex session without one goes to the Codex app (`com.openai.codex`) when it runs.
- **Hiding.** × on a session (or on a buddy with one visible session) hides that row until the session does something new.
- **"me" row.** Your own status message at the top of the list. It stays in the settings file and is never sent anywhere.
- **TIP banner.** A small strip at the bottom of the buddy list with one built-in tip (nothing is downloaded). The first tip of the day follows the date; after that it changes only when you click it or its ▶ button. A click on a tip that points somewhere opens that place. Settings › Banner hides it.
- **Settings.** The skin (Blue Bot, the default, or Strawberry Milk; it changes the window and open pop-ups at once), the TIP banner, ding sound, message pop-ups, macOS notifications (off by default), always on top, and "Hide prompt and reply text", which keeps every agent's text off the screen, pop-ups and notifications.
- **Skins.** A 2000s desktop-messenger look: glossy title bar, raised buttons, sunken panels and the Galmuri pixel fonts. Each skin is one block of CSS custom properties (`src/ui/styles/themes/`) and one module of pixel sprites (`src/ui/sprites/`), drawn from the mockups in `docs/mockups/`. The buddies and icons are original pixel art.

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
| `inbox-YYYY-MM-DD.jsonl` | the app's inbox: one line per ping (buddy name, session key, session name, state, time) and per "read" mark |
| `app-settings.json` | the app's settings (including the skin as `theme` and `hideBanner`), closed groups, hidden sessions and your "me" status message |
| `electron/` | Electron's own data for the app (caches, local storage) |

Old daily logs and inbox files are not deleted yet. Run from source, the app is the Electron binary, so macOS also keeps a small preferences file for it at `~/Library/Preferences/com.github.Electron.plist`.

## Known limits

- A session's folder is fixed when it is first seen (Claude: `CLAUDE_PROJECT_DIR`). Starting an agent in a subfolder makes a separate buddy; moving into a subfolder later does not.
- Two projects with the same folder name share a display name; the list also shows the full folder.
- Kiro never reports waiting for approval, and its `Stop` has no reply text, so a Kiro status shows the last prompt or task name. Codex reports finished turns only.
- Only Claude reports a session end. Other sessions go offline after 30 minutes and are removed after 24 hours.
- Not yet observed: Claude `Notification`, any Codex `notify` call (Codex in the ChatGPT app may not call it at all, see [openai/codex#13019](https://github.com/openai/codex/issues/13019)), Kiro CLI `SessionEnd`.
- After a restart, progress comes back only if the last Kiro task run is within the last 24 hours.
- The app's first list after every connection is a baseline: a turn that finishes while the app is closed or reconnecting gives no ping and no count.
- An attached relay built before the desktop app sends no launcher and shows ended sessions as `offline`; a click then says `can't tell which app this session is in`.
- With several Kiro windows open, a jump brings Kiro forward with the window used last, which may not be the session's own window.
- Inside `tmux`, the bundle ID is that of the app that started the tmux server.
- The ding and pop-ups do not follow macOS Focus modes; turn them off in Settings.
- At midnight, earlier entries leave the inbox and stop counting.
- Run from source, macOS does not allow Electron to post notifications, so turning macOS notifications on shows a notice instead. The pop-ups and the ding keep working.
- The main window is transparent so that the page can draw its rounded top corners (7 px); its macOS shadow and its 420 px minimum height have not been checked by eye yet.
- Some sprites are drawn at sizes that are not whole multiples of their pixel grid (the 16 px title icon and Skin tiles, the 28 px banner mascot, the strawberry at 12 and 10 px), so a few pixel rows are one screen pixel wider than others.
- Terminal tabs are never selected; a jump brings the terminal app forward.
- The desktop app runs on macOS only and is not packaged or signed.

## Development

```sh
npm test          # unit and property tests
npm run typecheck
npm run dev       # UI dev server, proxying /stream to a running relay
```

`scripts/probe.mjs` is an observation tool that records raw hook payloads (including full prompt text) to `~/.agentbuddy/probe/`. It is not connected by default; remove it from your hooks and delete that folder when you are done observing.

## Third-party libraries

Development only; the hook command and the relay have no runtime dependencies.

| Library | Use | License |
|---|---|---|
| [TypeScript](https://www.typescriptlang.org/) | type checking | Apache-2.0 |
| [Vite](https://vite.dev/) | UI dev server and build | MIT |
| [Vitest](https://vitest.dev/) | unit and property test runner | MIT |
| [fast-check](https://fast-check.dev/) | property-based tests | MIT |
| [esbuild](https://esbuild.github.io/) | bundles the hook command and the relay | MIT |
| [@types/node](https://github.com/DefinitelyTyped/DefinitelyTyped) | Node.js type definitions | MIT |
| [Electron](https://www.electronjs.org/) | runs the desktop app from source | MIT |

Bundled with the UI (in `src/ui/public/fonts/`, with their license files):

| Font | Use | License |
|---|---|---|
| [Nanum Gothic](https://fonts.google.com/specimen/Nanum+Gothic) (NHN Corporation) | fallback for any character Galmuri lacks | SIL Open Font License 1.1, `OFL-NanumGothic.txt` |
| [Galmuri](https://github.com/quiple/galmuri) 2.40.3 (Lee Minseo), from npm `galmuri`: Galmuri11 Regular and Bold, Galmuri9 | all UI text (12 px) and small text (10 px) | SIL Open Font License 1.1, `OFL-Galmuri.txt` |

## License

MIT, see [LICENSE](LICENSE).
