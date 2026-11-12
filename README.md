# AgentBuddy

A 2000s-messenger-style buddy list for your AI coding agents. Kiro, Claude Code and Codex show up as buddies with a status and a status message, and they ping you when they finish or need your OK.

Everything stays on your machine: the relay listens on `127.0.0.1` only.

Status: work in progress. Usage instructions arrive with the core pipeline.

## Requirements

- Node.js 20 or later

## Development

```sh
npm install
npm test
```

`scripts/codex-notify.sh` is the original; Codex runs an installed copy in `~/.agentbuddy/bin/`. Check that the copy matches with `cmp scripts/codex-notify.sh ~/.agentbuddy/bin/codex-notify.sh`. `scripts/probe.mjs` is an observation tool that records raw hook payloads (including full prompt text) to `~/.agentbuddy/probe/`; it is not connected by default.

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
