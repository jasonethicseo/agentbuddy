---
inclusion: always
---

# Product: AgentBuddy (working name)

## One-line
A 2000s-messenger-style buddy list for your AI coding agents. Kiro, Claude Code and Codex show up as buddies with a status and a status message, and they ping you like a messenger when they finish or need your OK.

## Category
Kiroween 2026 — **Frankenstein**: a 2000s instant-messenger buddy list stitched onto today's AI coding agents through Kiro hooks, Claude Code hooks and Codex notify.

## Problem
- Developers now run several AI coding agents at once, in different windows and terminals.
- They cannot see at a glance who is working, who finished, and who is stuck waiting for approval.
- A stuck agent is found late. A finished agent waits for its next instruction. Each tool notifies in its own way, so attention is scattered.

## Target user
- Primary: a developer who runs two or more coding agents in parallel on one machine.
- Demo persona: the builder, who uses Kiro, Claude Code and Codex side by side.

## Core idea
The buddy list was designed to answer "who is around and what are they doing right now". Put agents in it instead of friends.

| Messenger element | What it means for an agent |
|---|---|
| Online / busy / away icon | Working / waiting for approval / turn done / idle |
| Status message | The current prompt or task, e.g. `studying hard ♪ task 4/12` |
| "Ding!" message window | The agent finished or needs your OK |
| Message box (inbox) | A history of today's pings |
| Logging off | Session ended or silent for a long time |

## Core flow (MVP)
1. **Install once**: add the AgentBuddy hook command to each agent (Kiro hooks, Claude Code hooks, Codex `notify`). A setup command prints the exact snippets.
2. **Open the app**: `npm run app` opens a small buddy-list window in a corner of the screen and a menu bar icon. The app starts its own local relay, or attaches to an `agentbuddy` relay that already runs. The relay also serves the buddy list to a browser at `http://127.0.0.1:4343/`.
3. **Work as usual**: each agent's hook sends a small event to the relay. The buddy list updates live.
4. **Get pinged**: when an agent finishes a turn or asks for approval, a "ding" sound plays and a message window pops up.
5. **Kiro progress**: for Kiro spec tasks, the status shows `task n/m` read from the spec's `tasks.md`.
6. **Inbox**: every ping is kept in a local message box for the day.
7. **Demo mode**: a static build replays recorded events, so judges can see the whole experience without installing agents.

## Principles
- **Local only.** Events never leave the machine. The relay listens on `127.0.0.1` only. No accounts, no cloud.
- **Show only what the agent actually tells us.** Each agent reports different events (see events.md). Never fake a state we cannot observe; label what is unknown.
- **Short text only.** Prompts and replies are truncated for status messages. A setting hides message text entirely.
- **Never block an agent.** The hook command always exits 0 quickly, even if the relay is down.
- **Read-only toward agents.** AgentBuddy never answers, approves or controls an agent.

## Non-goals (MVP)
- Approving or replying to agents from the buddy list
- Cloud sync, accounts, sharing with other people
- Sending code, full prompts or transcripts anywhere
- Mobile apps, desktop installers
- Agents other than Kiro, Claude Code and Codex

## Language and tone
- Reply to the user in Korean. Keep code, comments, commit messages, specs and steering files in English.
- UI text in English for international judges. One exception: the pop-up title starts with the Korean `띠링!` ("ding"), as the design shows; screen readers read it as `Ding!` (themes spec, 2026-11-13).
- Status messages carry 2000s messenger flavor: `♪`, `~`, `T_T`, `brb`, short and playful.
- The look is an original design inspired by 2000s messengers. No logos, names, icons or screens copied from any real messenger product.

## Demo success criteria
- A judge opens the demo URL and, within 60 seconds, sees three agent buddies change state, a Kiro progress bar move, and an approval ping pop up with sound.
- The demo video shows the real thing: three real agents running on the builder's machine, with AgentBuddy tracking them, including AgentBuddy tracking the Kiro session that builds AgentBuddy itself.
