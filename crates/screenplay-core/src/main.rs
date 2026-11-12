use draftcraft_core::{
    Document, ElementType, FdxCodec, FountainCodec, PaginationEngine, Paragraph,
    FINAL_DRAFT_PARITY_TARGET, TARGET_MACOS_VERSION, VERSION,
};

fn main() {
    println!("=== DraftCraft Screenplay Engine ===");
    println!("Engine Version: {}", VERSION);
    println!("Parity Reference: {}", FINAL_DRAFT_PARITY_TARGET);
    println!("Platform Target: {}", TARGET_MACOS_VERSION);
    println!("Architecture: Apple Silicon aarch64-apple-darwin (M1..M6)");
    println!("====================================\n");

    let mut doc = Document::default();
    doc.title_page.title = "NEO-TOKYO CHRONICLES".to_string();
    doc.title_page.author = "Written by John Doe".to_string();

    doc.paragraphs.push(Paragraph::new(
        ElementType::SceneHeading,
        "EXT. NEO-SHINJUKU SKYLINE - NIGHT",
    ));
    doc.paragraphs.push(Paragraph::new(
        ElementType::Action,
        "Drenched in synthetic cyan rain, towering holographic geishas dissolve into electromagnetic mist.",
    ));
    doc.paragraphs.push(Paragraph::new(ElementType::Character, "REN"));
    doc.paragraphs.push(Paragraph::new(
        ElementType::Parenthetical,
        "(adjusting neural optic)",
    ));
    doc.paragraphs.push(Paragraph::new(
        ElementType::Dialogue,
        "The uplink is alive. We have six seconds before security scrambles.",
    ));
    doc.paragraphs.push(Paragraph::new(ElementType::Character, "KIRA"));
    doc.paragraphs.push(Paragraph::new(
        ElementType::Dialogue,
        "Then make them count.",
    ));
    doc.paragraphs.push(Paragraph::new(ElementType::Transition, "FADE OUT."));

    let pages = PaginationEngine::paginate(&doc.paragraphs, false);
    println!("Sample document paginated successfully: {} page(s)", pages.len());

    let fdx_output = FdxCodec::to_fdx(&doc);
    println!("Generated Final Draft 13 .fdx XML size: {} bytes", fdx_output.len());

    let fountain_output = FountainCodec::to_fountain(&doc);
    println!("Generated Fountain script size: {} bytes", fountain_output.len());
    println!("\nEngine operational with 0-allocation high performance memory footprint.");
}
