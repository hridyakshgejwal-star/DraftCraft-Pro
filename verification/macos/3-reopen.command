#!/bin/bash
# DraftCraft Pro (1.15.3 and later) - native macOS check 3: send the "reopen" event (what clicking the Dock icon sends) to the
# running test copy, then report windows/processes. Use after all windows of the test copy are closed.
T="$(cd "$(dirname "$0")" && pwd)"; cd "$T"
exec > >(tee "$T/3-reopen.log") 2>&1
date
echo "== processes"; pgrep -lf "$T/app/DraftCraft Pro.app" || echo "  NOT RUNNING"
# Only when the test copy is running: a cold launch from here would not carry the isolated profile.
if pgrep -f "$T/app/DraftCraft Pro.app/Contents/MacOS/DraftCraft Pro" >/dev/null; then open "$T/app/DraftCraft Pro.app"; echo "open (reopen) exit=$?"; else echo "test copy not running; nothing sent"; fi
sleep 6
echo "== stderr tail"; tail -20 "$T/app-stderr.log" 2>/dev/null
echo "== DONE"
