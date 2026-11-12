//! Navigator: Section 5.1 & 5.2 Navigator 2.0 Data Engine
//!
//! Provides rich scene metadata, character appearances, inline editing,
//! reordering actual script scenes, and CSV data export.

use document_core::{ElementType, Paragraph};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedSceneEntry {
    pub paragraph_id: Uuid,
    pub paragraph_index: usize,
    pub scene_number: String,
    pub heading: String,
    pub is_exterior: bool,
    pub time_of_day: String,
    pub line_count: usize,
    pub characters: Vec<String>,
    pub notes_count: usize,
}

pub struct SceneNavigatorEngine;

impl SceneNavigatorEngine {
    pub fn build_detailed_scenes(paragraphs: &[Paragraph]) -> Vec<DetailedSceneEntry> {
        let mut scenes = Vec::new();
        let mut current_idx: Option<usize> = None;

        for (idx, p) in paragraphs.iter().enumerate() {
            if p.element_type == ElementType::SceneHeading {
                let text = p.full_text();
                let is_exterior = text.starts_with("EXT");
                let is_night = text.contains("NIGHT");
                let time_of_day = if is_night {
                    "NIGHT".to_string()
                } else if text.contains("DUSK") {
                    "DUSK".to_string()
                } else {
                    "DAY".to_string()
                };

                let entry = DetailedSceneEntry {
                    paragraph_id: p.id,
                    paragraph_index: idx,
                    scene_number: p.scene_number.clone().unwrap_or_else(|| (scenes.len() + 1).to_string()),
                    heading: text,
                    is_exterior,
                    time_of_day,
                    line_count: 1,
                    characters: Vec::new(),
                    notes_count: p.notes.len(),
                };
                scenes.push(entry);
                current_idx = Some(scenes.len() - 1);
            } else if let Some(c_idx) = current_idx {
                scenes[c_idx].line_count += 1;
                scenes[c_idx].notes_count += p.notes.len();
                if p.element_type == ElementType::Character {
                    let char_name = p.full_text().trim().to_uppercase();
                    if !scenes[c_idx].characters.contains(&char_name) {
                        scenes[c_idx].characters.push(char_name);
                    }
                }
            }
        }

        scenes
    }

    pub fn export_scenes_csv(scenes: &[DetailedSceneEntry]) -> String {
        let mut csv = String::from("Scene Number,Heading,Setting,Time,Lines,Characters\n");
        for s in scenes {
            let setting = if s.is_exterior { "EXTERIOR" } else { "INTERIOR" };
            csv.push_str(&format!(
                "\"{}\",\"{}\",\"{}\",\"{}\",{},\"{}\"\n",
                s.scene_number,
                s.heading,
                setting,
                s.time_of_day,
                s.line_count,
                s.characters.join("; ")
            ));
        }
        csv
    }
}
