# Shutdown Windows

Aplikasi desktop sederhana untuk menjadwalkan shutdown Windows dengan countdown timer.

## Fitur

- Preset waktu: 5, 10, 15, 30, 60 menit
- Input manual (1–1440 menit)
- Countdown real-time
- Batalkan shutdown kapan saja
- Jendela always-on-top selama countdown

## Prasyarat

- [Node.js](https://nodejs.org/) (LTS)
- [Rust](https://www.rust-lang.org/tools/install)
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (untuk Windows)
- WebView2 (sudah tersedia di Windows 10/11)

## Development

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Installer ada di `src-tauri/target/release/bundle/`.

## Catatan

Perintah `shutdown /s /t` dijalankan oleh Windows. Countdown tetap berjalan meskipun aplikasi ditutup — gunakan tombol **Batalkan Shutdown** untuk membatalkannya.
