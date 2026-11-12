#!/bin/bash
set -e

echo "=== Building DraftCraft Pro for macOS (Apple Silicon aarch64-apple-darwin) ==="
cargo build --release --target aarch64-apple-darwin --workspace

APP_NAME="DraftCraft Pro.app"
APP_DIR="target/macOS/$APP_NAME"
CONTENTS="$APP_DIR/Contents"
MACOS="$CONTENTS/MacOS"
RESOURCES="$CONTENTS/Resources"

mkdir -p "$MACOS" "$RESOURCES"
cp target/aarch64-apple-darwin/release/draftcraft "$MACOS/draftcraft"
cp packaging/Info.plist "$CONTENTS/Info.plist"

echo "Application bundle assembled at: $APP_DIR"
echo "Code signing with Developer ID Certificate when credentials available:"
echo "codesign --force --options runtime --sign 'Developer ID Application: DraftCraft Systems' '$APP_DIR'"
echo "Notarizing with Apple notarytool:"
echo "xcrun notarytool submit DraftCraft.dmg --keychain-profile 'notary-profile' --wait"
