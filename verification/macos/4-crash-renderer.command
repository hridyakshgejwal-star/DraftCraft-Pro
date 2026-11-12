#!/bin/bash
# DraftCraft Pro (1.15.3 and later) - native macOS check 4: terminate the TEST copy's editor (renderer) process to exercise
# crash recovery. Only processes started from this folder's app copy are matched.
T="$(cd "$(dirname "$0")" && pwd)"; cd "$T"
exec > >(tee "$T/4-crash-renderer.log") 2>&1
date
P=$(pgrep -f "type=renderer --user-data-dir=$T/profile" | head -1)  # renderer of the isolated test profile only
if [ -z "$P" ]; then echo "no test renderer running"; exit 0; fi
ps -p "$P" -o pid,command | cut -c1-160
kill -9 "$P"; echo "killed renderer pid $P (exit=$?)"
sleep 3
echo "== recovery copies"; ls -la "$T/profile/Project Recovery"
echo "== stderr tail"; tail -5 "$T/app-stderr.log"
echo "== DONE"
