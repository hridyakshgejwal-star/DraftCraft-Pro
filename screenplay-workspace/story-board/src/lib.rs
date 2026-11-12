//! StoryBoard & Beat Board Engine: Section 4.1 Unbounded Visual Brainstorming Canvas
//!
//! Provides free-form card dragging, SVG Flow Lines (plain, forward, reverse, double-ended),
//! grid snapping, multi-selection alignment (row, column, cascade), and document synchronization.

use document_core::StoryBeat;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FlowLineStyle {
    Plain,
    ForwardArrow,
    ReverseArrow,
    DoubleArrow,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowLine {
    pub id: Uuid,
    pub from_id: Uuid,
    pub to_id: Uuid,
    pub style: FlowLineStyle,
    pub color_hex: String,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanvasBeatItem {
    pub beat: StoryBeat,
    pub pos_x: f32,
    pub pos_y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BeatBoardCanvas {
    pub items: Vec<CanvasBeatItem>,
    pub flow_lines: Vec<FlowLine>,
    pub zoom_level: f32,
    pub snap_to_grid: bool,
    pub grid_size_px: f32,
}

pub struct BeatBoardManager;

impl BeatBoardManager {
    pub fn align_selected_to_row(items: &mut [CanvasBeatItem], selected_ids: &[Uuid]) {
        let selected: Vec<&CanvasBeatItem> = items.iter().filter(|i| selected_ids.contains(&i.beat.id)).collect();
        if selected.is_empty() {
            return;
        }
        let avg_y = selected.iter().map(|i| i.pos_y).sum::<f32>() / selected.len() as f32;
        for item in items.iter_mut() {
            if selected_ids.contains(&item.beat.id) {
                item.pos_y = avg_y;
            }
        }
    }

    pub fn align_selected_to_column(items: &mut [CanvasBeatItem], selected_ids: &[Uuid]) {
        let selected: Vec<&CanvasBeatItem> = items.iter().filter(|i| selected_ids.contains(&i.beat.id)).collect();
        if selected.is_empty() {
            return;
        }
        let avg_x = selected.iter().map(|i| i.pos_x).sum::<f32>() / selected.len() as f32;
        for item in items.iter_mut() {
            if selected_ids.contains(&item.beat.id) {
                item.pos_x = avg_x;
            }
        }
    }

    pub fn cascade_selected(items: &mut [CanvasBeatItem], selected_ids: &[Uuid], mut start_x: f32, mut start_y: f32) {
        for item in items.iter_mut() {
            if selected_ids.contains(&item.beat.id) {
                item.pos_x = start_x;
                item.pos_y = start_y;
                start_x += 120.0;
                start_y += 70.0;
            }
        }
    }
}
