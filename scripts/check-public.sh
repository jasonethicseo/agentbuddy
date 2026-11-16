#!/bin/sh
# Read-only privacy check before publishing (submission Requirement 6.1, design "Publishing").
# It holds nothing private itself: the local user name comes from $USER and the token from
# ~/.agentbuddy/token at run time, when they exist (in CI they do not).
# Exit 0 when clean; 1 with the offending lines otherwise.
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1
fail=0
report() { echo "check-public: $1"; fail=1; }

# Real home paths: the only user folder named under /Users or /home may be `dev`.
names=$(git grep -h -o -I -E '/(Users|home)/[A-Za-z0-9._-]+' -- . ':!package-lock.json' | sed -E 's#^/(Users|home)/##; s#[.]+$##' | sort -u | grep -v -x dev || true)
if [ -n "$names" ]; then
  report "user folders other than /Users/dev:"
  for n in $names; do git grep -n -I -E "/(Users|home)/$n" -- . ':!package-lock.json'; done
fi

# The same in every commit of the history, which is published too.
old=$(git log -p --all | grep -o -E '/(Users|home)/[A-Za-z0-9._-]+' | sed -E 's#^/(Users|home)/##; s#[.]+$##' | sort -u | grep -v -x dev || true)
[ -n "$old" ] && report "user folders other than /Users/dev in the history: $(echo $old)"

# The local user name, when it is not a common word.
if [ -n "${USER:-}" ] && [ "${#USER}" -ge 5 ] && [ "$USER" != runner ]; then
  hits=$(git grep -n -I -i -F "$USER" -- . ':!package-lock.json' || true)
  [ -n "$hits" ] && report "local user name found:" && echo "$hits"
  git log -p --all | grep -q -i -F "$USER" && report "local user name found in the history"
fi

# The relay token, if this machine has one.
if [ -f "$HOME/.agentbuddy/token" ]; then
  token=$(tr -d '\n' < "$HOME/.agentbuddy/token")
  [ -n "$token" ] && git grep -q -I -F "$token" -- . && report "the relay token is in a tracked file"
  [ -n "$token" ] && git log -p --all | grep -q -F "$token" && report "the relay token is in the history"
fi

# Full session IDs (UUIDs) outside Kiro's own spec files (tasks.meta.json, .config.kiro), which may keep its internal IDs (structure.md).
uuids=$(git grep -n -I -E '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' -- . ':!package-lock.json' ':!.kiro/specs/*/tasks.meta.json' ':!.kiro/specs/*/.config.kiro' || true)
[ -n "$uuids" ] && report "full UUIDs outside Kiro's own spec files:" && echo "$uuids"

# Commit authors and committers: GitHub noreply addresses only.
emails=$(git log --all --format='%ae%n%ce' | sort -u | grep -v -E '@users\.noreply\.github\.com$' || true)
[ -n "$emails" ] && report "e-mail addresses that are not GitHub noreply:" && echo "$emails"

# The submission rule: /.kiro must not be ignored.
grep -q -E '(^|/)\.kiro' .gitignore 2>/dev/null && report ".gitignore lists .kiro"

[ "$fail" -eq 0 ] && echo "check-public: clean"
exit "$fail"
