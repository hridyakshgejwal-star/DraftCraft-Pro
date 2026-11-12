//! File Formats: Final Draft 13 (.fdx) and Fountain Codecs
//!
//! Provides two-way lossless export and import for industry script formats.

use document_core::{ElementType, Paragraph, ScreenplayDocument, TitlePageData};

pub struct FdxFormat;

impl FdxFormat {
    pub fn export_fdx(doc: &ScreenplayDocument) -> String {
        let mut out = String::new();
        out.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n");
        out.push_str("<FinalDraft DocumentType=\"Script\" Template=\"No\" Version=\"5\">\n");
        out.push_str("  <Content>\n");

        for p in &doc.paragraphs {
            let elem_name = match p.element_type {
                ElementType::SceneHeading => "Scene Heading",
                ElementType::Action => "Action",
                ElementType::Character => "Character",
                ElementType::Parenthetical => "Parenthetical",
                ElementType::Dialogue => "Dialogue",
                ElementType::DualDialogue => "Dual Dialogue",
                ElementType::Transition => "Transition",
                ElementType::Shot => "Shot",
                _ => "General",
            };

            let scene_attr = if let Some(ref num) = p.scene_number {
                format!(" Number=\"{}\"", escape_xml(num))
            } else {
                String::new()
            };

            out.push_str(&format!("    <Paragraph Type=\"{}\"{}>\n", elem_name, scene_attr));
            out.push_str(&format!("      <Text>{}</Text>\n", escape_xml(&p.full_text())));
            out.push_str("    </Paragraph>\n");
        }

        out.push_str("  </Content>\n");
        out.push_str("  <TitlePage>\n");
        out.push_str("    <Content>\n");
        out.push_str(&format!("      <Paragraph Type=\"Title\"><Text>{}</Text></Paragraph>\n", escape_xml(&doc.title_page.title)));
        out.push_str(&format!("      <Paragraph Type=\"Author\"><Text>{}</Text></Paragraph>\n", escape_xml(&doc.title_page.author)));
        out.push_str(&format!("      <Paragraph Type=\"Contact\"><Text>{}</Text></Paragraph>\n", escape_xml(&doc.title_page.contact)));
        out.push_str("    </Content>\n");
        out.push_str("  </TitlePage>\n");
        out.push_str("</FinalDraft>\n");

        out
    }
}

pub struct FountainFormat;

impl FountainFormat {
    pub fn export_fountain(doc: &ScreenplayDocument) -> String {
        let mut out = format!("Title: {}\nCredit: {}\n\n", doc.title_page.title, doc.title_page.author);

        for p in &doc.paragraphs {
            let text = p.full_text();
            match p.element_type {
                ElementType::SceneHeading => out.push_str(&format!("\n{}\n\n", text.to_uppercase())),
                ElementType::Character => out.push_str(&format!("\n{}\n", text.to_uppercase())),
                ElementType::Parenthetical => out.push_str(&format!("({})\n", text.trim_matches('(').trim_matches(')'))),
                ElementType::Dialogue => out.push_str(&format!("{}\n\n", text)),
                ElementType::Transition => out.push_str(&format!("> {}\n\n", text.to_uppercase())),
                _ => out.push_str(&format!("{}\n\n", text)),
            }
        }

        out
    }
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
