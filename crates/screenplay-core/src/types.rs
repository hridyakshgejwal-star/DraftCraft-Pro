use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ElementType {
    SceneHeading,
    Action,
    Character,
    Parenthetical,
    Dialogue,
    DualDialogue,
    Transition,
    Shot,
    General,
    ScriptNote,
    CastList,
}

impl ElementType {
    pub fn as_str(&self) -> &'static str {
        match self {
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
        }
    }

    pub fn default_tab_inches(&self) -> f32 {
        match self {
            ElementType::SceneHeading => 0.0,
            ElementType::Action => 0.0,
            ElementType::Character => 2.2,
            ElementType::Parenthetical => 1.6,
            ElementType::Dialogue => 1.0,
            ElementType::DualDialogue => 1.0,
            ElementType::Transition => 4.0,
            ElementType::Shot => 0.0,
            ElementType::General => 0.0,
            ElementType::ScriptNote => 0.0,
            ElementType::CastList => 0.0,
        }
    }

    pub fn default_width_inches(&self) -> f32 {
        match self {
            ElementType::SceneHeading => 6.0,
            ElementType::Action => 6.0,
            ElementType::Character => 3.8,
            ElementType::Parenthetical => 3.0,
            ElementType::Dialogue => 3.8,
            ElementType::DualDialogue => 2.9,
            ElementType::Transition => 2.0,
            ElementType::Shot => 6.0,
            ElementType::General => 6.0,
            ElementType::ScriptNote => 4.0,
            ElementType::CastList => 6.0,
        }
    }

    pub fn next_element_on_enter(&self) -> ElementType {
        match self {
            ElementType::SceneHeading => ElementType::Action,
            ElementType::Action => ElementType::Action,
            ElementType::Character => ElementType::Dialogue,
            ElementType::Parenthetical => ElementType::Dialogue,
            ElementType::Dialogue => ElementType::Action,
            ElementType::DualDialogue => ElementType::Action,
            ElementType::Transition => ElementType::SceneHeading,
            ElementType::Shot => ElementType::Action,
            _ => ElementType::Action,
        }
    }

    pub fn next_element_on_tab(&self) -> ElementType {
        match self {
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RevisionTier {
    White,       // Production Draft
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

impl RevisionTier {
    pub fn hex_color(&self) -> &'static str {
        match self {
            RevisionTier::White => "#ffffff",
            RevisionTier::Blue => "#93c5fd",
            RevisionTier::Pink => "#f9a8d4",
            RevisionTier::Yellow => "#fef08a",
            RevisionTier::Green => "#86efac",
            RevisionTier::Goldenrod => "#fde047",
            RevisionTier::Buff => "#fed7aa",
            RevisionTier::Salmon => "#fca5a5",
            RevisionTier::Cherry => "#f43f5e",
            RevisionTier::SecondBlue => "#60a5fa",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookmarkItem {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteItem {
    pub id: String,
    pub name: Option<String>,
    pub author: String,
    pub text: String,
    pub color: String,
    pub category: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paragraph {
    pub id: String,
    pub element_type: ElementType,
    pub text: String,
    pub scene_number: Option<String>,
    pub locked_scene: bool,
    pub omitted: bool,
    pub dual_group_id: Option<String>,
    pub dual_column: Option<u8>, // 1 = left, 2 = right
    pub revision: Option<RevisionTier>,
    pub revised: bool,
    pub notes: Vec<NoteItem>,
    pub bookmark: Option<BookmarkItem>,
    pub scene_comment: Option<String>,
}

impl Paragraph {
    pub fn new(element_type: ElementType, text: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            element_type,
            text: text.into(),
            scene_number: None,
            locked_scene: false,
            omitted: false,
            dual_group_id: None,
            dual_column: None,
            revision: None,
            revised: false,
            notes: Vec::new(),
            bookmark: None,
            scene_comment: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitlePage {
    pub title: String,
    pub author: String,
    pub based_on: String,
    pub draft_date: String,
    pub contact: String,
    pub copyright: String,
}

impl Default for TitlePage {
    fn default() -> Self {
        Self {
            title: "UNTITLED SCREENPLAY".into(),
            author: "WRITTEN BY".into(),
            based_on: "".into(),
            draft_date: "FIRST DRAFT".into(),
            contact: "Representation & Inquiries\nEmail: contact@production.com".into(),
            copyright: "All Rights Reserved".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeatCard {
    pub id: String,
    pub title: String,
    pub description: String,
    pub act: u8,
    pub color: String,
    pub pos_x: f32,
    pub pos_y: f32,
    pub connected_to: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub title_page: TitlePage,
    pub paragraphs: Vec<Paragraph>,
    pub current_revision: RevisionTier,
    pub production_mode: bool,
    pub locked_pages: bool,
    pub beats: Vec<BeatCard>,
}

impl Default for Document {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            title_page: TitlePage::default(),
            paragraphs: Vec::new(),
            current_revision: RevisionTier::White,
            production_mode: false,
            locked_pages: false,
            beats: Vec::new(),
        }
    }
}
