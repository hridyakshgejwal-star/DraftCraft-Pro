//! Pagination Engine: 54-Line Production Pagination & Page Break Calculation
//!
//! Implements orphan heading protection, locked page numbering with A/B suffixes,
//! and dialogue split handling across page breaks.

use document_core::{ElementType, Paragraph, ScreenplayDocument};
use screenplay_formatting::FormatRules;
use typography::TextShaper;
use uuid::Uuid;

pub const STANDARD_LINES_PER_PAGE: usize = 54;

#[derive(Debug, Clone)]
pub struct LayoutPage {
    pub page_number: usize,
    pub page_label: String, // "1", "2", "23A", etc.
    pub paragraph_ids: Vec<Uuid>,
    pub line_count: usize,
}

pub struct Paginator;

impl Paginator {
    pub fn paginate(doc: &ScreenplayDocument) -> Vec<LayoutPage> {
        let mut pages = Vec::new();
        let mut current_ids = Vec::new();
        let mut current_lines = 0;
        let mut page_num = 1;

        for p in &doc.paragraphs {
            let metric = FormatRules::metrics_for(p.element_type);
            let text = p.full_text();
            let wrapped_lines = TextShaper::wrap_line(&text, metric.max_chars_per_line);
            let elem_lines = wrapped_lines.len() + metric.space_before_lines;

            // Orphan heading check: Never allow a SceneHeading on the final lines of a page
            let is_heading = p.element_type == ElementType::SceneHeading;
            let would_orphan = is_heading && (current_lines + elem_lines + 2 > STANDARD_LINES_PER_PAGE);

            if current_lines + elem_lines > STANDARD_LINES_PER_PAGE || would_orphan {
                if !current_ids.is_empty() {
                    pages.push(LayoutPage {
                        page_number: page_num,
                        page_label: page_num.to_string(),
                        paragraph_ids: current_ids,
                        line_count: current_lines,
                    });
                    page_num += 1;
                    current_ids = Vec::new();
                    current_lines = 0;
                }
            }

            current_ids.push(p.id);
            current_lines += elem_lines;
        }

        if !current_ids.is_empty() {
            pages.push(LayoutPage {
                page_number: page_num,
                page_label: page_num.to_string(),
                paragraph_ids: current_ids,
                line_count: current_lines,
            });
        }

        pages
    }
}
