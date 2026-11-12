#!/bin/bash
# DraftCraft Pro (1.15.3 and later) - stop only the test copies started by these scripts (this folder's app/ and the /tmp copy).
# The installed /Applications copy is never matched. Writes 5-stop-test-copy.log next to this script.
T="$(cd "$(dirname "$0")" && pwd)"; cd "$T"
exec > >(tee "$T/5-stop-test-copy.log") 2>&1
date
for P in "$T/app/DraftCraft Pro.app/Contents/MacOS/DraftCraft Pro" /tmp/draftcraft-*-test/app/"DraftCraft Pro.app"/Contents/MacOS/"DraftCraft Pro"; do
  echo "== $P"; pgrep -f "^$P" || echo "  not running"
  pkill -TERM -f "^$P" && sleep 5
  pgrep -f "^$P" >/dev/null && { echo "  still running, sending KILL"; pkill -KILL -f "^$P"; sleep 1; }
  pgrep -f "^$P" || echo "  stopped"
done
echo "== remaining DraftCraft processes"; pgrep -lf "DraftCraft Pro" | cut -c1-160 || echo "  none"
echo "== DONE"
