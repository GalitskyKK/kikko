use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Snippet {
  pub id: String,
  pub name: String,
  pub keyword: String,
  pub content: String,
  pub category: Option<String>,
  pub use_count: i64,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateSnippetInput {
  pub name: String,
  pub keyword: String,
  pub content: String,
  pub category: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSnippetInput {
  pub id: String,
  pub name: String,
  pub keyword: String,
  pub content: String,
  pub category: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct SnippetCollection {
  snippets: Vec<Snippet>,
}

#[tauri::command]
pub async fn get_snippets(app: tauri::AppHandle) -> Result<Vec<Snippet>, String> {
  let mut snippets = read_snippets(&app)?;
  snippets.sort_by(|left, right| {
    right
      .use_count
      .cmp(&left.use_count)
      .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
  });
  Ok(snippets)
}

#[tauri::command]
pub async fn create_snippet(
  app: tauri::AppHandle,
  input: CreateSnippetInput,
) -> Result<Snippet, String> {
  let name = input.name.trim().to_string();
  let keyword = input.keyword.trim().to_lowercase();
  let content = input.content.to_string();
  if name.is_empty() || keyword.is_empty() || content.trim().is_empty() {
    return Err("Snippet fields are required".to_string());
  }

  let mut snippets = read_snippets(&app)?;
  if snippets.iter().any(|snippet| snippet.keyword == keyword) {
    return Err(format!("Snippet keyword already exists: {}", keyword));
  }

  let now = Utc::now().to_rfc3339();
  let snippet = Snippet {
    id: Uuid::new_v4().to_string(),
    name,
    keyword,
    content,
    category: input.category,
    use_count: 0,
    created_at: now.clone(),
    updated_at: now,
  };
  snippets.push(snippet.clone());
  write_snippets(&app, &snippets)?;
  Ok(snippet)
}

#[tauri::command]
pub async fn update_snippet(
  app: tauri::AppHandle,
  input: UpdateSnippetInput,
) -> Result<Snippet, String> {
  let name = input.name.trim().to_string();
  let keyword = input.keyword.trim().to_lowercase();
  let content = input.content.to_string();
  if name.is_empty() || keyword.is_empty() || content.trim().is_empty() {
    return Err("Snippet fields are required".to_string());
  }

  let mut snippets = read_snippets(&app)?;
  if snippets
    .iter()
    .any(|snippet| snippet.id != input.id && snippet.keyword == keyword)
  {
    return Err(format!("Snippet keyword already exists: {}", keyword));
  }

  let mut updated = None;
  for snippet in &mut snippets {
    if snippet.id != input.id {
      continue;
    }
    snippet.name = name.clone();
    snippet.keyword = keyword.clone();
    snippet.content = content.clone();
    snippet.category = input.category.clone();
    snippet.updated_at = Utc::now().to_rfc3339();
    updated = Some(snippet.clone());
    break;
  }

  let updated = updated.ok_or_else(|| format!("Snippet not found: {}", input.id))?;
  write_snippets(&app, &snippets)?;
  Ok(updated)
}

#[tauri::command]
pub async fn delete_snippet(app: tauri::AppHandle, id: String) -> Result<(), String> {
  let mut snippets = read_snippets(&app)?;
  snippets.retain(|snippet| snippet.id != id);
  write_snippets(&app, &snippets)?;
  Ok(())
}

#[tauri::command]
pub async fn mark_snippet_used(app: tauri::AppHandle, id: String) -> Result<(), String> {
  let mut snippets = read_snippets(&app)?;
  for snippet in &mut snippets {
    if snippet.id != id {
      continue;
    }
    snippet.use_count += 1;
    snippet.updated_at = Utc::now().to_rfc3339();
    break;
  }
  write_snippets(&app, &snippets)?;
  Ok(())
}

fn snippets_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app.path().app_config_dir().map_err(|error| error.to_string())?;
  std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
  Ok(dir.join("snippets.json"))
}

fn read_snippets(app: &tauri::AppHandle) -> Result<Vec<Snippet>, String> {
  let path = snippets_path(app)?;
  if !path.exists() {
    return Ok(vec![]);
  }
  let raw = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
  if raw.trim().is_empty() {
    return Ok(vec![]);
  }
  let collection = serde_json::from_str::<SnippetCollection>(&raw).map_err(|error| error.to_string())?;
  Ok(collection.snippets)
}

fn write_snippets(app: &tauri::AppHandle, snippets: &[Snippet]) -> Result<(), String> {
  let path = snippets_path(app)?;
  let payload = SnippetCollection {
    snippets: snippets.to_vec(),
  };
  let raw = serde_json::to_string_pretty(&payload).map_err(|error| error.to_string())?;
  std::fs::write(path, raw).map_err(|error| error.to_string())?;
  Ok(())
}
