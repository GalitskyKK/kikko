use std::collections::hash_map::DefaultHasher;
use std::borrow::Cow;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use chrono::Utc;
use image::{ImageFormat, RgbaImage};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use crate::db::schema::SCHEMA_SQL;

#[derive(Debug, Clone)]
pub struct ClipboardState {
  pub db_path: std::path::PathBuf,
  pub cache_dir: std::path::PathBuf,
  pub last_signature: Arc<Mutex<String>>,
}

fn open_conn(path: &std::path::Path) -> Result<rusqlite::Connection, String> {
  let conn = rusqlite::Connection::open(path).map_err(|e| e.to_string())?;
  conn.execute_batch(SCHEMA_SQL).map_err(|e| e.to_string())?;
  Ok(conn)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClipboardEntry {
  pub id: String,
  pub content: String,
  pub content_type: String,
  pub encrypted: bool,
  pub is_favorite: bool,
  pub is_pinned: bool,
  pub app_source: Option<String>,
  pub char_count: i64,
  pub preview: String,
  pub asset_file_path: Option<String>,
  pub asset_mime_type: Option<String>,
  pub asset_file_size: Option<i64>,
  pub asset_width: Option<i64>,
  pub asset_height: Option<i64>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct AddClipboardEntryInput {
  pub content: String,
  pub content_type: String,
  pub app_source: Option<String>,
  pub asset_file_path: Option<String>,
  pub asset_mime_type: Option<String>,
  pub asset_file_size: Option<i64>,
  pub asset_width: Option<i64>,
  pub asset_height: Option<i64>,
}

#[derive(Debug)]
struct ClipboardAssetInput {
  file_path: String,
  mime_type: String,
  file_size: i64,
  width: Option<i64>,
  height: Option<i64>,
}

fn classify_text_content_type(content: &str) -> String {
  let trimmed = content.trim();
  if trimmed.starts_with('<') && trimmed.contains('>') && trimmed.contains("</") {
    return "html".to_string();
  }

  let has_code_pattern =
    content.contains('\n') && (content.contains('{') || content.contains(';') || content.contains("=>"));
  if has_code_pattern {
    return "code".to_string();
  }

  "text".to_string()
}

fn create_preview(content: &str, max_len: usize) -> String {
  content
    .replace('\n', " ")
    .replace('\r', " ")
    .trim()
    .chars()
    .take(max_len)
    .collect::<String>()
}

fn compute_signature(content_type: &str, content: &str) -> String {
  let mut hasher = DefaultHasher::new();
  content_type.hash(&mut hasher);
  content.hash(&mut hasher);
  format!("{:x}", hasher.finish())
}

fn compute_image_signature(width: usize, height: usize, bytes: &[u8]) -> String {
  let mut hasher = DefaultHasher::new();
  "image".hash(&mut hasher);
  width.hash(&mut hasher);
  height.hash(&mut hasher);
  bytes.hash(&mut hasher);
  format!("{:x}", hasher.finish())
}

fn update_last_signature(state: &ClipboardState, value: String) -> Result<(), String> {
  let mut last = state.last_signature.lock().map_err(|e| e.to_string())?;
  *last = value;
  Ok(())
}

fn remove_file_if_exists(path: &str) {
  let file_path = Path::new(path);
  if file_path.exists() {
    let _ = fs::remove_file(file_path);
  }
}

fn get_asset_path_by_entry_id(conn: &rusqlite::Connection, id: &str) -> Option<String> {
  conn
    .query_row(
      "SELECT file_path FROM clipboard_assets WHERE entry_id = ?1",
      params![id],
      |row| row.get::<_, String>(0),
    )
    .ok()
}

fn set_text_with_retry(clipboard: &mut arboard::Clipboard, value: &str) -> Result<(), String> {
  let mut last_error = String::new();
  for _ in 0..8 {
    match clipboard.set_text(value.to_string()) {
      Ok(()) => return Ok(()),
      Err(error) => {
        last_error = error.to_string();
        std::thread::sleep(Duration::from_millis(35));
      }
    }
  }
  Err(last_error)
}

fn set_image_with_retry(
  clipboard: &mut arboard::Clipboard,
  width: usize,
  height: usize,
  bytes: Vec<u8>,
) -> Result<(), String> {
  let mut last_error = String::new();
  for _ in 0..8 {
    match clipboard.set_image(arboard::ImageData {
      width,
      height,
      bytes: Cow::Owned(bytes.clone()),
    }) {
      Ok(()) => return Ok(()),
      Err(error) => {
        last_error = error.to_string();
        std::thread::sleep(Duration::from_millis(35));
      }
    }
  }
  Err(last_error)
}

fn detect_file_list_from_text(content: &str) -> Option<Vec<PathBuf>> {
  let lines = content
    .lines()
    .map(str::trim)
    .filter(|line| !line.is_empty())
    .map(PathBuf::from)
    .collect::<Vec<_>>();

  if lines.is_empty() || lines.len() > 20 {
    return None;
  }

  if lines.iter().all(|path| path.exists()) {
    Some(lines)
  } else {
    None
  }
}

fn ensure_clipboard_dirs(base_cache_dir: &Path) -> Result<(PathBuf, PathBuf), String> {
  let images_dir = base_cache_dir.join("clipboard").join("images");
  let files_dir = base_cache_dir.join("clipboard").join("files");
  fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
  fs::create_dir_all(&files_dir).map_err(|e| e.to_string())?;
  Ok((images_dir, files_dir))
}

fn save_image_asset(
  images_dir: &Path,
  entry_id: &str,
  image_data: arboard::ImageData<'_>,
) -> Result<ClipboardAssetInput, String> {
  let width = image_data.width;
  let height = image_data.height;
  let raw = image_data.bytes.into_owned();
  let rgba = RgbaImage::from_raw(width as u32, height as u32, raw)
    .ok_or_else(|| "failed to convert clipboard image into RGBA".to_string())?;

  let file_path = images_dir.join(format!("{entry_id}.png"));
  rgba
    .save_with_format(&file_path, ImageFormat::Png)
    .map_err(|e| e.to_string())?;

  let meta = fs::metadata(&file_path).map_err(|e| e.to_string())?;
  Ok(ClipboardAssetInput {
    file_path: file_path.to_string_lossy().to_string(),
    mime_type: "image/png".to_string(),
    file_size: meta.len() as i64,
    width: Some(width as i64),
    height: Some(height as i64),
  })
}

fn save_file_list_asset(files_dir: &Path, entry_id: &str, files: &[PathBuf]) -> Result<ClipboardAssetInput, String> {
  let manifest_path = files_dir.join(format!("{entry_id}.txt"));
  let body = files
    .iter()
    .map(|path| path.to_string_lossy().to_string())
    .collect::<Vec<_>>()
    .join("\n");
  fs::write(&manifest_path, body.as_bytes()).map_err(|e| e.to_string())?;

  let meta = fs::metadata(&manifest_path).map_err(|e| e.to_string())?;
  Ok(ClipboardAssetInput {
    file_path: manifest_path.to_string_lossy().to_string(),
    mime_type: "text/uri-list".to_string(),
    file_size: meta.len() as i64,
    width: None,
    height: None,
  })
}

fn insert_clipboard_entry(
  conn: &rusqlite::Connection,
  id: &str,
  content: &str,
  content_type: &str,
  app_source: Option<&str>,
  preview: &str,
  now: &str,
  asset: Option<&ClipboardAssetInput>,
) -> Result<(), String> {
  let char_count = content.chars().count() as i64;

  conn
    .execute(
      "INSERT INTO clipboard_entries (id, content, content_type, encrypted, is_favorite, is_pinned, app_source, char_count, preview, created_at, updated_at) \
       VALUES (?1, ?2, ?3, 0, 0, 0, ?4, ?5, ?6, ?7, ?7)",
      params![id, content, content_type, app_source, char_count, preview, now],
    )
    .map_err(|e| e.to_string())?;

  if let Some(asset_input) = asset {
    conn
      .execute(
        "INSERT OR REPLACE INTO clipboard_assets (entry_id, file_path, mime_type, file_size, width, height, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
          id,
          asset_input.file_path,
          asset_input.mime_type,
          asset_input.file_size,
          asset_input.width,
          asset_input.height,
          now,
        ],
      )
      .map_err(|e| e.to_string())?;
  }

  Ok(())
}

fn get_clipboard_entry_by_id(conn: &rusqlite::Connection, id: &str) -> Result<ClipboardEntry, String> {
  let mut stmt = conn
    .prepare(
      "SELECT ce.id, ce.content, ce.content_type, ce.encrypted, ce.is_favorite, ce.is_pinned, ce.app_source, ce.char_count, ce.preview, \
              ca.file_path, ca.mime_type, ca.file_size, ca.width, ca.height, ce.created_at, ce.updated_at \
       FROM clipboard_entries ce \
       LEFT JOIN clipboard_assets ca ON ca.entry_id = ce.id \
       WHERE ce.id = ?1",
    )
    .map_err(|e| e.to_string())?;

  stmt
    .query_row(params![id], |row| {
      Ok(ClipboardEntry {
        id: row.get(0)?,
        content: row.get(1)?,
        content_type: row.get(2)?,
        encrypted: row.get::<_, i32>(3)? != 0,
        is_favorite: row.get::<_, i32>(4)? != 0,
        is_pinned: row.get::<_, i32>(5)? != 0,
        app_source: row.get(6)?,
        char_count: row.get(7)?,
        preview: row.get(8)?,
        asset_file_path: row.get(9)?,
        asset_mime_type: row.get(10)?,
        asset_file_size: row.get(11)?,
        asset_width: row.get(12)?,
        asset_height: row.get(13)?,
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
      })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_clipboard_history(state: State<'_, ClipboardState>) -> Result<Vec<ClipboardEntry>, String> {
  let conn = open_conn(&state.db_path)?;
  let mut stmt = conn
    .prepare(
      "SELECT ce.id, ce.content, ce.content_type, ce.encrypted, ce.is_favorite, ce.is_pinned, ce.app_source, ce.char_count, ce.preview, \
              ca.file_path, ca.mime_type, ca.file_size, ca.width, ca.height, ce.created_at, ce.updated_at \
       FROM clipboard_entries ce \
       LEFT JOIN clipboard_assets ca ON ca.entry_id = ce.id \
       ORDER BY ce.is_pinned DESC, ce.created_at DESC LIMIT 500",
    )
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([], |row| {
      Ok(ClipboardEntry {
        id: row.get(0)?,
        content: row.get(1)?,
        content_type: row.get(2)?,
        encrypted: row.get::<_, i32>(3)? != 0,
        is_favorite: row.get::<_, i32>(4)? != 0,
        is_pinned: row.get::<_, i32>(5)? != 0,
        app_source: row.get(6)?,
        char_count: row.get(7)?,
        preview: row.get(8)?,
        asset_file_path: row.get(9)?,
        asset_mime_type: row.get(10)?,
        asset_file_size: row.get(11)?,
        asset_width: row.get(12)?,
        asset_height: row.get(13)?,
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
      })
    })
    .map_err(|e| e.to_string())?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(|e| e.to_string())?);
  }
  Ok(out)
}

#[tauri::command]
pub async fn add_clipboard_entry(
  state: State<'_, ClipboardState>,
  input: AddClipboardEntryInput,
) -> Result<ClipboardEntry, String> {
  let id = Uuid::new_v4().to_string();
  let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
  let content_type = if input.content_type.trim().is_empty() {
    classify_text_content_type(&input.content)
  } else {
    input.content_type
  };
  let preview = create_preview(&input.content, 200);
  let asset = match input.asset_file_path {
    Some(file_path) => Some(ClipboardAssetInput {
      file_path,
      mime_type: input
        .asset_mime_type
        .unwrap_or_else(|| "application/octet-stream".to_string()),
      file_size: input.asset_file_size.unwrap_or_default(),
      width: input.asset_width,
      height: input.asset_height,
    }),
    None => None,
  };

  let conn = open_conn(&state.db_path)?;
  insert_clipboard_entry(
    &conn,
    &id,
    &input.content,
    &content_type,
    input.app_source.as_deref(),
    &preview,
    &now,
    asset.as_ref(),
  )?;
  get_clipboard_entry_by_id(&conn, &id)
}

#[tauri::command]
pub async fn capture_clipboard_entry(state: State<'_, ClipboardState>) -> Result<Option<ClipboardEntry>, String> {
  let (images_dir, files_dir) = ensure_clipboard_dirs(&state.cache_dir)?;
  let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;

  if let Ok(image) = clipboard.get_image() {
    let entry_id = Uuid::new_v4().to_string();
    let image_signature = compute_image_signature(image.width, image.height, image.bytes.as_ref());
    let image_asset = save_image_asset(&images_dir, &entry_id, image)?;
    let content_type = "image".to_string();
    let content = image_asset.file_path.clone();
    let preview = format!(
      "Image {}x{}",
      image_asset.width.unwrap_or_default(),
      image_asset.height.unwrap_or_default()
    );
    let asset = Some(image_asset);

    let signature = image_signature;
    let is_duplicate = {
      let mut last = state.last_signature.lock().map_err(|e| e.to_string())?;
      if *last == signature {
        true
      } else {
        *last = signature;
        false
      }
    };
    if is_duplicate {
      return Ok(None);
    }

    let conn = open_conn(&state.db_path)?;
    let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    insert_clipboard_entry(
      &conn,
      &entry_id,
      &content,
      &content_type,
      None,
      &preview,
      &now,
      asset.as_ref(),
    )?;
    return get_clipboard_entry_by_id(&conn, &entry_id).map(Some);
  }

  let text = if let Ok(value) = clipboard.get_text() {
    value
  } else {
    return Ok(None);
  };

  if text.trim().is_empty() {
    return Ok(None);
  }

  let (content_type, content, preview, asset) = if let Some(paths) = detect_file_list_from_text(&text) {
    let entry_id = Uuid::new_v4().to_string();
    let file_asset = save_file_list_asset(&files_dir, &entry_id, &paths)?;
    let file_preview = if paths.len() == 1 {
      let name = paths[0]
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("1 file")
        .to_string();
      format!("File: {name}")
    } else {
      format!("{} files", paths.len())
    };
    ("file".to_string(), text.clone(), file_preview, Some(file_asset))
  } else {
    let detected_content_type = classify_text_content_type(&text);
    let detected_preview = create_preview(&text, 200);
    (detected_content_type, text, detected_preview, None)
  };

  let signature = compute_signature(&content_type, &content);
  let is_duplicate = {
    let mut last = state.last_signature.lock().map_err(|e| e.to_string())?;
    if *last == signature {
      true
    } else {
      *last = signature;
      false
    }
  };
  if is_duplicate {
    return Ok(None);
  }

  let entry_id = Uuid::new_v4().to_string();
  let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
  let conn = open_conn(&state.db_path)?;
  insert_clipboard_entry(
    &conn,
    &entry_id,
    &content,
    &content_type,
    None,
    &preview,
    &now,
    asset.as_ref(),
  )?;
  get_clipboard_entry_by_id(&conn, &entry_id).map(Some)
}

#[tauri::command]
pub async fn toggle_favorite(state: State<'_, ClipboardState>, id: String) -> Result<(), String> {
  let conn = open_conn(&state.db_path)?;
  let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
  conn
    .execute(
      "UPDATE clipboard_entries SET is_favorite = 1 - is_favorite, updated_at = ?1 WHERE id = ?2",
      params![now, id],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub async fn delete_entry(state: State<'_, ClipboardState>, id: String) -> Result<(), String> {
  let conn = open_conn(&state.db_path)?;
  let asset_path = get_asset_path_by_entry_id(&conn, &id);
  if let Some(path) = asset_path {
    remove_file_if_exists(&path);
  }
  conn
    .execute("DELETE FROM clipboard_assets WHERE entry_id = ?1", params![&id])
    .map_err(|e| e.to_string())?;
  conn
    .execute("DELETE FROM clipboard_entries WHERE id = ?1", params![id])
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub async fn clear_history(state: State<'_, ClipboardState>) -> Result<(), String> {
  let conn = open_conn(&state.db_path)?;
  let mut stmt = conn
    .prepare("SELECT file_path FROM clipboard_assets")
    .map_err(|e| e.to_string())?;
  let paths = stmt
    .query_map([], |row| row.get::<_, String>(0))
    .map_err(|e| e.to_string())?;
  for path in paths {
    if let Ok(value) = path {
      remove_file_if_exists(&value);
    }
  }
  conn
    .execute("DELETE FROM clipboard_assets", [])
    .map_err(|e| e.to_string())?;
  conn
    .execute("DELETE FROM clipboard_entries", [])
    .map_err(|e| e.to_string())?;
  if let Ok(mut signature) = state.last_signature.lock() {
    signature.clear();
  }
  Ok(())
}

#[tauri::command]
pub async fn toggle_pinned(state: State<'_, ClipboardState>, id: String) -> Result<(), String> {
  let conn = open_conn(&state.db_path)?;
  let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
  conn
    .execute(
      "UPDATE clipboard_entries SET is_pinned = 1 - is_pinned, updated_at = ?1 WHERE id = ?2",
      params![now, id],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub async fn write_clipboard_entry(state: State<'_, ClipboardState>, id: String) -> Result<(), String> {
  let conn = open_conn(&state.db_path)?;
  let entry = get_clipboard_entry_by_id(&conn, &id)?;
  let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;

  match entry.content_type.as_str() {
    "image" => {
      let image_path = entry
        .asset_file_path
        .clone()
        .ok_or_else(|| "image entry missing asset path".to_string())?;
      let dynamic = image::open(&image_path).map_err(|e| e.to_string())?;
      let rgba = dynamic.to_rgba8();
      let width = rgba.width() as usize;
      let height = rgba.height() as usize;
      let bytes = rgba.into_raw();
      let signature = compute_image_signature(width, height, &bytes);

      set_image_with_retry(&mut clipboard, width, height, bytes)?;
      update_last_signature(&state, signature)?;
    }
    "file" => {
      let file_list = if let Some(asset_path) = entry.asset_file_path.clone() {
        fs::read_to_string(asset_path).unwrap_or(entry.content.clone())
      } else {
        entry.content.clone()
      };
      set_text_with_retry(&mut clipboard, &file_list)?;
      update_last_signature(&state, compute_signature("file", &file_list))?;
    }
    _ => {
      set_text_with_retry(&mut clipboard, &entry.content)?;
      update_last_signature(&state, compute_signature(&entry.content_type, &entry.content))?;
    }
  }

  Ok(())
}

#[tauri::command]
pub async fn get_clipboard_asset_bytes(
  state: State<'_, ClipboardState>,
  id: String,
) -> Result<Vec<u8>, String> {
  let conn = open_conn(&state.db_path)?;
  let asset_path = get_asset_path_by_entry_id(&conn, &id)
    .ok_or_else(|| "asset path not found for clipboard entry".to_string())?;

  let path = PathBuf::from(&asset_path);
  let full_path = if path.is_absolute() {
    path
  } else {
    state.cache_dir.join(path)
  };

  fs::read(full_path).map_err(|e| e.to_string())
}
