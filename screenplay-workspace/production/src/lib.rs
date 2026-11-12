//! Production: Shooting Draft Locks, Scene Renumbering & Omission Protocol

use document_core::{ElementType, Paragraph};

pub struct ProductionService;

impl ProductionService {
    /// Lock all existing scene numbers for production draft
    pub fn lock_all_scenes(paragraphs: &mut [Paragraph]) {
        let mut scene_num = 1;
        for p in paragraphs {
            if p.element_type == ElementType::SceneHeading {
                if p.scene_number.is_none() {
                    p.scene_number = Some(scene_num.to_string());
                    scene_num += 1;
                }
                p.locked_scene = true;
            }
        }
    }

    /// Mark scene as omitted preserving number for call-sheet continuity
    pub fn omit_scene(p: &mut Paragraph) {
        if p.element_type == ElementType::SceneHeading {
            p.omitted = true;
        }
    }
}
