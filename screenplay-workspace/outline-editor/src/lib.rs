//! Outline Editor: Section 4.2 Multi-Lane Horizontal Timeline & Structure Engine
//!
//! Provides act lanes, sequence lanes, scene lanes, custom tracks, page-length goals,
//! and bidirectional transfer between outline markers and screenplay script elements.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LaneType {
    Act,
    Sequence,
    Scene,
    Character,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutlineLane {
    pub id: Uuid,
    pub name: String,
    pub lane_type: LaneType,
    pub color_hex: String,
    pub height_px: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineMarker {
    pub id: Uuid,
    pub lane_id: Uuid,
    pub title: String,
    pub description: String,
    pub start_page: f32,
    pub end_page: f32,
    pub color_hex: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutlineTimeline {
    pub lanes: Vec<OutlineLane>,
    pub markers: Vec<TimelineMarker>,
    pub target_screenplay_length_pages: f32,
    pub current_page_indicator: f32,
    pub show_structure_lines: bool,
}

impl Default for OutlineTimeline {
    fn default() -> Self {
        Self {
            lanes: vec![
                OutlineLane {
                    id: Uuid::new_v4(),
                    name: "Acts Lane".into(),
                    lane_type: LaneType::Act,
                    color_hex: "#60a5fa".into(),
                    height_px: 80.0,
                },
                OutlineLane {
                    id: Uuid::new_v4(),
                    name: "Major Sequences".into(),
                    lane_type: LaneType::Sequence,
                    color_hex: "#f472b6".into(),
                    height_px: 80.0,
                },
            ],
            markers: Vec::new(),
            target_screenplay_length_pages: 110.0,
            current_page_indicator: 1.0,
            show_structure_lines: true,
        }
    }
}
