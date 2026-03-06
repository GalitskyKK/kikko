use serde::Deserialize;
use serde::Serialize;
use std::process::Command;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Не показывать окно консоли при запуске процесса (Windows).
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Deserialize)]
pub struct RunSystemCommandInput {
  pub command: String,
  pub args: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct RunSystemCommandOutput {
  pub exit_code: i32,
  pub supported: bool,
  pub message: Option<String>,
}

#[tauri::command]
pub async fn open_system_preferences(section_id: String) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    let uri = match section_id.as_str() {
      "display" => "ms-settings:display",
      "sound" => "ms-settings:sound",
      "bluetooth" => "ms-settings:bluetooth",
      "network-ethernet" => "ms-settings:network-ethernet",
      "network-wifi" => "ms-settings:network-wifi",
      "network" => "ms-settings:network",
      "appsfeatures" => "ms-settings:appsfeatures",
      _ => return Err(format!("Unknown settings section: {}", section_id)),
    };

    Command::new("cmd")
      .creation_flags(CREATE_NO_WINDOW)
      .args(["/C", "start", "", uri])
      .status()
      .map_err(|error| error.to_string())?;
    return Ok(());
  }

  #[cfg(not(target_os = "windows"))]
  #[cfg(target_os = "macos")]
  {
    let uri = match section_id.as_str() {
      "display" => "x-apple.systempreferences:com.apple.Displays-Settings.extension",
      "sound" => "x-apple.systempreferences:com.apple.Sound-Settings.extension",
      "bluetooth" => "x-apple.systempreferences:com.apple.BluetoothSettings",
      "network" => "x-apple.systempreferences:com.apple.Network-Settings.extension",
      "appsfeatures" => "x-apple.systempreferences:com.apple.Desktop-Settings.extension?Applications",
      _ => return Err(format!("Unknown settings section: {}", section_id)),
    };
    Command::new("open")
      .arg(uri)
      .status()
      .map_err(|error| error.to_string())?;
    return Ok(());
  }

  #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
  {
    let _ = section_id;
    Err("open_system_preferences is not available on this OS".to_string())
  }
}

#[tauri::command]
pub async fn run_system_command(input: RunSystemCommandInput) -> Result<RunSystemCommandOutput, String> {
  let (exit_code, supported, message) = match input.command.as_str() {
    "cmd-lock" => (run_lock(), true, None),
    "cmd-sleep" => (run_sleep(), true, None),
    "cmd-trash" => (run_empty_trash(), true, None),
    "cmd-volume-up" => run_volume_up(),
    "cmd-volume-down" => run_volume_down(),
    "cmd-volume-mute" => run_volume_mute(),
    "cmd-volume-set" => run_volume_set(&input.args),
    "cmd-restart" => run_restart(),
    "cmd-shutdown" => run_shutdown(),
    _ => return Err(format!("Unknown command: {}", input.command)),
  };
  Ok(RunSystemCommandOutput {
    exit_code,
    supported,
    message,
  })
}

#[tauri::command]
pub async fn open_windows_settings(section_id: String) -> Result<(), String> {
  open_system_preferences(section_id).await
}

/// Возвращает платформу: "windows" | "macos" | "linux" (для условной логики на фронте).
#[tauri::command]
pub fn get_platform() -> &'static str {
  std::env::consts::OS
}

/// Завершает приложение (для пункта «Выход» в трее).
#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) {
  app.exit(0);
}

/// Выполняет действие по ID (для кастомных глобальных шорткатов).
#[tauri::command]
pub async fn run_shortcut_action(action_id: String) -> Result<(), String> {
  match action_id.as_str() {
    "system:lock" => {
      let _ = run_lock();
      Ok(())
    }
    "system:empty-trash" => {
      let _ = run_empty_trash();
      Ok(())
    }
    "system:sleep" => {
      let _ = run_sleep();
      Ok(())
    }
    _ => Err(format!("Unknown shortcut action: {}", action_id)),
  }
}

