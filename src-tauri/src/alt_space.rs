//! На Windows Alt+Space зарезервировано системой; RegisterHotKey его не перехватывает.
//! Используем низкоуровневый хук (win-hotkeys) только для комбинации Alt+Space.

#[cfg(target_os = "windows")]
use std::sync::Mutex;
#[cfg(target_os = "windows")]
use std::thread::{self, JoinHandle};
#[cfg(target_os = "windows")]
use tauri::Emitter;
#[cfg(target_os = "windows")]
use win_hotkeys::HotkeyManager;
#[cfg(target_os = "windows")]
use win_hotkeys::InterruptHandle;
#[cfg(target_os = "windows")]
use win_hotkeys::VKey;

#[cfg(target_os = "windows")]
pub struct AltSpaceState {
  /// Хук палетки (Alt+Space → trigger-palette).
  pub inner: Mutex<Option<(JoinHandle<()>, InterruptHandle)>>,
  /// Поток записи шортката: при нажатии Alt+Space эмитится shortcut-recorded.
  pub recording: Mutex<Option<(JoinHandle<()>, InterruptHandle)>>,
}

#[cfg(target_os = "windows")]
impl AltSpaceState {
  pub fn new() -> Self {
    Self {
      inner: Mutex::new(None),
      recording: Mutex::new(None),
    }
  }

  pub fn set_enabled(&self, app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let mut guard = self.inner.lock().map_err(|e| e.to_string())?;
    if enabled {
      if guard.is_some() {
        return Ok(());
      }
      let app = app.clone();
      let mut hkm: HotkeyManager<()> = HotkeyManager::new();
      let app_clone = app.clone();
      hkm.register_hotkey(VKey::Space, &[VKey::Menu], move || {
        let _ = app_clone.emit("trigger-palette", ());
      })
      .map_err(|e| e.to_string())?;
      let interrupt = hkm.interrupt_handle();
      let join = thread::spawn(move || {
        hkm.event_loop();
      });
      *guard = Some((join, interrupt));
      Ok(())
    } else {
      if let Some((join, interrupt)) = guard.take() {
        interrupt.interrupt();
        let _ = join.join();
      }
      Ok(())
    }
  }

  /// Включает режим записи: отключает хук палетки, запускает поток, слушающий только Alt+Space.
  /// По нажатию Alt+Space эмитится "shortcut-recorded". Фронт должен вызвать stop_alt_space_recording.
  pub fn start_recording(&self, app: tauri::AppHandle) -> Result<(), String> {
    self.set_enabled(app.clone(), false)?;
    let mut rec = self.recording.lock().map_err(|e| e.to_string())?;
    if rec.is_some() {
      return Ok(());
    }
    let mut hkm: HotkeyManager<()> = HotkeyManager::new();
    let app_clone = app.clone();
    hkm.register_hotkey(VKey::Space, &[VKey::Menu], move || {
      let _ = app_clone.emit("shortcut-recorded", "Alt+Space");
    })
    .map_err(|e| e.to_string())?;
    let interrupt = hkm.interrupt_handle();
    let join = thread::spawn(move || {
      hkm.event_loop();
    });
    *rec = Some((join, interrupt));
    Ok(())
  }

  /// Останавливает режим записи и при необходимости снова включает хук палетки.
  pub fn stop_recording(&self, app: tauri::AppHandle, restore_palette_hook: bool) -> Result<(), String> {
    let mut rec = self.recording.lock().map_err(|e| e.to_string())?;
    if let Some((join, interrupt)) = rec.take() {
      interrupt.interrupt();
      drop(rec);
      let _ = join.join();
      return self.set_enabled(app, restore_palette_hook);
    }
    self.set_enabled(app, restore_palette_hook)
  }
}

#[cfg(not(target_os = "windows"))]
pub struct AltSpaceState {}

#[cfg(not(target_os = "windows"))]
impl AltSpaceState {
  pub fn new() -> Self {
    Self {}
  }

  pub fn set_enabled(&self, _app: tauri::AppHandle, _enabled: bool) -> Result<(), String> {
    Ok(())
  }

  pub fn start_recording(&self, _app: tauri::AppHandle) -> Result<(), String> {
    Ok(())
  }

  pub fn stop_recording(&self, _app: tauri::AppHandle, _restore_palette_hook: bool) -> Result<(), String> {
    Ok(())
  }
}

#[tauri::command]
pub fn set_alt_space_palette_enabled(
  state: tauri::State<'_, AltSpaceState>,
  app: tauri::AppHandle,
  enabled: bool,
) -> Result<(), String> {
  state.set_enabled(app, enabled)
}

#[tauri::command]
pub fn start_alt_space_recording(
  state: tauri::State<'_, AltSpaceState>,
  app: tauri::AppHandle,
) -> Result<(), String> {
  state.start_recording(app)
}

#[tauri::command]
pub fn stop_alt_space_recording(
  state: tauri::State<'_, AltSpaceState>,
  app: tauri::AppHandle,
  restore_palette_hook: bool,
) -> Result<(), String> {
  state.stop_recording(app, restore_palette_hook)
}
