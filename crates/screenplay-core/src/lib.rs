pub mod fdx;
pub mod fountain;
pub mod macos_bridge;
pub mod pagination;
pub mod types;

pub use fdx::FdxCodec;
pub use fountain::FountainCodec;
pub use macos_bridge::MacOsPlatformContext;
pub use pagination::{PaginationEngine, ScriptPage, LINES_PER_PAGE};
pub use types::{Document, ElementType, NoteItem, Paragraph, RevisionTier, TitlePage, BeatCard};

pub const VERSION: &str = "1.4.0";
pub const FINAL_DRAFT_PARITY_TARGET: &str = "Final Draft 13.4.0";
pub const TARGET_MACOS_VERSION: &str = "macOS 27.0.1 Golden Gate";