/// Показать/скрыть палетку (вызов с фронта при нажатии глобального шортката).
#[tauri::command]
pub async fn show_palette_or_toggle(app: tauri::AppHandle) -> Result<(), String> {
  let window = app
    .get_webview_window("main")
    .ok_or_else(|| "main window not found".to_string())?;
  let visible = window.is_visible().unwrap_or(false);
  if visible {
    let _ = window.hide();
  } else {
    let _ = window.set_size(tauri::PhysicalSize::new(760, 500));
    if let Ok(Some(monitor)) = window.current_monitor() {
      let monitor_size = monitor.size();
      let target_width: i32 = 760;
      let x = ((monitor_size.width as i32 - target_width) / 2).max(0);
      let y = 86;
      let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
    }
    let _ = window.show();
    let _ = window.set_focus();
  }
  Ok(())
}

#[cfg(target_os = "windows")]
fn run_lock() -> i32 {
  Command::new("rundll32.exe")
    .creation_flags(CREATE_NO_WINDOW)
    .args(["user32.dll,LockWorkStation"])
    .status()
    .map(|s| s.code().unwrap_or(-1))
    .unwrap_or(-1)
}

#[cfg(target_os = "windows")]
fn run_sleep() -> i32 {
  Command::new("rundll32.exe")
    .creation_flags(CREATE_NO_WINDOW)
    .args(["powrprof.dll,SetSuspendState", "0", "1", "0"])
    .status()
    .map(|s| s.code().unwrap_or(-1))
    .unwrap_or(-1)
}

#[cfg(target_os = "windows")]
fn run_empty_trash() -> i32 {
  Command::new("powershell")
    .creation_flags(CREATE_NO_WINDOW)
    .args(["-NoProfile", "-Command", "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"])
    .status()
    .map(|s| s.code().unwrap_or(-1))
    .unwrap_or(-1)
}

#[cfg(target_os = "windows")]
fn run_volume_up() -> (i32, bool, Option<String>) {
  (
    Command::new("powershell")
      .creation_flags(CREATE_NO_WINDOW)
      .args([
        "-NoProfile",
        "-Command",
        "(New-Object -ComObject WScript.Shell).SendKeys([char]175)",
      ])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    None,
  )
}

#[cfg(target_os = "windows")]
fn run_volume_down() -> (i32, bool, Option<String>) {
  (
    Command::new("powershell")
      .creation_flags(CREATE_NO_WINDOW)
      .args([
        "-NoProfile",
        "-Command",
        "(New-Object -ComObject WScript.Shell).SendKeys([char]174)",
      ])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    None,
  )
}

#[cfg(target_os = "windows")]
fn run_volume_mute() -> (i32, bool, Option<String>) {
  match Command::new("powershell")
    .creation_flags(CREATE_NO_WINDOW)
    .args([
      "-NoProfile",
      "-Command",
      "(New-Object -ComObject WScript.Shell).SendKeys([char]173)",
    ])
    .status()
  {
    Ok(status) => (status.code().unwrap_or(-1), true, None),
    Err(_) => (-1, false, Some("Mute toggle is unavailable".to_string())),
  }
}

