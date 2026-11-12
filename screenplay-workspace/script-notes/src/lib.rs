//! ScriptNotes: Inline Scene Feedback, Color Flags & Revision Notes

use chrono::Utc;
use document_core::{Paragraph, ScriptNoteItem};
use uuid::Uuid;

pub struct ScriptNoteService;

impl ScriptNoteService {
    pub fn add_note(paragraph: &mut Paragraph, author: &str, text: &str, color_tag: &str) {
        paragraph.notes.push(ScriptNoteItem {
            id: Uuid::new_v4(),
            author: author.to_string(),
            text: text.to_string(),
            color_tag: color_tag.to_string(),
            created_at: Utc::now(),
            resolved: false,
        });
    }

    pub fn resolve_note(paragraph: &mut Paragraph, note_id: Uuid) {
        if let Some(note) = paragraph.notes.iter_mut().find(|n| n.id == note_id) {
            note.resolved = true;
        }
    }
}
