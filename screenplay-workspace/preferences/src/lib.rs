//! Preferences: macOS Application Settings, Keybindings & Theme Customization

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppPreferences {
    pub theme: String, // "Dark", "Light", "Classic Courier"
    pub auto_save_interval_seconds: u32,
    pub spell_check_enabled: bool,
    pub courier_font_variant: String, // "Courier Prime", "Final Draft Courier"
    pub show_page_boundaries: bool,
    pub hardware_metal_acceleration: bool,
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            theme: "Dark".into(),
            auto_save_interval_seconds: 30,
            spell_check_enabled: true,
            courier_font_variant: "Courier Prime".into(),
            show_page_boundaries: true,
            hardware_metal_acceleration: true,
        }
    }
}
