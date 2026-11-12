//! Screenplay Formatting: Hollywood Indentation, Margins, and Element Transitions
//!
//! Enforces precise Final Draft 13 rules for Courier 12pt tabs, line wraps,
//! and element navigation transitions.

use document_core::ElementType;

#[derive(Debug, Clone, Copy)]
pub struct ElementMetric {
    pub left_indent_inches: f32,
    pub width_inches: f32,
    pub max_chars_per_line: usize,
    pub space_before_lines: usize,
    pub space_after_lines: usize,
    pub uppercase: bool,
}

pub struct FormatRules;

impl FormatRules {
    pub fn metrics_for(element_type: ElementType) -> ElementMetric {
        match element_type {
            ElementType::SceneHeading => ElementMetric {
                left_indent_inches: 0.0,
                width_inches: 6.0,
                max_chars_per_line: 60,
                space_before_lines: 2,
                space_after_lines: 1,
                uppercase: true,
            },
            ElementType::Action | ElementType::General => ElementMetric {
                left_indent_inches: 0.0,
                width_inches: 6.0,
                max_chars_per_line: 60,
                space_before_lines: 1,
                space_after_lines: 1,
                uppercase: false,
            },
            ElementType::Character => ElementMetric {
                left_indent_inches: 2.2, // ~3.7 in from physical left page edge
                width_inches: 3.8,
                max_chars_per_line: 38,
                space_before_lines: 1,
                space_after_lines: 0,
                uppercase: true,
            },
            ElementType::Parenthetical => ElementMetric {
                left_indent_inches: 1.6, // ~3.1 in from physical left page edge
                width_inches: 3.0,
                max_chars_per_line: 30,
                space_before_lines: 0,
                space_after_lines: 0,
                uppercase: false,
            },
            ElementType::Dialogue => ElementMetric {
                left_indent_inches: 1.0, // ~2.5 in from physical left page edge
                width_inches: 3.8,
                max_chars_per_line: 38,
                space_before_lines: 0,
                space_after_lines: 1,
                uppercase: false,
            },
            ElementType::DualDialogue => ElementMetric {
                left_indent_inches: 0.5,
                width_inches: 2.8,
                max_chars_per_line: 28,
                space_before_lines: 0,
                space_after_lines: 1,
                uppercase: false,
            },
            ElementType::Transition => ElementMetric {
                left_indent_inches: 4.0, // right aligned
                width_inches: 2.0,
                max_chars_per_line: 20,
                space_before_lines: 1,
                space_after_lines: 1,
                uppercase: true,
            },
            ElementType::Shot => ElementMetric {
                left_indent_inches: 0.0,
                width_inches: 6.0,
                max_chars_per_line: 60,
                space_before_lines: 1,
                space_after_lines: 1,
                uppercase: true,
            },
            ElementType::ScriptNote | ElementType::CastList => ElementMetric {
                left_indent_inches: 0.0,
                width_inches: 6.0,
                max_chars_per_line: 60,
                space_before_lines: 1,
                space_after_lines: 1,
                uppercase: false,
            },
            ElementType::NewAct => ElementMetric {
                left_indent_inches: 0.0,
                width_inches: 6.0,
                max_chars_per_line: 60,
                space_before_lines: 3,
                space_after_lines: 2,
                uppercase: true,
            },
            ElementType::EndOfAct => ElementMetric {
                left_indent_inches: 0.0,
                width_inches: 6.0,
                max_chars_per_line: 60,
                space_before_lines: 2,
                space_after_lines: 2,
                uppercase: true,
            },
            ElementType::SceneSummary | ElementType::OutlineLevel1 | ElementType::OutlineLevel2 | ElementType::UserDefined => ElementMetric {
                left_indent_inches: 0.0,
                width_inches: 6.0,
                max_chars_per_line: 60,
                space_before_lines: 1,
                space_after_lines: 1,
                uppercase: false,
            },
        }
    }

    /// Predict next element type on Enter press (Final Draft behavior)
    pub fn next_on_enter(current: ElementType) -> ElementType {
        match current {
            ElementType::SceneHeading => ElementType::Action,
            ElementType::Action => ElementType::Action,
            ElementType::Character => ElementType::Dialogue,
            ElementType::Parenthetical => ElementType::Dialogue,
            ElementType::Dialogue => ElementType::Character,
            ElementType::DualDialogue => ElementType::Action,
            ElementType::Transition => ElementType::SceneHeading,
            ElementType::Shot => ElementType::Action,
            ElementType::NewAct => ElementType::SceneHeading,
            ElementType::EndOfAct => ElementType::NewAct,
            _ => ElementType::Action,
        }
    }

    /// Predict next element type on Tab press (Final Draft element cycle)
    pub fn next_on_tab(current: ElementType) -> ElementType {
        match current {
            ElementType::Action => ElementType::Character,
            ElementType::Character => ElementType::Transition,
            ElementType::Dialogue => ElementType::Parenthetical,
            ElementType::Parenthetical => ElementType::Dialogue,
            ElementType::Transition => ElementType::SceneHeading,
            ElementType::SceneHeading => ElementType::Action,
            _ => ElementType::Action,
        }
    }
}
