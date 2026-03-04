use serde::Serialize;
use serde_json::Value;
use std::fs;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct LoadedPluginManifest {
  pub id: String,
  pub name: String,
  pub version: String,
  pub description: Option<String>,
  pub commands_count: usize,
  pub widgets_count: usize,
  pub manifest_path: String,
}

#[derive(Debug, Serialize)]
pub struct PluginLoadError {
  pub path: String,
  pub message: String,
}

#[derive(Debug, Serialize)]
pub struct PluginLoaderResponse {
  pub plugins: Vec<LoadedPluginManifest>,
  pub errors: Vec<PluginLoadError>,
}

#[tauri::command]
pub async fn load_plugin_manifests(app_handle: tauri::AppHandle) -> Result<PluginLoaderResponse, String> {
  let home_dir = app_handle
    .path()
    .home_dir()
    .map_err(|error| format!("home_dir failed: {error}"))?;
  let plugins_dir = home_dir.join(".kikko").join("plugins");
  if !plugins_dir.exists() {
    return Ok(PluginLoaderResponse {
      plugins: Vec::new(),
      errors: Vec::new(),
    });
  }

  let mut plugins = Vec::new();
  let mut errors = Vec::new();
  let entries = fs::read_dir(&plugins_dir).map_err(|error| error.to_string())?;

  for entry in entries.flatten() {
    let path = entry.path();
    if !path.is_dir() {
      continue;
    }
    let manifest_path = path.join("manifest.json");
    if !manifest_path.exists() {
      continue;
    }

    let content = match fs::read_to_string(&manifest_path) {
      Ok(content) => content,
      Err(error) => {
        errors.push(PluginLoadError {
          path: manifest_path.to_string_lossy().to_string(),
          message: format!("Failed to read manifest: {error}"),
        });
        continue;
      }
    };

    let json: Value = match serde_json::from_str(&content) {
      Ok(json) => json,
      Err(error) => {
        errors.push(PluginLoadError {
          path: manifest_path.to_string_lossy().to_string(),
          message: format!("Invalid JSON: {error}"),
        });
        continue;
      }
    };

    let id = json
      .get("id")
      .and_then(Value::as_str)
      .map(str::trim)
      .filter(|value| !value.is_empty())
      .map(ToOwned::to_owned);
    let name = json
      .get("name")
      .and_then(Value::as_str)
      .map(str::trim)
      .filter(|value| !value.is_empty())
      .map(ToOwned::to_owned);
    let version = json
      .get("version")
      .and_then(Value::as_str)
      .map(str::trim)
      .filter(|value| !value.is_empty())
      .map(ToOwned::to_owned);

    let (Some(id), Some(name), Some(version)) = (id, name, version) else {
      errors.push(PluginLoadError {
        path: manifest_path.to_string_lossy().to_string(),
        message: "Manifest requires non-empty id, name and version".to_string(),
      });
      continue;
    };

    let commands_count = json
      .get("commands")
      .and_then(Value::as_array)
      .map(std::vec::Vec::len)
      .unwrap_or(0);
    let widgets_count = json
      .get("widgets")
      .and_then(Value::as_array)
      .map(std::vec::Vec::len)
      .unwrap_or(0);

    plugins.push(LoadedPluginManifest {
      id,
      name,
      version,
      description: json
        .get("description")
        .and_then(Value::as_str)
        .map(ToOwned::to_owned),
      commands_count,
      widgets_count,
      manifest_path: manifest_path.to_string_lossy().to_string(),
    });
  }

  Ok(PluginLoaderResponse { plugins, errors })
}
