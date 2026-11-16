# Demo video — shot list (target 2:40, hard limit under 3:00)

Rules (kiroween.devpost.com/rules): under three minutes; show the project working on its device; public on YouTube; no third-party trademarks or copyrighted music without permission. So: **no music** (the ding is AgentBuddy's own synthesized sound), screen recording plus voice or captions, and the agents' own windows only where the story needs them.

Before recording:
- `npm run app` from the repository; the menu bar icon shows.
- Three agents ready: Kiro IDE on this repository (its `.kiro/hooks` are on), the Claude app or Claude Code CLI on a small sample project, Codex on another.
- Turn on **Settings › Privacy › Hide prompt and reply text** if any real prompt could show something private; turn it off only for prompts written for the video.
- Use sample projects under neutral folder names; close other windows; hide the desktop and the Dock if they show private names.
- Check the ding plays (Settings › Ding! sound).

| Time | Shot | Say / caption |
|---|---|---|
| 0:00–0:12 | The AgentBuddy window in the corner, three buddies | "I run three AI coding agents at once. AgentBuddy puts them in a 2000s-style buddy list." |
| 0:12–0:35 | Send a prompt in Claude; its buddy goes `▸ working…`; Claude asks for a permission → ding, `띠링! ♪ needs your OK` pop-up, alert strip, menu bar count | "When an agent needs my OK, I hear it and see it, even while I'm in another window." |
| 0:35–0:50 | Click `Go there ▶` → the Claude app comes forward; approve; the buddy goes back to working | "One click takes me there. After I approve, it shows working again." |
| 0:50–1:15 | Kiro: run a spec task from `tasks.md`; the buddy shows `studying hard` and the progress bar moves `n/m` when the task finishes | "Kiro's spec tasks show their progress, read from tasks.md. This is the Kiro session building AgentBuddy, reporting on itself." |
| 1:15–1:30 | Codex finishes a turn → `띠링! ♪ new message` pop-up; Inbox shows the day's pings | "Codex only reports finished turns, so that's all AgentBuddy claims for it." |
| 1:30–1:45 | Expand a buddy with two sessions; `×` hides one; the me row status message | "Each window is a session under its buddy." |
| 1:45–1:55 | Skin → Strawberry Milk; the window and an open pop-up change at once | "Two original skins, pixel fonts, no copied messenger art." |
| 1:55–2:15 | Quick cut: `.kiro/steering/events.md` (observed mappings, traps), `.kiro/specs/` (five specs), `.kiro/hooks/` | "Built spec by spec in Kiro. Every hook mapping was observed first and written into steering." |
| 2:15–2:30 | The web demo: https://jasonethicseo.github.io/agentbuddy/ → `Start demo` → the approval pop-up | "No install needed to try it: the demo replays sample events through the same logic." |
| 2:30–2:40 | The window again; repository URL on screen | "Local only, never blocks an agent. AgentBuddy." |

After recording: upload to YouTube as **Public**, then put the link in three places: the README (`Video: coming soon`), `src/demo/page.ts` (`VIDEO_URL`), and the Devpost form. Kiro can make the two file changes and push them.
