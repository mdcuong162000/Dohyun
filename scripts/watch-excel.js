import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const EXCEL_FILE = "/Users/trangle/Downloads/BÁO CÁO TỔNG DOHYUN GROUP.xlsx";
const PARSER_SCRIPT = "/Users/trangle/.gemini/antigravity/brain/bab73d74-70b3-4630-b7f1-5d9460560be4/scratch/parse_excel.py";

console.log(`[Watcher] Khởi động giám sát file Excel: ${EXCEL_FILE}`);

let debounceTimer = null;

function runParser() {
  console.log(`[Watcher] Phát hiện thay đổi. Đang phân tích lại file Excel...`);
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
    if (stdout) {
      const lines = stdout.split('\n');
      const totalProcessed = lines.find(l => l.includes('Total processed records'));
      if (totalProcessed) console.log(`[Watcher] ${totalProcessed}`);
    }
  });
}

// Watch using fs.watch
// Excel saving can trigger multiple events (rename, change) very quickly. We debounce them.
try {
  // Watch the parent directory to handle Excel's temporary file creation/deletion mechanism safely
  const targetDir = path.dirname(EXCEL_FILE);
  const targetFile = path.basename(EXCEL_FILE);

  fs.watch(targetDir, (eventType, filename) => {
    if (filename === targetFile) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (fs.existsSync(EXCEL_FILE)) {
          runParser();
        }
      }, 500); // Debounce 500ms
    }
  });

  console.log(`[Watcher] Đang lắng nghe thay đổi của file Excel...`);
} catch (e) {
  console.error(`[Watcher] ❌ Không thể khởi động giám sát:`, e.message);
}
