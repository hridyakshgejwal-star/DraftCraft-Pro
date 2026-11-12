; DraftCraft Pro — Windows installer (Inno Setup 6).
; Built by .github/workflows/windows.yml:
;   iscc /DAppVersion=1.18.0 /DSourceDir=<packaged app folder> /DOutputDir=<folder> desktop\windows\DraftCraft-Pro.iss
; It installs for the current user without administrator rights by default (the setup can be run for all users),
; adds Start menu and optional desktop shortcuts, and lets DraftCraft Pro open .draftcraft files and appear under
; "Open with" for Final Draft (.fdx) and Fountain (.fountain) scripts. Your projects and settings
; (%APPDATA%\DraftCraft Pro) are not touched by installing, updating or uninstalling.

#ifndef AppVersion
  #define AppVersion "1.18.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\..\..\desktop-build\packages\DraftCraft Pro-win32-x64"
#endif
#ifndef OutputDir
  #define OutputDir "..\..\..\desktop-build\installer"
#endif
#define AppName "DraftCraft Pro"
#define AppExe "DraftCraft Pro.exe"

[Setup]
AppId={{6F1B7C2E-5D4A-4C1B-9E2A-D7C3F0A8B154}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=DraftCraft Pro
AppPublisherURL=https://github.com/hridyakshgejwal-star/DraftCraft-Pro
AppSupportURL=https://github.com/hridyakshgejwal-star/DraftCraft-Pro/issues
AppUpdatesURL=https://github.com/hridyakshgejwal-star/DraftCraft-Pro/releases
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputDir}
OutputBaseFilename=DraftCraft-Pro-{#AppVersion}-x64-Setup
SetupIconFile=..\icon.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName} {#AppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ChangesAssociations=yes
CloseApplications=yes
LicenseFile=..\..\LICENSE

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\{#AppExe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; Tasks: desktopicon

[Registry]
; DraftCraft projects open in DraftCraft Pro.
Root: HKA; Subkey: "Software\Classes\.draftcraft"; ValueType: string; ValueName: ""; ValueData: "DraftCraftPro.Project"; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.draftcraft\OpenWithProgids"; ValueType: string; ValueName: "DraftCraftPro.Project"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\DraftCraftPro.Project"; ValueType: string; ValueName: ""; ValueData: "DraftCraft Project"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\DraftCraftPro.Project\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#AppExe},0"
Root: HKA; Subkey: "Software\Classes\DraftCraftPro.Project\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"" ""%1"""
; Final Draft and Fountain scripts: listed under "Open with" (an existing default app is kept).
Root: HKA; Subkey: "Software\Classes\.fdx\OpenWithProgids"; ValueType: string; ValueName: "DraftCraftPro.Script"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.fountain\OpenWithProgids"; ValueType: string; ValueName: "DraftCraftPro.Script"; ValueData: ""; Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\DraftCraftPro.Script"; ValueType: string; ValueName: ""; ValueData: "Screenplay"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\DraftCraftPro.Script\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#AppExe},0"
Root: HKA; Subkey: "Software\Classes\DraftCraftPro.Script\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExe}"" ""%1"""
Root: HKA; Subkey: "Software\Classes\Applications\{#AppExe}\SupportedTypes"; ValueType: string; ValueName: ".draftcraft"; ValueData: ""; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\{#AppExe}\SupportedTypes"; ValueType: string; ValueName: ".fdx"; ValueData: ""
Root: HKA; Subkey: "Software\Classes\Applications\{#AppExe}\SupportedTypes"; ValueType: string; ValueName: ".fountain"; ValueData: ""

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent
