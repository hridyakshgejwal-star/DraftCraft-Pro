use crate::types::{ElementType, Paragraph};

pub const LINES_PER_PAGE: usize = 54;
pub const CHARACTERS_PER_LINE_ACTION: usize = 60;
pub const CHARACTERS_PER_LINE_DIALOGUE: usize = 35;
pub const CHARACTERS_PER_LINE_PARENTHETICAL: usize = 28;

#[derive(Debug, Clone)]
pub struct PageBreakItem {
    pub paragraph_index: usize,
    pub page_number: usize,
    pub page_label: String, // e.g. "1", "2", "23A"
}

#[derive(Debug, Clone)]
pub struct ScriptPage {
    pub page_number: usize,
    pub page_label: String,
    pub paragraphs: Vec<Paragraph>,
    pub line_count: usize,
}

pub struct PaginationEngine;

impl PaginationEngine {
    /// Calculate exact page breaks across a screenplay document
    pub fn paginate(paragraphs: &[Paragraph], locked_pages: bool) -> Vec<ScriptPage> {
        let mut pages = Vec::new();
        let mut current_page_paragraphs = Vec::new();
        let mut current_lines = 0;
        let mut page_num = 1;

        for p in paragraphs {
            let lines = Self::estimate_paragraph_lines(p);

            // Orphan heading check: don't put a SceneHeading on the very bottom line of a page
            let is_heading = p.element_type == ElementType::SceneHeading;
            let will_orphan = is_heading && (current_lines + lines + 2 > LINES_PER_PAGE);

            if current_lines + lines > LINES_PER_PAGE || will_orphan {
                if !current_page_paragraphs.is_empty() {
                    pages.push(ScriptPage {
                        page_number: page_num,
                        page_label: if locked_pages { format!("{}", page_num) } else { page_num.to_string() },
                        paragraphs: current_page_paragraphs,
                        line_count: current_lines,
                    });
                    page_num += 1;
                    current_page_paragraphs = Vec::new();
                    current_lines = 0;
                }
            }

            current_page_paragraphs.push(p.clone());
            current_lines += lines;
        }

        if !current_page_paragraphs.is_empty() {
            pages.push(ScriptPage {
                page_number: page_num,
                page_label: page_num.to_string(),
                paragraphs: current_page_paragraphs,
                line_count: current_lines,
            });
        }

        pages
    }

    /// Estimate vertical printed lines consumed by an element in Courier 12pt
    pub fn estimate_paragraph_lines(p: &Paragraph) -> usize {
        let text_len = p.text.len();
        let chars_per_line = match p.element_type {
            ElementType::Action | ElementType::General => CHARACTERS_PER_LINE_ACTION,
            ElementType::Dialogue | ElementType::DualDialogue => CHARACTERS_PER_LINE_DIALOGUE,
            ElementType::Parenthetical => CHARACTERS_PER_LINE_PARENTHETICAL,
            ElementType::Character => 35,
            ElementType::SceneHeading => CHARACTERS_PER_LINE_ACTION,
            ElementType::Transition => 20,
            ElementType::Shot => CHARACTERS_PER_LINE_ACTION,
            _ => 50,
        };

        let raw_lines = if text_len == 0 {
            1
        } else {
            (text_len + chars_per_line - 1) / chars_per_line
        };

        // Leading spacing before element
        let leading_blank_lines = match p.element_type {
            ElementType::SceneHeading => 2,
            ElementType::Character => 1,
            ElementType::Action => 1,
            ElementType::Transition => 1,
            ElementType::Parenthetical => 0,
            ElementType::Dialogue => 0,
            _ => 1,
        };

        raw_lines + leading_blank_lines
    }
}