#[cfg(target_os = "windows")]
fn run_volume_set(args: &[String]) -> (i32, bool, Option<String>) {
  let level = args
    .first()
    .and_then(|value| value.parse::<u8>().ok())
    .map(|value| value.min(100));
  let Some(level) = level else {
    return (-1, false, Some("Invalid volume preset".to_string()));
  };
  let scalar = (level as f32) / 100.0;
  let script = format!(
    r#"
if (-not ("AudioEndpointVolume" -as [type])) {{
  $code = @"
using System;
using System.Runtime.InteropServices;

public static class AudioEndpointVolume {{
  [ComImport]
  [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
  private class MMDeviceEnumerator {{ }}

  [ComImport]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
  private interface IMMDeviceEnumerator {{
    int NotImpl1();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
  }}

  [ComImport]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  [Guid("D666063F-1587-4E43-81F1-B948E807363F")]
  private interface IMMDevice {{
    int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, out IAudioEndpointVolume ppInterface);
  }}

  [ComImport]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  [Guid("5CDF2C82-841E-4546-9722-0CF74078229A")]
  private interface IAudioEndpointVolume {{
    int RegisterControlChangeNotify(IntPtr pNotify);
    int UnregisterControlChangeNotify(IntPtr pNotify);
    int GetChannelCount(out uint channelCount);
    int SetMasterVolumeLevel(float levelDB, Guid eventContext);
    int SetMasterVolumeLevelScalar(float level, Guid eventContext);
    int GetMasterVolumeLevel(out float levelDB);
    int GetMasterVolumeLevelScalar(out float level);
    int SetChannelVolumeLevel(uint channelNumber, float levelDB, Guid eventContext);
    int SetChannelVolumeLevelScalar(uint channelNumber, float level, Guid eventContext);
    int GetChannelVolumeLevel(uint channelNumber, out float levelDB);
    int GetChannelVolumeLevelScalar(uint channelNumber, out float level);
    int SetMute(bool isMuted, Guid eventContext);
    int GetMute(out bool isMuted);
    int GetVolumeStepInfo(out uint step, out uint stepCount);
    int VolumeStepUp(Guid eventContext);
    int VolumeStepDown(Guid eventContext);
    int QueryHardwareSupport(out uint hardwareSupportMask);
    int GetVolumeRange(out float volumeMindB, out float volumeMaxdB, out float volumeIncrementdB);
  }}

  public static void SetVolume(float level) {{
    var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
    IMMDevice device;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
    var iid = typeof(IAudioEndpointVolume).GUID;
    IAudioEndpointVolume endpoint;
    Marshal.ThrowExceptionForHR(device.Activate(ref iid, 23, IntPtr.Zero, out endpoint));
    Marshal.ThrowExceptionForHR(endpoint.SetMasterVolumeLevelScalar(level, Guid.Empty));
  }}
}}
"@
  Add-Type -TypeDefinition $code -Language CSharp
}}
[AudioEndpointVolume]::SetVolume({:.4})
"#,
    scalar
  );
  match Command::new("powershell")
    .creation_flags(CREATE_NO_WINDOW)
    .args(["-NoProfile", "-Command", &script])
    .status()
  {
    Ok(status) => (status.code().unwrap_or(-1), true, Some(format!("Volume set to {}%", level))),
    Err(_) => (-1, false, Some("Volume preset is unavailable".to_string())),
  }
}

#[cfg(target_os = "windows")]
fn run_restart() -> (i32, bool, Option<String>) {
  (
    Command::new("shutdown")
      .creation_flags(CREATE_NO_WINDOW)
      .args(["/r", "/t", "0"])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    Some("Restart requested".to_string()),
  )
}

#[cfg(target_os = "windows")]
fn run_shutdown() -> (i32, bool, Option<String>) {
  (
    Command::new("shutdown")
      .creation_flags(CREATE_NO_WINDOW)
      .args(["/s", "/t", "0"])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    Some("Shutdown requested".to_string()),
  )
}

#[cfg(target_os = "macos")]
fn run_lock() -> i32 {
  Command::new("pmset")
    .args(["displaysleepnow"])
    .status()
    .map(|s| s.code().unwrap_or(-1))
    .unwrap_or(-1)
}

#[cfg(target_os = "macos")]
fn run_sleep() -> i32 {
  Command::new("pmset")
    .args(["sleepnow"])
    .status()
    .map(|s| s.code().unwrap_or(-1))
    .unwrap_or(-1)
}

#[cfg(target_os = "macos")]
fn run_empty_trash() -> i32 {
  let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
  Command::new("rm")
    .args(["-rf", &format!("{}/.Trash/*", home)])
    .status()
    .map(|s| s.code().unwrap_or(-1))
    .unwrap_or(-1)
}

#[cfg(target_os = "macos")]
fn run_volume_up() -> (i32, bool, Option<String>) {
  (
    Command::new("osascript")
      .args(["-e", "set volume output volume ((output volume of (get volume settings)) + 6)"])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    None,
  )
}

#[cfg(target_os = "macos")]
fn run_volume_down() -> (i32, bool, Option<String>) {
  (
    Command::new("osascript")
      .args(["-e", "set volume output volume ((output volume of (get volume settings)) - 6)"])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    None,
  )
}

#[cfg(target_os = "macos")]
fn run_volume_mute() -> (i32, bool, Option<String>) {
  match Command::new("osascript")
    .args(["-e", "set volume output muted not (output muted of (get volume settings))"])
    .status()
  {
    Ok(status) => (status.code().unwrap_or(-1), true, None),
    Err(_) => (-1, false, Some("Mute toggle is unavailable".to_string())),
  }
}

