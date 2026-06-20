const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;

const PRESETS = [5, 10, 15, 30, 60];
const MAX_MINUTES = 1440;

let selectedMinutes = null;
let countdownInterval = null;
let endTime = null;
let countdownActive = false;

const setupSection = document.getElementById("setup-section");
const countdownSection = document.getElementById("countdown-section");
const presetButtons = document.querySelectorAll(".preset-btn");
const customInput = document.getElementById("custom-minutes");
const selectionHint = document.getElementById("selection-hint");
const startBtn = document.getElementById("start-btn");
const cancelBtn = document.getElementById("cancel-btn");
const countdownDisplay = document.getElementById("countdown-display");
const countdownShutdownAt = document.getElementById("countdown-shutdown-at");
const countdownStatus = document.getElementById("countdown-status");
const toastEl = document.getElementById("toast");
const toastTextEl = document.getElementById("toast-text");
const toastCloseBtn = document.getElementById("toast-close");
const toastProgressBar = document.getElementById("toast-progress-bar");

const TOAST_AUTO_DISMISS_MS = 5000;
let toastTimeout = null;

function clearToastTimeout() {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
}

function restartToastProgress() {
  toastProgressBar.classList.remove("toast-progress-active");
  void toastProgressBar.offsetWidth;
  toastProgressBar.style.animationDuration = `${TOAST_AUTO_DISMISS_MS}ms`;
  toastProgressBar.classList.add("toast-progress-active");
}

function showMessage(text, type = "info") {
  clearToastTimeout();
  toastTextEl.textContent = text;
  toastEl.className = `toast toast-visible ${type}`;
  toastEl.hidden = false;
  restartToastProgress();
  toastTimeout = setTimeout(clearMessage, TOAST_AUTO_DISMISS_MS);
}

function clearMessage() {
  clearToastTimeout();
  toastTextEl.textContent = "";
  toastProgressBar.classList.remove("toast-progress-active");
  toastEl.className = "toast";
  toastEl.hidden = true;
}

function updatePresetSelection() {
  presetButtons.forEach((btn) => {
    const minutes = Number(btn.dataset.minutes);
    btn.classList.toggle("selected", selectedMinutes === minutes && !customInput.value);
  });
}

function updateStartButton() {
  const valid = selectedMinutes !== null && selectedMinutes >= 1 && selectedMinutes <= MAX_MINUTES;
  startBtn.disabled = !valid;

  if (valid) {
    selectionHint.textContent = `Shutdown scheduled: ${selectedMinutes} minutes`;
  } else {
    selectionHint.textContent = "Pick a preset or enter a custom duration";
  }
}

function selectPreset(minutes) {
  selectedMinutes = minutes;
  customInput.value = "";
  updatePresetSelection();
  updateStartButton();
  clearMessage();
}

function handleCustomInput() {
  presetButtons.forEach((btn) => btn.classList.remove("selected"));

  const value = customInput.value.trim();
  if (value === "") {
    selectedMinutes = null;
    updateStartButton();
    return;
  }

  const minutes = parseInt(value, 10);
  if (isNaN(minutes) || minutes < 1) {
    selectedMinutes = null;
    selectionHint.textContent = "Enter at least 1 minute";
    startBtn.disabled = true;
    return;
  }

  if (minutes > MAX_MINUTES) {
    selectedMinutes = null;
    selectionHint.textContent = `Maximum ${MAX_MINUTES} minutes (24 hours)`;
    startBtn.disabled = true;
    return;
  }

  selectedMinutes = minutes;
  updateStartButton();
  clearMessage();
}

function formatShutdownDateTime(timestamp) {
  const date = new Date(timestamp);
  const day = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
  const datePart = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  return `${day}, ${datePart} · ${timePart}`;
}

function updateShutdownAtDisplay() {
  countdownShutdownAt.textContent = endTime ? formatShutdownDateTime(endTime) : "";
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

function updateCountdownDisplay() {
  const remainingMs = endTime - Date.now();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  countdownDisplay.textContent = formatTime(remainingSeconds);
  countdownDisplay.classList.remove("urgent", "critical");

  if (remainingSeconds <= 10) {
    countdownDisplay.classList.add("critical");
  } else if (remainingSeconds <= 60) {
    countdownDisplay.classList.add("urgent");
  }

  if (remainingSeconds <= 0) {
    clearInterval(countdownInterval);
    countdownInterval = null;
    countdownDisplay.textContent = "00:00";
    countdownStatus.textContent = "Shutting down...";
    cancelBtn.disabled = true;
  }
}

async function setAlwaysOnTop(enabled) {
  await getCurrentWindow().setAlwaysOnTop(enabled);
}

async function setWindowLocked(locked) {
  const win = getCurrentWindow();
  await win.setClosable(!locked);
  await win.setMinimizable(!locked);
}

function showCountdownView() {
  setupSection.classList.add("hidden");
  countdownSection.classList.remove("hidden");
  cancelBtn.disabled = false;
}

function showSetupView() {
  setupSection.classList.remove("hidden");
  countdownSection.classList.add("hidden");
  countdownDisplay.classList.remove("urgent", "critical");
  countdownShutdownAt.textContent = "";
  countdownStatus.textContent = "";
  cancelBtn.disabled = false;
}

async function resetState() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  endTime = null;
  countdownActive = false;
  await setWindowLocked(false);
  showSetupView();
}

async function startShutdown() {
  if (!selectedMinutes || selectedMinutes < 1) return;

  clearMessage();
  startBtn.disabled = true;

  try {
    const seconds = selectedMinutes * 60;
    await invoke("schedule_shutdown", { seconds });

    endTime = Date.now() + seconds * 1000;
    countdownActive = true;

    await setAlwaysOnTop(true);
    await setWindowLocked(true);
    showCountdownView();
    updateShutdownAtDisplay();
    updateCountdownDisplay();
    countdownInterval = setInterval(updateCountdownDisplay, 1000);
  } catch (err) {
    showMessage(String(err), "error");
    startBtn.disabled = false;
  }
}

async function cancelShutdown() {
  clearMessage();
  cancelBtn.disabled = true;

  try {
    await invoke("cancel_shutdown");
    await setAlwaysOnTop(false);
    await resetState();
    updateStartButton();
    showMessage("Shutdown cancelled successfully", "info");
  } catch (err) {
    showMessage(String(err), "error");
    cancelBtn.disabled = false;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectPreset(Number(btn.dataset.minutes));
    });
  });

  customInput.addEventListener("input", handleCustomInput);
  startBtn.addEventListener("click", startShutdown);
  cancelBtn.addEventListener("click", cancelShutdown);
  toastCloseBtn.addEventListener("click", clearMessage);

  updateStartButton();
});
