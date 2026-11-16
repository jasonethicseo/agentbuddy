# AgentBuddy — Devpost text description

Category: **Frankenstein**. Demo: https://jasonethicseo.github.io/agentbuddy/ · Code: https://github.com/jasonethicseo/agentbuddy (MIT)

## Inspiration

I run Kiro, Claude Code and Codex side by side, in different windows and terminals. I kept finding an agent that had been waiting for my OK for ten minutes, or one that had finished long ago and sat idle. Every tool notifies in its own way, so my attention was scattered.

The 2000s desktop messenger already solved "who is around and what are they doing right now" with a buddy list. AgentBuddy puts the agents in it instead of friends.

## What it does

- **Buddies.** Each agent in each project folder is a buddy (`Kiro @ agentbuddy`). Its face and status line show what it is doing: `need your OK T_T`, `▸ working…`, `★ done~ your turn!`, `? no news for a while`, `brb~ zZ`, `logged off`. Each conversation window is a session under its buddy.
- **Status messages.** The current prompt or task, cut to 40 characters. A setting hides all agent text.
- **Kiro progress.** For Kiro spec tasks, the buddy shows `n/m` and a progress bar read from the spec's `tasks.md`.
- **Ding!** When a session finishes a turn or asks for approval, a synthesized two-note ding plays and a small message window slides up (`띠링! ♪ needs your OK`). The window never takes focus. `Go there ▶` brings that agent's app forward.
- **Inbox.** Every ping of the day, with the unread ones marked.
- **Menu bar count, alert strip, TIP banner, a "me" status message, and two skins** (Blue Bot, Strawberry Milk). All of it is original pixel art and pixel fonts. Nothing is copied from a real messenger.

## The Frankenstein stitch

Three agents that know nothing of each other, each with its own way of reporting, stitched into one 2000s messenger:

| Agent | What it reports | How AgentBuddy hears it |
|---|---|---|
| Kiro | prompts, spec task start and finish, turn end | Kiro agent hooks (`.kiro/hooks/`) |
| Claude Code (CLI and app) | prompts, permission prompts, tool runs, turn end, session end | Claude Code hooks |
| Codex | finished turns only (seen from the Codex app; no CLI call observed yet) | the `notify` program, through a relay script that keeps any existing `notify` |

A small hook command turns each raw payload into one event shape. It always exits 0 within a second, so it never blocks an agent. A local relay on `127.0.0.1` keeps the state, appends a daily log and streams updates to the desktop app (Electron, macOS) and to a browser page.

**It shows only what an agent actually tells it.** Kiro never reports waiting for approval, and Codex reports finished turns only, so AgentBuddy never pretends otherwise. Every mapping in `.kiro/steering/events.md` was observed with a probe first. The same file records the traps found in real use: hidden Codex title, suggestion and safety-check turns, a Claude session that runs `cd`, and Claude sending no event after an approval.

## How to try it

- **Demo (no install):** open https://jasonethicseo.github.io/agentbuddy/ and press `Start demo`. This is the app's own window and pop-ups in a browser, fed by a one-minute scenario of invented events in the real hook format. The events go through the same state rules and the same ping and inbox logic. Within a minute you see Kiro working through spec tasks with its progress bar, Claude Code asking for an OK (ding and pop-up), working on after it and finishing, and Codex finishing a turn.
- **Real setup (macOS, Node 20+):** `npm install && npm run build && npm link`, then connect the hooks as the README shows, and run `npm run app`.

## How we built it

With Kiro, spec by spec: core pipeline → messenger app → themes → retro skin → demo and submission. See `kiro.md`.

## Challenges

- **Agents behave differently from what their docs suggest.** For example, the Claude app's `Stop` carried a subfolder after the session ran `cd`, which split one session into two buddies. Codex runs hidden turns with their own thread IDs. Each case was observed, written into `events.md` and fixed with a test.
- **Never blocking an agent.** The hook has a hard limit: 500 ms for stdin, 300 ms for the POST, and it exits at 900 ms no matter what. Every hook command ends in `|| true`.
- **Local only.** No account, no cloud. The relay binds to `127.0.0.1`, POSTs need a token, and browser `Origin` requests are refused. The app's windows load only its own files.

## What's next

- Jump straight into a specific Claude app or Codex app session, using their deep links.
- A setup command that prints the hook snippets.
- A packaged app.

## Limits (honest)

- macOS only for the desktop app, run from source, not signed.
- Kiro reports no approval prompts, and Codex only finished turns.
- A jump brings an agent's app forward; it cannot select a terminal tab or a specific Kiro window.
