# DraftCraft Pro — UI-refined source

UI presentation and animation were refined across the existing application. In that initial UI phase, the document logic, file-format modules, storage, services, Rust code, dependencies, and build configuration were preserved.

That UI phase passed the production build and all 44 browser checks, while retaining five existing TypeScript diagnostics.

The subsequent desktop version 1.4.1 adds a self-contained macOS Apple Silicon app, native menus and window controls, offline fonts, persistent app storage, and optional AI settings. It also fixes title-page saving and the disconnected Google Drive component's type errors. The current source passes TypeScript checking and all 18 desktop checks. See [desktop/README.md](desktop/README.md) for desktop build details and the unverified macOS behavior.

See [UI-refinement/Validation.md](UI-refinement/Validation.md) for changes, usage, screenshots, verification evidence, and the existing blockers.
