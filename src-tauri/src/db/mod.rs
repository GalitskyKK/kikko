use tauri::AppHandle;

pub mod migrations;
pub mod schema;

pub fn initialize(_app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
  Ok(())
}
