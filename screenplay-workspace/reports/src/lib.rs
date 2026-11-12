//! Production Reports: Scene Breakdown, Cast List, Location Distribution

use document_core::Paragraph;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductionReportBundle {
    pub total_scenes: usize,
    pub interior_count: usize,
    pub exterior_count: usize,
    pub day_count: usize,
    pub night_count: usize,
    pub unique_locations: Vec<String>,
}

pub struct ReportGenerator;

impl ReportGenerator {
    pub fn generate_breakdown(paragraphs: &[Paragraph]) -> ProductionReportBundle {
        let mut int_count = 0;
        let mut ext_count = 0;
        let mut day_count = 0;
        let mut night_count = 0;
        let mut locations = HashMap::new();
        let mut total_scenes = 0;

        for p in paragraphs {
            if p.element_type == document_core::ElementType::SceneHeading {
                total_scenes += 1;
                let text = p.full_text();
                if text.starts_with("INT") {
                    int_count += 1;
                }
                if text.starts_with("EXT") {
                    ext_count += 1;
                }
                if text.contains("DAY") {
                    day_count += 1;
                }
                if text.contains("NIGHT") {
                    night_count += 1;
                }

                let loc = text
                    .replace("INT.", "")
                    .replace("EXT.", "")
                    .replace("INT/EXT.", "")
                    .split('-')
                    .next()
                    .unwrap_or("")
                    .trim()
                    .to_string();

                if !loc.is_empty() {
                    *locations.entry(loc).or_insert(0) += 1;
                }
            }
        }

        ProductionReportBundle {
            total_scenes,
            interior_count: int_count,
            exterior_count: ext_count,
            day_count,
            night_count,
            unique_locations: locations.into_keys().collect(),
        }
    }
}
