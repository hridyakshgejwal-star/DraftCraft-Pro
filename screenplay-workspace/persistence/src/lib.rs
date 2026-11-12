//! Persistence: SQLite Storage with WAL Mode & Auto-Save History

use document_core::ScreenplayDocument;
use rusqlite::{params, Connection, Result};
use std::path::Path;

pub struct DocumentStore {
    conn: Connection,
}

impl DocumentStore {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;

        // Configure SQLite for high-performance zero-lag ACID persistence
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;

             CREATE TABLE IF NOT EXISTS scripts (
                 id TEXT PRIMARY KEY,
                 title TEXT NOT NULL,
                 document_json TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );

             CREATE TABLE IF NOT EXISTS snapshots (
                 id TEXT PRIMARY KEY,
                 script_id TEXT NOT NULL,
                 revision_id TEXT NOT NULL,
                 snapshot_json TEXT NOT NULL,
                 created_at TEXT NOT NULL
             );",
        )?;

        Ok(Self { conn })
    }

    pub fn save_document(&self, doc: &ScreenplayDocument) -> Result<()> {
        let json = serde_json::to_string(doc).unwrap_or_default();
        let now = chrono::Utc::now().to_rfc3339();

        self.conn.execute(
            "INSERT OR REPLACE INTO scripts (id, title, document_json, updated_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![doc.id.to_string(), doc.title_page.title, json, now],
        )?;

        Ok(())
    }
}