#[cfg(target_os = "macos")]
fn run_volume_set(args: &[String]) -> (i32, bool, Option<String>) {
  let level = args
    .first()
    .and_then(|value| value.parse::<u8>().ok())
    .map(|value| value.min(100));
  let Some(level) = level else {
    return (-1, false, Some("Invalid volume preset".to_string()));
  };
  let script = format!("set volume output volume {}", level);
  match Command::new("osascript").args(["-e", &script]).status() {
    Ok(status) => (status.code().unwrap_or(-1), true, Some(format!("Volume set to {}%", level))),
    Err(_) => (-1, false, Some("Volume preset is unavailable".to_string())),
  }
}

#[cfg(target_os = "macos")]
fn run_restart() -> (i32, bool, Option<String>) {
  (
    Command::new("osascript")
      .args(["-e", "tell app \"System Events\" to restart"])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    Some("Restart requested".to_string()),
  )
}

#[cfg(target_os = "macos")]
fn run_shutdown() -> (i32, bool, Option<String>) {
  (
    Command::new("osascript")
      .args(["-e", "tell app \"System Events\" to shut down"])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    Some("Shutdown requested".to_string()),
  )
}

#[cfg(target_os = "linux")]
fn run_lock() -> i32 {
  Command::new("xdg-screensaver")
    .args(["lock"])
    .status()
    .map(|s| s.code().unwrap_or(-1))
    .unwrap_or(-1)
}

#[cfg(target_os = "linux")]
fn run_sleep() -> i32 {
  Command::new("systemctl")
    .args(["suspend"])
    .status()
    .map(|s| s.code().unwrap_or(-1))
    .unwrap_or(-1)
}

#[cfg(target_os = "linux")]
fn run_empty_trash() -> i32 {
  let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
  Command::new("rm")
    .args(["-rf", &format!("{}/.local/share/Trash/files/*", home)])
    .status()
    .map(|s| s.code().unwrap_or(-1))
    .unwrap_or(-1)
}

#[cfg(target_os = "linux")]
fn run_volume_up() -> (i32, bool, Option<String>) {
  (
    Command::new("pactl")
      .args(["set-sink-volume", "@DEFAULT_SINK@", "+5%"])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    None,
  )
}

#[cfg(target_os = "linux")]
fn run_volume_down() -> (i32, bool, Option<String>) {
  (
    Command::new("pactl")
      .args(["set-sink-volume", "@DEFAULT_SINK@", "-5%"])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    None,
  )
}

#[cfg(target_os = "linux")]
fn run_volume_mute() -> (i32, bool, Option<String>) {
  match Command::new("pactl")
    .args(["set-sink-mute", "@DEFAULT_SINK@", "toggle"])
    .status()
  {
    Ok(status) => (status.code().unwrap_or(-1), true, None),
    Err(_) => (-1, false, Some("Mute toggle is unavailable".to_string())),
  }
}

#[cfg(target_os = "linux")]
fn run_volume_set(args: &[String]) -> (i32, bool, Option<String>) {
  let level = args
    .first()
    .and_then(|value| value.parse::<u8>().ok())
    .map(|value| value.min(100));
  let Some(level) = level else {
    return (-1, false, Some("Invalid volume preset".to_string()));
  };
  let target = format!("{}%", level);
  match Command::new("pactl")
    .args(["set-sink-volume", "@DEFAULT_SINK@", &target])
    .status()
  {
    Ok(status) => (status.code().unwrap_or(-1), true, Some(format!("Volume set to {}%", level))),
    Err(_) => (-1, false, Some("Volume preset is unavailable".to_string())),
  }
}

#[cfg(target_os = "linux")]
fn run_restart() -> (i32, bool, Option<String>) {
  (
    Command::new("systemctl")
      .args(["reboot"])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    Some("Restart requested".to_string()),
  )
}

#[cfg(target_os = "linux")]
fn run_shutdown() -> (i32, bool, Option<String>) {
  (
    Command::new("systemctl")
      .args(["poweroff"])
      .status()
      .map(|s| s.code().unwrap_or(-1))
      .unwrap_or(-1),
    true,
    Some("Shutdown requested".to_string()),
  )
}
