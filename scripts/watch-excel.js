import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const DOWNLOADS_DIR = "/Users/trangle/Downloads";
const WATCHED_FILES = [
  "BIN ADS - 2026.xlsx",
  "Huehoo- ADS.xlsx",
  "MỤC TIÊU ADS PERFORMANCE (1).xlsx",
  "BÁO CÁO TỔNG DOHYUN GROUP (1).xlsx"
];
const PARSER_SCRIPT = "/Users/trangle/.gemini/antigravity/brain/bab73d74-70b3-4630-b7f1-5d9460560be4/scratch/parse_excel.py";

console.log(`[Watcher] Khởi động giám sát 4 tệp Excel...`);

let debounceTimer = null;

function runParser() {
  console.log(`[Watcher] Phát hiện thay đổi trong tệp Excel. Đang phân tích lại...`);
  exec(`python3 "${PARSER_SCRIPT}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Watcher] ❌ Lỗi khi phân tích Excel:`, error.message);
      return;
    }
    if (stderr && stderr.includes('Traceback')) {
      console.error(`[Watcher] ❌ Lỗi python script:\n`, stderr);
      return;
    }
    console.log(`[Watcher] ✅ Hoàn thành cập nhật dữ liệu mới!`);
  });
}

try {
  fs.watch(DOWNLOADS_DIR, (eventType, filename) => {
    if (filename && WATCHED_FILES.includes(filename)) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const fullPath = path.join(DOWNLOADS_DIR, filename);
        if (fs.existsSync(fullPath)) {
          console.log(`[Watcher] File thay đổi: ${filename}`);
          runParser();
        }
      }, 500); // Debounce 500ms
    }
  });

  console.log(`[Watcher] Đang lắng nghe thay đổi của các file:`, WATCHED_FILES);
} catch (e) {
  console.error(`[Watcher] ❌ Không thể khởi động giám sát:`, e.message);
}
