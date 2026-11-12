//! Collaboration: CRDT Document Syncing & Multi-User Script Room Primitives

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollabOperation {
    pub client_id: Uuid,
    pub paragraph_id: Uuid,
    pub revision_number: u64,
    pub text_diff: String,
}
