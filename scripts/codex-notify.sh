#!/bin/sh
# Codex `notify` relay for AgentBuddy.
#
# config.toml:
#   notify = ["<this script>", "<original notify program>", "<its args>"...]
#   notify = ["<this script>", "--probe", "<original notify program>", "<its args>"...]   (observation)
#
# Codex appends its JSON payload as the last argument. This script:
#   1. runs the original program first, with exactly the arguments it received
#      (including the payload), in the foreground with Codex's stdin, stdout and
#      stderr, and exits with that program's exit status. Nothing about the
#      original program changes, including how long it takes.
#   2. then runs `agentbuddy-hook codex <payload>` (and, with --probe, the
#      observation probe) with no input or output, stopped after 0.9 seconds (agentbuddy-hook also stops itself at 900 ms).
#      Any failure there is ignored and never changes the exit status.
# With only the payload (no original program), step 1 is skipped and the exit status is 0.

probe=0
if [ "${1-}" = "--probe" ]; then
  probe=1
  shift
fi
[ "$#" -gt 0 ] || exit 0

status=0
if [ "$#" -ge 2 ]; then
  "$@"
  status=$?
fi

for payload do :; done
here=$(CDPATH= cd -- "$(dirname -- "$0")" 2>/dev/null && pwd)

{
  agentbuddy-hook codex "$payload" &
  ours=$!
  if [ "$probe" = 1 ] && [ -n "$here" ]; then
    node "$here/probe.mjs" codex "$payload" &
    ours="$ours $!"
  fi
  ( sleep 0.9; kill -9 $ours ) &
  watchdog=$!
  wait $ours
  kill "$watchdog"
} </dev/null >/dev/null 2>&1

exit "$status"
