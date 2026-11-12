//! Document Core: Central AST and Canonical Data Model for Screenplays
//!
//! Provides stable UUID-based paragraph, scene, and character identities,
//! rich inline text runs, alternative dialogue sets, revision tracking,
//! and metadata for Final Draft 13.4.0 interoperability.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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
    NewAct,
    EndOfAct,
    SceneSummary,
    OutlineLevel1,
    OutlineLevel2,
    UserDefined,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InlineStyle {
    pub bold: bool,
    pub italic: bool,
    pub underline: bool,
    pub strikethrough: bool,
    pub uppercase: bool,
}

impl Default for InlineStyle {
    fn default() -> Self {
        Self {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            uppercase: false,
        }
    }
}

/// A contiguous span of text sharing identical formatting styles
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TextRun {
    pub text: String,
    pub style: InlineStyle,
    pub revision_id: Option<String>,
}

impl TextRun {
    pub fn plain(text: impl Into<String>) -> Self {
        Self {
            text: text.into(),
            style: InlineStyle::default(),
            revision_id: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScriptNoteItem {
    pub id: Uuid,
    pub author: String,
    pub text: String,
    pub color_tag: String,
    pub created_at: DateTime<Utc>,
    pub resolved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddedImage {
    pub id: Uuid,
    pub caption: String,
    pub mime_type: String,
    pub data_base64: String,
    pub width_inches: f32,
    pub height_inches: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paragraph {
    pub id: Uuid,
    pub element_type: ElementType,
    pub runs: Vec<TextRun>,
    pub scene_id: Option<Uuid>,
    pub scene_number: Option<String>,
    pub locked_scene: bool,
    pub omitted: bool,
    pub character_id: Option<Uuid>,
    pub dual_dialogue_group: Option<Uuid>,
    pub dual_column: Option<u8>, // 1 = Left, 2 = Right
    pub alt_dialogue: Vec<String>, // Final Draft 13 alternative dialogue lines
    pub revision_id: Option<String>,
    pub revised: bool,
    pub notes: Vec<ScriptNoteItem>,
    pub tags: Vec<String>,
    pub bookmark: Option<String>,
}

impl Paragraph {
    pub fn new(element_type: ElementType, plain_text: &str) -> Self {
        Self {
            id: Uuid::new_v4(),
            element_type,
            runs: vec![TextRun::plain(plain_text)],
            scene_id: None,
            scene_number: None,
            locked_scene: false,
            omitted: false,
            character_id: None,
            dual_dialogue_group: None,
            dual_column: None,
            alt_dialogue: Vec::new(),
            revision_id: None,
            revised: false,
            notes: Vec::new(),
            tags: Vec::new(),
            bookmark: None,
        }
    }

    pub fn full_text(&self) -> String {
        self.runs.iter().map(|r| r.text.as_str()).collect()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageLayout {
    pub width_inches: f32,       // 8.5 in (US Letter)
    pub height_inches: f32,      // 11.0 in
    pub margin_top_inches: f32,  // 1.0 in
    pub margin_bottom_inches: f32, // 1.0 in
    pub margin_left_inches: f32, // 1.5 in (Hollywood binding margin)
    pub margin_right_inches: f32,// 1.0 in
    pub lines_per_page: usize,   // 54 lines standard
}

impl Default for PageLayout {
    fn default() -> Self {
        Self {
            width_inches: 8.5,
            height_inches: 11.0,
            margin_top_inches: 1.0,
            margin_bottom_inches: 1.0,
            margin_left_inches: 1.5,
            margin_right_inches: 1.0,
            lines_per_page: 54,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TitlePageData {
    pub title: String,
    pub author: String,
    pub based_on: String,
    pub draft_date: String,
    pub contact: String,
    pub copyright: String,
}

impl Default for TitlePageData {
    fn default() -> Self {
        Self {
            title: "UNTITLED SCREENPLAY".into(),
            author: "WRITTEN BY".into(),
            based_on: "".into(),
            draft_date: "FIRST DRAFT".into(),
            contact: "".into(),
            copyright: "All Rights Reserved".into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoryBeat {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub act: u8,
    pub target_minute: u32,
    pub color_hex: String,
    pub connected_beat_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenplayDocument {
    pub id: Uuid,
    pub title_page: TitlePageData,
    pub layout: PageLayout,
    pub paragraphs: Vec<Paragraph>,
    pub beats: Vec<StoryBeat>,
    pub production_mode: bool,
    pub locked_pages: bool,
    pub active_revision_id: String,
    pub character_registry: HashMap<Uuid, String>,
    pub images: Vec<EmbeddedImage>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Default for ScreenplayDocument {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            title_page: TitlePageData::default(),
            layout: PageLayout::default(),
            paragraphs: Vec::new(),
            beats: Vec::new(),
            production_mode: false,
            locked_pages: false,
            active_revision_id: "White".into(),
            character_registry: HashMap::new(),
            images: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }
}
