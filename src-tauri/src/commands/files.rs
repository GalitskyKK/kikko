use serde::Deserialize;
use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct FileInfo {
  pub id: String,
  pub path: String,
  pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct SearchFilesInput {
  pub query: String,
  pub dirs: Vec<String>,
}

const MAX_FILE_RESULTS: usize = 50;

fn collect_matching_files(
  dir: &Path,
  query_lower: &str,
  out: &mut Vec<FileInfo>,
) {
  if out.len() >= MAX_FILE_RESULTS {
    return;
  }
  let Ok(entries) = fs::read_dir(dir) else {
    return;
  };
  for entry in entries.flatten() {
    if out.len() >= MAX_FILE_RESULTS {
      return;
    }
    let path = entry.path();
    if path.is_dir() {
      collect_matching_files(&path, query_lower, out);
    } else if path.is_file() {
      let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
      if query_lower.is_empty() || name.to_lowercase().contains(query_lower) {
        let path_str = path.to_string_lossy().to_string();
        let id = path_str.replace('\\', "_").replace(' ', "_");
        out.push(FileInfo {
          id,
          path: path_str,
          name: name.to_string(),
        });
      }
    }
  }
}

/// Возвращает базовые каталоги пользователя для имён "Desktop", "Documents", "Downloads".
fn user_dirs() -> Vec<std::path::PathBuf> {
  let mut dirs = Vec::new();
  #[cfg(target_os = "windows")]
  {
    if let Ok(profile) = std::env::var("USERPROFILE") {
      let base = Path::new(&profile);
      for name in ["Desktop", "Documents", "Downloads"] {
        dirs.push(base.join(name));
      }
    }
  }
  #[cfg(target_os = "macos")]
  {
    if let Ok(home) = std::env::var("HOME") {
      let base = Path::new(&home);
      dirs.push(base.join("Desktop"));
      dirs.push(base.join("Documents"));
      dirs.push(base.join("Downloads"));
    }
  }
  #[cfg(target_os = "linux")]
  {
    if let Ok(home) = std::env::var("HOME") {
      let base = Path::new(&home);
      dirs.push(base.join("Desktop"));
      dirs.push(base.join("Documents"));
      dirs.push(base.join("Downloads"));
    }
  }
  dirs
}

#[tauri::command]
pub async fn search_files(input: SearchFilesInput) -> Result<Vec<FileInfo>, String> {
  let query_lower = input.query.trim().to_lowercase();
  let mut results = Vec::new();

  let search_dirs: Vec<_> = if input.dirs.is_empty() {
    user_dirs()
  } else {
    #[cfg(target_os = "windows")]
    {
      let profile = std::env::var("USERPROFILE").unwrap_or_else(|_| "".to_string());
      let base = Path::new(&profile);
      input
        .dirs
        .iter()
        .map(|d| base.join(d))
        .collect()
    }
    #[cfg(not(target_os = "windows"))]
    {
      let home = std::env::var("HOME").unwrap_or_else(|_| "".to_string());
      let base = Path::new(&home);
      input.dirs.iter().map(|d| base.join(d)).collect()
    }
  };

  for dir in search_dirs {
    if !dir.is_dir() {
      continue;
    }
    collect_matching_files(&dir, &query_lower, &mut results);
    if results.len() >= MAX_FILE_RESULTS {
      break;
    }
  }

  Ok(results)
}
