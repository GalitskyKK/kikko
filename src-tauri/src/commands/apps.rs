use serde::Serialize;
use std::fs;
use std::hash::Hash;
use std::hash::Hasher;
use std::path::Path;
use std::path::PathBuf;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Serialize)]
pub struct AppInfo {
  pub id: String,
  pub name: String,
  pub path: Option<String>,
}

fn collect_entries(dir: &Path, out: &mut Vec<AppInfo>, prefix: &str) {
  let Ok(entries) = fs::read_dir(dir) else {
    return;
  };
  for entry in entries.flatten() {
    let path = entry.path();
    if path.is_dir() {
      let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
      collect_entries(&path, out, &format!("{prefix}{name}/"));
    } else {
      let name = path
        .file_stem()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
      if name.is_empty() {
        continue;
      }
      let path_str = path.to_string_lossy().to_string();
      let id = path_str.replace('\\', "_").replace(' ', "_");
      out.push(AppInfo {
        id,
        name,
        path: Some(path_str),
      });
    }
  }
}

#[tauri::command]
pub async fn get_installed_apps() -> Result<Vec<AppInfo>, String> {
  let mut apps = Vec::new();

  #[cfg(target_os = "windows")]
  {
    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| "".to_string());
    let program_data = std::env::var("ProgramData").unwrap_or_else(|_| "".to_string());
    for base in [
      format!("{appdata}\\Microsoft\\Windows\\Start Menu\\Programs"),
      format!("{program_data}\\Microsoft\\Windows\\Start Menu\\Programs"),
    ] {
      let path = Path::new(&base);
      if base.is_empty() {
        continue;
      }
      if path.is_dir() {
        collect_entries(path, &mut apps, "");
      }
    }
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.name.eq_ignore_ascii_case(&b.name));
  }

  #[cfg(target_os = "macos")]
  {
    let applications = Path::new("/Applications");
    if applications.is_dir() {
      let Ok(entries) = fs::read_dir(applications) else {
        return Ok(apps);
      };
      for entry in entries.flatten() {
        let path = entry.path();
        let name = path
          .file_stem()
          .and_then(|s| s.to_str())
          .unwrap_or("")
          .replace(".app", "");
        if name.is_empty() {
          continue;
        }
        let path_str = path.to_string_lossy().to_string();
        apps.push(AppInfo {
          id: path_str.replace('/', "_"),
          name,
          path: Some(path_str),
        });
      }
    }
  }

  #[cfg(target_os = "linux")]
  {
    let dirs = [
      "/usr/share/applications",
      "/usr/local/share/applications",
    ];
    for dir in dirs {
      let path = Path::new(dir);
      if !path.is_dir() {
        continue;
      }
      let Ok(entries) = fs::read_dir(path) else {
        continue;
      };
      for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("desktop") {
          continue;
        }
        let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
        if name.is_empty() {
          continue;
        }
        let path_str = path.to_string_lossy().to_string();
        apps.push(AppInfo {
          id: path_str.replace('/', "_"),
          name,
          path: Some(path_str),
        });
      }
    }
  }

  Ok(apps)
}

#[tauri::command]
pub async fn get_app_icon_png(app_handle: tauri::AppHandle, path: String) -> Result<Vec<u8>, String> {
  get_path_icon_png(app_handle, path).await
}

#[tauri::command]
pub async fn get_path_icon_png(app_handle: tauri::AppHandle, path: String) -> Result<Vec<u8>, String> {
  #[cfg(target_os = "windows")]
  {
    let trimmed = path.trim();
    if trimmed.is_empty() {
      return Err("path is empty".to_string());
    }
    let source_path = PathBuf::from(trimmed);
    if !source_path.exists() {
      return Err("path does not exist".to_string());
    }

    let cache_dir = app_handle
      .path()
      .app_cache_dir()
      .map_err(|e| e.to_string())?
      .join("app-icons");
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    let icon_file = cache_dir.join(format!("{}.png", hash_path(trimmed)));
    if !icon_file.exists() {
      extract_icon_with_powershell(trimmed, &icon_file)?;
    }

    return fs::read(icon_file).map_err(|e| e.to_string());
  }

  #[cfg(not(target_os = "windows"))]
  {
    let _ = app_handle;
    let _ = path;
    Err("native app icons are currently windows-only".to_string())
  }
}

#[cfg(target_os = "windows")]
fn extract_icon_with_powershell(source_path: &str, output_file: &Path) -> Result<(), String> {
  let escaped_source = source_path.replace('\'', "''");
  let escaped_output = output_file.to_string_lossy().replace('\'', "''");
  let script = format!(
    "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Drawing; \
     $icon=[System.Drawing.Icon]::ExtractAssociatedIcon('{escaped_source}'); \
     if ($null -eq $icon) {{ throw 'icon not found' }}; \
     $bmp=$icon.ToBitmap(); \
     $bmp.Save('{escaped_output}', [System.Drawing.Imaging.ImageFormat]::Png); \
     $bmp.Dispose(); \
     $icon.Dispose();"
  );

  let status = std::process::Command::new("powershell")
    .creation_flags(CREATE_NO_WINDOW)
    .args(["-NoProfile", "-NonInteractive", "-Command", &script])
    .status()
    .map_err(|e| e.to_string())?;

  if status.success() {
    Ok(())
  } else {
    Err("failed to extract icon with powershell".to_string())
  }
}

fn hash_path(value: &str) -> u64 {
  let mut hasher = std::collections::hash_map::DefaultHasher::new();
  value.hash(&mut hasher);
  hasher.finish()
}

/// Запуск приложения/файла по локальному пути (обход ограничения shell open на URL-only).
#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
  let path = path.trim();
  if path.is_empty() {
    return Err("path is empty".to_string());
  }
  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("cmd")
      .creation_flags(CREATE_NO_WINDOW)
      .args(["/C", "start", "", path])
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .arg(path)
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "linux")]
  {
    std::process::Command::new("xdg-open")
      .arg(path)
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}
