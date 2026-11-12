//! Screenplay Editor: Custom Rich Editor Widget with Virtualized Viewport

use document_core::{ElementType, Paragraph, ScreenplayDocument};
use screenplay_formatting::FormatRules;

#[derive(Debug, Clone, Copy)]
pub struct TextCursor {
    pub paragraph_index: usize,
    pub char_offset: usize,
}

pub struct ScreenplayEditorWidget;

impl ScreenplayEditorWidget {
    pub fn handle_enter_key(doc: &mut ScreenplayDocument, cursor: &mut TextCursor) {
        if cursor.paragraph_index < doc.paragraphs.len() {
            let current_type = doc.paragraphs[cursor.paragraph_index].element_type;
            let next_type = FormatRules::next_on_enter(current_type);
            let new_p = Paragraph::new(next_type, "");
            doc.paragraphs.insert(cursor.paragraph_index + 1, new_p);
            cursor.paragraph_index += 1;
            cursor.char_offset = 0;
        }
    }

    pub fn handle_tab_key(doc: &mut ScreenplayDocument, cursor: &TextCursor) {
        if cursor.paragraph_index < doc.paragraphs.len() {
            let current_type = doc.paragraphs[cursor.paragraph_index].element_type;
            let next_type = FormatRules::next_on_tab(current_type);
            doc.paragraphs[cursor.paragraph_index].element_type = next_type;
        }
    }
}
