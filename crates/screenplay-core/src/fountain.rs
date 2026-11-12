use crate::types::{Document, ElementType, Paragraph};

pub struct FountainCodec;

impl FountainCodec {
    pub fn to_fountain(doc: &Document) -> String {
        let mut out = String::new();
        out.push_str(&format!("Title: {}\n", doc.title_page.title));
        out.push_str(&format!("Credit: {}\n", doc.title_page.author));
        out.push_str(&format!("Draft date: {}\n\n", doc.title_page.draft_date));

        for p in &doc.paragraphs {
            match p.element_type {
                ElementType::SceneHeading => {
                    out.push_str(&format!("\n{}\n\n", p.text.to_uppercase()));
                }
                ElementType::Action => {
                    out.push_str(&format!("{}\n\n", p.text));
                }
                ElementType::Character => {
                    out.push_str(&format!("{}\n", p.text.to_uppercase()));
                }
                ElementType::Parenthetical => {
                    let text = if p.text.starts_with('(') && p.text.ends_with(')') {
                        p.text.clone()
                    } else {
                        format!("({})", p.text)
                    };
                    out.push_str(&format!("{}\n", text));
                }
                ElementType::Dialogue => {
                    out.push_str(&format!("{}\n\n", p.text));
                }
                ElementType::Transition => {
                    out.push_str(&format!("> {}\n\n", p.text.to_uppercase()));
                }
                _ => {
                    out.push_str(&format!("{}\n\n", p.text));
                }
            }

            for note in &p.notes {
                let name = note.name.as_deref().unwrap_or("Note");
                out.push_str(&format!("[[ {}: {}: {} ]]\n\n", name, note.author, note.text));
            }

            if let Some(ref bm) = p.bookmark {
                out.push_str(&format!("[[ Bookmark: {} ]]\n\n", bm.name));
            }

            if let Some(ref sc) = p.scene_comment {
                out.push_str(&format!("[[ SceneComment: {} ]]\n\n", sc));
            }
        }

        out
    }

    pub fn parse_fountain(raw: &str) -> Document {
        let mut doc = Document::default();
        let lines: Vec<&str> = raw.lines().collect();

        let mut i = 0;
        while i < lines.len() {
            let line = lines[i].trim();
            if line.is_empty() {
                i += 1;
                continue;
            }

            if line.starts_with("INT.") || line.starts_with("EXT.") || line.starts_with("INT/EXT.") || line.starts_with('.') {
                doc.paragraphs.push(Paragraph::new(ElementType::SceneHeading, line));
            } else if line.chars().all(|c| c.is_uppercase() || c.is_whitespace() || c == '(' || c == ')') && !line.ends_with('.') && line.len() < 35 {
                // Character name
                doc.paragraphs.push(Paragraph::new(ElementType::Character, line));
            } else if line.starts_with('(') && line.ends_with(')') {
                doc.paragraphs.push(Paragraph::new(ElementType::Parenthetical, line));
            } else if line.starts_with('>') && line.ends_with('<') {
                doc.paragraphs.push(Paragraph::new(ElementType::Transition, line.trim_matches('>').trim_matches('<').trim()));
            } else {
                doc.paragraphs.push(Paragraph::new(ElementType::Action, line));
            }

            i += 1;
        }

        doc
    }
}
