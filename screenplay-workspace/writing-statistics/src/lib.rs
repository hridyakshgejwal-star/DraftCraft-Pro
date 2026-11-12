//! Writing Statistics: Screen Runtime Estimation (1 page = 1 minute), Words, Characters

use document_core::ScreenplayDocument;
use pagination::Paginator;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptStats {
    pub total_pages: usize,
    pub total_words: usize,
    pub total_characters: usize,
    pub estimated_minutes: f32,
}

pub struct StatisticsEngine;

impl StatisticsEngine {
    pub fn analyze(doc: &ScreenplayDocument) -> ScriptStats {
        let pages = Paginator::paginate(doc);
        let mut words = 0;
        let mut chars = 0;

        for p in &doc.paragraphs {
            let text = p.full_text();
            words += text.split_whitespace().count();
            chars += text.len();
        }

        ScriptStats {
            total_pages: pages.len(),
            total_words: words,
            total_characters: chars,
            estimated_minutes: pages.len() as f32, // 1 page ≈ 1 minute
        }
    }
}
