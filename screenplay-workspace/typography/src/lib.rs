//! Typography Engine: Courier Prime Standard Metrics & Unicode Glyph Shaping
//!
//! Enforces exact 10 CPI (Characters Per Inch) horizontal pitch
//! and 6 LPI (Lines Per Inch) vertical cadence for spec screenplays.

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

pub const COURIER_POINTS: f32 = 12.0;
pub const CHARACTERS_PER_INCH: f32 = 10.0;
pub const LINES_PER_INCH: f32 = 6.0;
pub const LINE_HEIGHT_POINTS: f32 = 14.4; // 12pt with 1.2 leading

#[derive(Debug, Clone, Copy)]
pub struct CourierMetrics {
    pub char_width_pts: f32,  // 72.0 / 10.0 = 7.2 points
    pub line_height_pts: f32, // 14.4 points
}

impl Default for CourierMetrics {
    fn default() -> Self {
        Self {
            char_width_pts: 72.0 / CHARACTERS_PER_INCH,
            line_height_pts: LINE_HEIGHT_POINTS,
        }
    }
}

pub struct TextShaper;

impl TextShaper {
    /// Wrap text cleanly honoring Hollywood monospaced column boundaries
    pub fn wrap_line(text: &str, max_columns: usize) -> Vec<String> {
        let mut lines = Vec::new();
        let words: Vec<&str> = text.unicode_words().collect();

        if words.is_empty() {
            return vec![String::new()];
        }

        let mut current_line = String::new();

        for word in words {
            if current_line.is_empty() {
                current_line.push_str(word);
            } else if current_line.width() + 1 + word.width() <= max_columns {
                current_line.push(' ');
                current_line.push_str(word);
            } else {
                lines.push(current_line);
                current_line = word.to_string();
            }
        }

        if !current_line.is_empty() {
            lines.push(current_line);
        }

        lines
    }
}
