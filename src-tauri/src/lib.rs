use std::process::Command;

use tauri::Manager;

fn run_shutdown(args: &[&str]) -> Result<(), String> {
    let output = Command::new("shutdown")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run shutdown command: {e}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let msg = String::from_utf8_lossy(&output.stderr);
        let msg = msg.trim();
        if msg.is_empty() {
            Err("Shutdown command failed".to_string())
        } else {
            Err(msg.to_string())
        }
    }
}

#[tauri::command]
fn schedule_shutdown(seconds: u64) -> Result<(), String> {
    if seconds == 0 {
        return Err("Duration must be greater than 0 seconds".to_string());
    }

    let _ = run_shutdown(&["/a"]);

    let seconds_str = seconds.to_string();
    run_shutdown(&["/s", "/t", &seconds_str])
}

#[tauri::command]
fn cancel_shutdown() -> Result<(), String> {
    run_shutdown(&["/a"])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_maximizable(false);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![schedule_shutdown, cancel_shutdown])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
