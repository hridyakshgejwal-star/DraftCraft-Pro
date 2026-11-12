use crate::types::{Document, ElementType, Paragraph, TitlePage};

/// Final Draft 13 XML (.fdx) Serializer & Parser
pub struct FdxCodec;

impl FdxCodec {
    /// Export Document to Final Draft 13 XML format
    pub fn to_fdx(doc: &Document) -> String {
        let mut out = String::with_capacity(16 * 1024);
        out.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\" ?>\n");
        out.push_str("<FinalDraft DocumentType=\"Script\" Template=\"No\" Version=\"5\">\n");
        out.push_str("  <Content>\n");

        for p in &doc.paragraphs {
            let fdx_type = match p.element_type {
                ElementType::SceneHeading => "Scene Heading",
                ElementType::Action => "Action",
                ElementType::Character => "Character",
                ElementType::Parenthetical => "Parenthetical",
                ElementType::Dialogue => "Dialogue",
                ElementType::DualDialogue => "Dual Dialogue",
                ElementType::Transition => "Transition",
                ElementType::Shot => "Shot",
                ElementType::General => "General",
                ElementType::ScriptNote => "ScriptNote",
                ElementType::CastList => "Cast List",
            };

            let scene_attr = if let Some(ref num) = p.scene_number {
                format!(" Number=\"{}\"", escape_xml(num))
            } else {
                String::new()
            };

            out.push_str(&format!("    <Paragraph Type=\"{}\"{}>\n", fdx_type, scene_attr));
            out.push_str(&format!("      <Text>{}</Text>\n", escape_xml(&p.text)));

            for note in &p.notes {
                let note_name = note.name.as_deref().unwrap_or("");
                let note_cat = note.category.as_deref().unwrap_or("general");
                out.push_str(&format!(
                    "      <ScriptNote Name=\"{}\" Author=\"{}\" Color=\"{}\" Category=\"{}\">\n        <Paragraph><Text>{}</Text></Paragraph>\n      </ScriptNote>\n",
                    escape_xml(note_name),
                    escape_xml(&note.author),
                    escape_xml(&note.color),
                    escape_xml(note_cat),
                    escape_xml(&note.text)
                ));
            }

            if let Some(ref bm) = p.bookmark {
                out.push_str(&format!(
                    "      <Bookmark Name=\"{}\" Color=\"{}\" />\n",
                    escape_xml(&bm.name),
                    escape_xml(&bm.color)
                ));
            }

            if let Some(ref sc) = p.scene_comment {
                out.push_str(&format!(
                    "      <SceneComment Text=\"{}\" />\n",
                    escape_xml(sc)
                ));
            }

            out.push_str("    </Paragraph>\n");
        }

        out.push_str("  </Content>\n");
        out.push_str("  <TitlePage>\n");
        out.push_str("    <Content>\n");
        out.push_str(&format!("      <Paragraph Type=\"Title\"><Text>{}</Text></Paragraph>\n", escape_xml(&doc.title_page.title)));
        out.push_str(&format!("      <Paragraph Type=\"Author\"><Text>{}</Text></Paragraph>\n", escape_xml(&doc.title_page.author)));
        if !doc.title_page.based_on.is_empty() {
            out.push_str(&format!("      <Paragraph Type=\"Based On\"><Text>{}</Text></Paragraph>\n", escape_xml(&doc.title_page.based_on)));
        }
        out.push_str(&format!("      <Paragraph Type=\"Contact\"><Text>{}</Text></Paragraph>\n", escape_xml(&doc.title_page.contact)));
        out.push_str("    </Content>\n");
        out.push_str("  </TitlePage>\n");
        out.push_str("</FinalDraft>\n");

        out
    }

    /// Import and parse a Final Draft 13 XML (.fdx) file content
    pub fn parse_fdx(xml_content: &str) -> Result<Document, String> {
        let mut doc = Document::default();

        // Extract Title from TitlePage if present
        if let Some(start) = xml_content.find("<Paragraph Type=\"Title\">") {
            if let Some(text_start) = xml_content[start..].find("<Text>") {
                let s = start + text_start + 6;
                if let Some(end) = xml_content[s..].find("</Text>") {
                    doc.title_page.title = unescape_xml(&xml_content[s..s + end]);
                }
            }
        }

        // Parse Paragraph elements
        let mut cursor = 0;
        while let Some(p_start) = xml_content[cursor..].find("<Paragraph Type=\"") {
            let actual_p_start = cursor + p_start;
            let type_str_start = actual_p_start + "<Paragraph Type=\"".len();
            if let Some(quote_end) = xml_content[type_str_start..].find('"') {
                let type_name = &xml_content[type_str_start..type_str_start + quote_end];

                let elem_type = match type_name {
                    "Scene Heading" => ElementType::SceneHeading,
                    "Action" => ElementType::Action,
                    "Character" => ElementType::Character,
                    "Parenthetical" => ElementType::Parenthetical,
                    "Dialogue" => ElementType::Dialogue,
                    "Dual Dialogue" => ElementType::DualDialogue,
                    "Transition" => ElementType::Transition,
                    "Shot" => ElementType::Shot,
                    "Cast List" => ElementType::CastList,
                    _ => ElementType::Action,
                };

                let p_end = xml_content[actual_p_start..]
                    .find("</Paragraph>")
                    .map(|idx| actual_p_start + idx + "</Paragraph>".len())
                    .unwrap_or(actual_p_start + 100);

                let p_block = &xml_content[actual_p_start..p_end];

                // Extract text
                let mut text = String::new();
                let mut text_cursor = 0;
                while let Some(t_start) = p_block[text_cursor..].find("<Text>") {
                    let actual_t_start = text_cursor + t_start + 6;
                    if let Some(t_end) = p_block[actual_t_start..].find("</Text>") {
                        let chunk = &p_block[actual_t_start..actual_t_start + t_end];
                        text.push_str(&unescape_xml(chunk));
                        text_cursor = actual_t_start + t_end + 7;
                    } else {
                        break;
                    }
                }

                if !text.is_empty() || elem_type == ElementType::SceneHeading {
                    doc.paragraphs.push(Paragraph::new(elem_type, text));
                }

                cursor = p_end;
            } else {
                break;
            }
        }

        Ok(doc)
    }
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn unescape_xml(s: &str) -> String {
    s.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
}
