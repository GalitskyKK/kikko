#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod commands;
mod db;

use std::sync::Arc;
use std::sync::Mutex;
use tauri::PhysicalPosition;
use tauri::PhysicalSize;

use tauri::Emitter;
use tauri::Manager;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_sql::{Migration, MigrationKind};

fn move_palette_top_center(window: &tauri::WebviewWindow) {
  if let Ok(Some(monitor)) = window.current_monitor() {
    let monitor_size = monitor.size();
    let target_width: i32 = 760;
    let x = ((monitor_size.width as i32 - target_width) / 2).max(0);
    let y = 86;
    let _ = window.set_position(PhysicalPosition::new(x, y));
  }
}

fn main() {
  let palette_shortcut = Shortcut::new(
    Some(Modifiers::SUPER | Modifiers::SHIFT),
    Code::KeyK,
  );
  let dashboard_shortcut = Shortcut::new(Some(Modifiers::SUPER), Code::KeyJ);
  let settings_shortcut = Shortcut::new(
    Some(Modifiers::SUPER | Modifiers::SHIFT),
    Code::Comma,
  );

  let clipboard_migrations = vec![Migration {
    version: 1,
    description: "clipboard_entries",
    sql: db::schema::SCHEMA_SQL,
    kind: MigrationKind::Up,
  }, Migration {
    version: 2,
    description: "clipboard_assets_and_indexes",
    sql: db::schema::SCHEMA_SQL_V2,
    kind: MigrationKind::Up,
  }];

  tauri::Builder::default()
    .plugin(
      tauri_plugin_global_shortcut::Builder::new()
        .with_shortcuts([
          palette_shortcut.clone(),
          dashboard_shortcut.clone(),
          settings_shortcut.clone(),
        ])
        .expect("invalid shortcut")
        .with_handler(move |app, shortcut, event| {
          if event.state != ShortcutState::Pressed {
            return;
          }
          if shortcut == &palette_shortcut {
            if let Some(window) = app.get_webview_window("main") {
              if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
              } else {
                let _ = window.set_size(PhysicalSize::new(760, 500));
                move_palette_top_center(&window);
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
          } else if shortcut == &dashboard_shortcut {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.emit("navigate-to", "/dashboard");
            }
          } else if shortcut == &settings_shortcut {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.emit("navigate-to", "/settings");
            }
          }
        })
        .build(),
    )
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(
      tauri_plugin_sql::Builder::default()
        .add_migrations("sqlite:kikko.db", clipboard_migrations)
        .build(),
    )
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_autostart::init(
      tauri_plugin_autostart::MacosLauncher::LaunchAgent,
      None,
    ))
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![
      commands::clipboard::get_clipboard_history,
      commands::clipboard::add_clipboard_entry,
      commands::clipboard::capture_clipboard_entry,
      commands::clipboard::toggle_favorite,
      commands::clipboard::toggle_pinned,
      commands::clipboard::delete_entry,
      commands::clipboard::clear_history,
      commands::clipboard::write_clipboard_entry,
      commands::clipboard::get_clipboard_asset_bytes,
      commands::apps::get_installed_apps,
      commands::apps::get_app_icon_png,
      commands::apps::get_path_icon_png,
      commands::apps::open_path,
      commands::files::search_files,
      commands::plugins::load_plugin_manifests,
      commands::system::run_system_command,
      commands::system::open_system_preferences,
      commands::system::open_windows_settings,
      commands::snippets::get_snippets,
      commands::snippets::create_snippet,
      commands::snippets::update_snippet,
      commands::snippets::delete_snippet,
      commands::snippets::mark_snippet_used,
      commands::quicklinks::get_quicklinks,
      commands::quicklinks::create_quicklink,
      commands::quicklinks::update_quicklink,
      commands::quicklinks::delete_quicklink,
      commands::system::exit_app,
      commands::system::show_palette_or_toggle,
    ])
    .setup(|app| {
      db::initialize(&app.handle())?;

      let db_path = app.path().app_config_dir().map_err(|e| e.to_string())?.join("kikko.db");
      let cache_dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
      if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
      }
      std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
      let last_signature = Arc::new(Mutex::new(String::new()));
      let state = commands::clipboard::ClipboardState {
        db_path,
        cache_dir,
        last_signature: Arc::clone(&last_signature),
      };
      app.manage(state);

      // Clipboard polling выполняется на фронте (readText + add_clipboard_entry), Rust polling отключён

      // Трей: нативное меню (Show, Settings, Quit), иконка из бандла
      let show_item = MenuItem::with_id(app, "tray-show", "Show Kikkō", true, None::<&str>)?;
      let settings_item = MenuItem::with_id(app, "tray-settings", "Settings", true, None::<&str>)?;
      let separator = PredefinedMenuItem::separator(app)?;
      let quit_item = MenuItem::with_id(app, "tray-quit", "Quit", true, None::<&str>)?;
      let menu = Menu::with_items(
        app,
        &[&show_item, &settings_item, &separator, &quit_item],
      )?;
      let show_id = show_item.id().clone();
      let settings_id = settings_item.id().clone();
      let quit_id = quit_item.id().clone();
      let img = image::load_from_memory(include_bytes!("../icons/icon.png"))
        .map_err(|e| e.to_string())?;
      let rgba = img.to_rgba8();
      let (w, h) = (rgba.width(), rgba.height());
      let tray_icon = tauri::image::Image::new_owned(rgba.into_raw(), w, h);
      let builder = {
        let b = TrayIconBuilder::new()
          .icon(tray_icon)
          .menu(&menu)
          .tooltip("Kikkō")
          .on_menu_event(move |app, event| {
            if event.id() == &show_id {
              if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_size(PhysicalSize::new(760, 500));
                move_palette_top_center(&w);
                let _ = w.show();
                let _ = w.set_focus();
              }
            } else if event.id() == &settings_id {
              if let Some(w) = app.get_webview_window("main") {
                let _ = w.emit("navigate-to", "/settings");
                let _ = w.show();
                let _ = w.set_focus();
              }
            } else if event.id() == &quit_id {
              app.exit(0);
            }
          });
        #[cfg(target_os = "macos")]
        let b = b.menu_on_left_click(false);
        b
      };
      builder.build(app)?;

      #[cfg(target_os = "macos")]
      {
        app.set_activation_policy(tauri::ActivationPolicy::Accessory);
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("Error while running Kikkō");
}
