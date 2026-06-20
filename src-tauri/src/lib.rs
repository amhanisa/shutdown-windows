use std::process::Command;
use std::sync::Mutex;

use tauri::{Manager, WindowEvent};

struct CountdownState(Mutex<bool>);

fn run_shutdown(args: &[&str]) -> Result<(), String> {
    let mut command = Command::new("shutdown");
    command.args(args);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let output = command
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
fn schedule_shutdown(seconds: u64, state: tauri::State<'_, CountdownState>) -> Result<(), String> {
    if seconds == 0 {
        return Err("Duration must be greater than 0 seconds".to_string());
    }

    let _ = run_shutdown(&["/a"]);

    let seconds_str = seconds.to_string();
    run_shutdown(&["/s", "/t", &seconds_str])?;
    *state.0.lock().unwrap() = true;
    Ok(())
}

#[tauri::command]
fn cancel_shutdown(state: tauri::State<'_, CountdownState>) -> Result<(), String> {
    run_shutdown(&["/a"])?;
    *state.0.lock().unwrap() = false;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(CountdownState(Mutex::new(false)))
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_maximizable(false);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let countdown_active = *window.state::<CountdownState>().0.lock().unwrap();
                if countdown_active {
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![schedule_shutdown, cancel_shutdown])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
