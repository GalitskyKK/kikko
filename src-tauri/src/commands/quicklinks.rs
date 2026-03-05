use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Quicklink {
  pub id: String,
  pub name: String,
  pub url: String,
  #[serde(default)]
  pub tags: Vec<String>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateQuicklinkInput {
  pub name: String,
  pub url: String,
  pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateQuicklinkInput {
  pub id: String,
  pub name: String,
  pub url: String,
  pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct QuicklinkCollection {
  quicklinks: Vec<Quicklink>,
}

fn quicklinks_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  Ok(dir.join("quicklinks.json"))
}

fn read_quicklinks(app: &tauri::AppHandle) -> Result<Vec<Quicklink>, String> {
  let path = quicklinks_path(app)?;
  if !path.exists() {
    return Ok(vec![]);
  }
  let raw = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
  if raw.trim().is_empty() {
    return Ok(vec![]);
  }
  let collection = serde_json::from_str::<QuicklinkCollection>(&raw).map_err(|e| e.to_string())?;
  Ok(collection.quicklinks)
}

fn write_quicklinks(app: &tauri::AppHandle, quicklinks: &[Quicklink]) -> Result<(), String> {
  let path = quicklinks_path(app)?;
  let payload = QuicklinkCollection {
    quicklinks: quicklinks.to_vec(),
  };
  let raw = serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())?;
  std::fs::write(path, raw).map_err(|e| e.to_string())?;
  Ok(())
}

/// Default quicklink when none exist (e.g. first run).
fn default_quicklink() -> Quicklink {
  let now = Utc::now().to_rfc3339();
  Quicklink {
    id: "default-github".to_string(),
    name: "GitHub".to_string(),
    url: "https://github.com".to_string(),
    tags: vec!["github".to_string(), "code".to_string()],
    created_at: now.clone(),
    updated_at: now,
  }
}

#[tauri::command]
pub async fn get_quicklinks(app: tauri::AppHandle) -> Result<Vec<Quicklink>, String> {
  let mut list = read_quicklinks(&app)?;
  if list.is_empty() {
    list.push(default_quicklink());
    let _ = write_quicklinks(&app, &list);
  }
  list.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
  Ok(list)
}

#[tauri::command]
pub async fn create_quicklink(
  app: tauri::AppHandle,
  input: CreateQuicklinkInput,
) -> Result<Quicklink, String> {
  let name = input.name.trim().to_string();
  let url = input.url.trim().to_string();
  if name.is_empty() || url.is_empty() {
    return Err("Name and URL are required".to_string());
  }
  if !url.starts_with("http://") && !url.starts_with("https://") {
    return Err("URL must start with http:// or https://".to_string());
  }

  let mut list = read_quicklinks(&app)?;
  if list.is_empty() {
    list.push(default_quicklink());
  }
  let now = Utc::now().to_rfc3339();
  let tags = input.tags.unwrap_or_default();
  let quicklink = Quicklink {
    id: Uuid::new_v4().to_string(),
    name,
    url,
    tags,
    created_at: now.clone(),
    updated_at: now,
  };
  list.push(quicklink.clone());
  write_quicklinks(&app, &list)?;
  Ok(quicklink)
}

#[tauri::command]
pub async fn update_quicklink(
  app: tauri::AppHandle,
  input: UpdateQuicklinkInput,
) -> Result<Quicklink, String> {
  let name = input.name.trim().to_string();
  let url = input.url.trim().to_string();
  if name.is_empty() || url.is_empty() {
    return Err("Name and URL are required".to_string());
  }
  if !url.starts_with("http://") && !url.starts_with("https://") {
    return Err("URL must start with http:// or https://".to_string());
  }

  let mut list = read_quicklinks(&app)?;
  let tags = input.tags.unwrap_or_default();
  let mut updated = None;
  for q in &mut list {
    if q.id != input.id {
      continue;
    }
    q.name = name.clone();
    q.url = url.clone();
    q.tags = tags.clone();
    q.updated_at = Utc::now().to_rfc3339();
    updated = Some(q.clone());
    break;
  }
  let out = updated.ok_or_else(|| format!("Quicklink not found: {}", input.id))?;
  write_quicklinks(&app, &list)?;
  Ok(out)
}

#[tauri::command]
pub async fn delete_quicklink(app: tauri::AppHandle, id: String) -> Result<(), String> {
  let mut list = read_quicklinks(&app)?;
  list.retain(|q| q.id != id);
  write_quicklinks(&app, &list)?;
  Ok(())
}
