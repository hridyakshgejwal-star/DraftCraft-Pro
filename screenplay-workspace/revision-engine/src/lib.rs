//! Revision Engine: Hollywood Colored Revision Sets & Margin Asterisks
//!
//! Enforces production draft hierarchy: White, Blue, Pink, Yellow, Green,
//! Goldenrod, Buff, Salmon, Cherry, 2nd Blue with strict change tracking.

use document_core::Paragraph;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RevisionColor {
    White,       // Initial Draft
    Blue,        // 1st Revision
    Pink,        // 2nd Revision
    Yellow,      // 3rd Revision
    Green,       // 4th Revision
    Goldenrod,   // 5th Revision
    Buff,        // 6th Revision
    Salmon,      // 7th Revision
    Cherry,      // 8th Revision
    SecondBlue,  // 9th Revision
}

impl RevisionColor {
    pub fn name(&self) -> &'static str {
        match self {
            RevisionColor::White => "White (Production Draft)",
            RevisionColor::Blue => "Blue (1st Revision)",
            RevisionColor::Pink => "Pink (2nd Revision)",
            RevisionColor::Yellow => "Yellow (3rd Revision)",
            RevisionColor::Green => "Green (4th Revision)",
            RevisionColor::Goldenrod => "Goldenrod (5th Revision)",
            RevisionColor::Buff => "Buff (6th Revision)",
            RevisionColor::Salmon => "Salmon (7th Revision)",
            RevisionColor::Cherry => "Cherry (8th Revision)",
            RevisionColor::SecondBlue => "Second Blue (9th Revision)",
        }
    }

    pub fn hex(&self) -> &'static str {
        match self {
            RevisionColor::White => "#ffffff",
            RevisionColor::Blue => "#60a5fa",
            RevisionColor::Pink => "#f472b6",
            RevisionColor::Yellow => "#facc15",
            RevisionColor::Green => "#4ade80",
            RevisionColor::Goldenrod => "#fbbf24",
            RevisionColor::Buff => "#fb923c",
            RevisionColor::Salmon => "#fb7185",
            RevisionColor::Cherry => "#f87171",
            RevisionColor::SecondBlue => "#38bdf8",
        }
    }
}

pub struct RevisionTracker;

impl RevisionTracker {
    /// Mark paragraph as revised in active revision set
    pub fn mark_revised(paragraph: &mut Paragraph, active_rev: RevisionColor) {
        paragraph.revised = true;
        paragraph.revision_id = Some(active_rev.name().to_string());
    }

    /// Clear revision asterisks when rolling to new production set
    pub fn clear_revision_marks(paragraphs: &mut [Paragraph]) {
        for p in paragraphs {
            p.revised = false;
        }
    }
}
