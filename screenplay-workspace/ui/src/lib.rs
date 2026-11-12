//! UI System: macOS 27 Window Layouts, Liquid Glass Chrome & Segmented Controls

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveView {
    ScriptEditor,
    BeatBoard,
    StoryMap,
    Navigator,
    Reports,
}

pub struct UiTheme {
    pub background_dark: &'static str,
    pub paper_ivory: &'static str,
    pub amber_accent: &'static str,
}

impl Default for UiTheme {
    fn default() -> Self {
        Self {
            background_dark: "#16161c",
            paper_ivory: "#fafafa",
            amber_accent: "#f59e0b",
        }
    }
}
