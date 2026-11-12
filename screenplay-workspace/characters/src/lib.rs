//! Characters Engine: Character Registry, Dialogue Statistics & Arc Tracking

use document_core::{ElementType, Paragraph};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterProfile {
    pub id: Uuid,
    pub name: String,
    pub role: String,
    pub total_speaking_lines: usize,
    pub dialogue_percentage: f32,
    pub voice_preset: String,
}

pub struct CharacterAnalytics;

impl CharacterAnalytics {
    pub fn calculate_profiles(paragraphs: &[Paragraph]) -> Vec<CharacterProfile> {
        let mut counts: HashMap<String, usize> = HashMap::new();
        let mut total_dialogue = 0;

        for p in paragraphs {
            if p.element_type == ElementType::Character {
                let name = p.full_text().trim().to_uppercase();
                *counts.entry(name).or_insert(0) += 1;
                total_dialogue += 1;
            }
        }

        counts
            .into_iter()
            .map(|(name, count)| CharacterProfile {
                id: Uuid::new_v4(),
                name,
                role: "Lead / Supporting".into(),
                total_speaking_lines: count,
                dialogue_percentage: if total_dialogue > 0 {
                    (count as f32 / total_dialogue as f32) * 100.0
                } else {
                    0.0
                },
                voice_preset: "Kore".into(),
            })
            .collect()
    }
}
