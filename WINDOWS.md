# DraftCraft Pro on Windows

The Windows version is the same app as the Mac version: the same source code, features and project files. It is
built from this repository on a Windows machine by GitHub Actions (`.github/workflows/windows.yml`). The workflow
runs the unit tests and the app's own native self-test on the packaged Windows app, then attaches the installer and
a portable zip to the [Release](https://github.com/hridyakshgejwal-star/DraftCraft-Pro/releases).

## Install

**Requirements.** Windows 10 or 11, 64-bit (x64). Windows on ARM runs the x64 build through Windows' emulation.

**Installer (recommended).** Download and run **`DraftCraft-Pro-1.18.0-x64-Setup.exe`**. It:
* installs for your user account, with no administrator password needed (it can also be installed for all users);
* adds a Start menu shortcut, and a desktop shortcut if you tick it;
* opens `.draftcraft` projects in DraftCraft Pro;
* adds DraftCraft Pro under **Open with** for Final Draft (`.fdx`) and Fountain (`.fountain`) scripts, without
  changing your default app for them.

Uninstall from **Settings › Apps**. Installing, updating and uninstalling never touch your projects or settings.

**Portable zip.** Unzip **`DraftCraft-Pro-1.18.0-win-x64-portable.zip`** anywhere and run `DraftCraft Pro.exe`.

**SmartScreen.** The app is not code-signed, so Windows may show "Windows protected your PC". Click **More info**,
then **Run anyway**. You can check the download against `SHA256SUMS-windows.txt` on the release page. In PowerShell:

```powershell
Get-FileHash .\DraftCraft-Pro-1.18.0-x64-Setup.exe -Algorithm SHA256
```

## What is different on Windows

All writing, formatting, templates, Final Draft and Fountain import and export, PDF, Beat Board, Outline Editor,
Navigator, Start Window, recent projects, emoji picker, spelling, Smart Save and the tutorials work the same.
Differences come only from what Windows itself provides:

| Area | On Windows |
|---|---|
| Window and menus | The app draws its own title bar, with close, minimize and full-screen buttons, and its own menu bar inside the window. This is the app's existing design for systems other than macOS. |
| Keyboard shortcuts | Shortcuts are shown with Mac symbols. **⌘ means Ctrl** on Windows: for example ⌘S is Ctrl+S. |
| Emoji | Use the **Emoji** toolbar button or right-click › **Insert Emoji…**. Windows' own emoji panel (Win + .) also works in any text field. |
| Spelling | English is built in. Other languages use Windows' spell checker and the languages installed in Windows. |
| Table read voices | The macOS system voices exist only on a Mac. On Windows, choose ElevenLabs or a local voice server in Table Read. |
| Dictation | The on-device Speech helper uses Apple's speech recognition and is available only on a Mac. Windows' own voice typing (Win + H) works in any text field. |
| Window tabs | Grouping windows as tabs is a macOS feature. On Windows each window stands alone. |
| Your data | Settings, autosaves and recent projects are in `%APPDATA%\DraftCraft Pro`. |

## Build it yourself

You need Windows with Node.js 24 and Git, and [Inno Setup 6](https://jrsoftware.org/isinfo.php) for the installer.

```powershell
git clone https://github.com/hridyakshgejwal-star/DraftCraft-Pro.git
cd DraftCraft-Pro
copy firebase-applet-config.example.json firebase-applet-config.json   # for Google Drive sync, fill in your own values
npm ci
npm --prefix desktop ci
node verification/run-unit-tests.mjs
node desktop/build.cjs
node desktop/package.mjs win32 x64          # creates ..\desktop-build\packages\DraftCraft Pro-win32-x64
.\desktop\windows\run-self-test.ps1 -Exe "..\desktop-build\packages\DraftCraft Pro-win32-x64\DraftCraft Pro.exe" -Out "$env:TEMP\dc-selftest"
iscc /DSourceDir="$(Resolve-Path '..\desktop-build\packages\DraftCraft Pro-win32-x64')" desktop\windows\DraftCraft-Pro.iss
```
