#[cfg(test)]
mod screenplay_integration_tests {
    use document_core::{ElementType, Paragraph, ScreenplayDocument};
    use file_formats::FdxFormat;
    use pagination::Paginator;
    use revision_engine::{RevisionColor, RevisionTracker};
    use screenplay_formatting::FormatRules;

    #[test]
    fn test_element_transition_logic() {
        assert_eq!(
            FormatRules::next_on_enter(ElementType::SceneHeading),
            ElementType::Action
        );
        assert_eq!(
            FormatRules::next_on_enter(ElementType::Character),
            ElementType::Dialogue
        );
        assert_eq!(
            FormatRules::next_on_tab(ElementType::Action),
            ElementType::Character
        );
    }

    #[test]
    fn test_pagination_and_orphan_protection() {
        let mut doc = ScreenplayDocument::default();
        for i in 1..=60 {
            doc.paragraphs.push(Paragraph::new(
                ElementType::Action,
                &format!("Line {}: Atmospheric mist drifts across the neon streetlights.", i),
            ));
        }
        let pages = Paginator::paginate(&doc);
        assert!(pages.len() >= 2);
    }

    #[test]
    fn test_fdx_export_compliance() {
        let mut doc = ScreenplayDocument::default();
        doc.title_page.title = "TEST SPEC SCRIPT".into();
        doc.paragraphs.push(Paragraph::new(
            ElementType::SceneHeading,
            "INT. BRIEFING ROOM - DAY",
        ));
        let xml = FdxFormat::export_fdx(&doc);
        assert!(xml.contains("<FinalDraft DocumentType=\"Script\""));
        assert!(xml.contains("<Paragraph Type=\"Scene Heading\">"));
    }

    #[test]
    fn test_revision_engine_marking() {
        let mut p = Paragraph::new(ElementType::Action, "Revised sentence.");
        RevisionTracker::mark_revised(&mut p, RevisionColor::Blue);
        assert!(p.revised);
        assert_eq!(p.revision_id, Some("Blue (1st Revision)".to_string()));
    }
}
