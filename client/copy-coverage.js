import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const today = new Date();
const dd = String(today.getDate()).padStart(2, '0');
const mm = String(today.getMonth() + 1).padStart(2, '0');
const folderName = `${dd}-${mm}`;

const srcDir = path.join(__dirname, 'coverage');
const destDir = path.join(__dirname, '..', 'docs', folderName, 'client');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  if (fs.existsSync(srcDir)) {
    copyDir(srcDir, destDir);
    console.log(`[Success] Coverage report copied successfully to docs/${folderName}/client`);
  } else {
    console.error(`[Error] Source coverage directory not found: ${srcDir}`);
  }
} catch (err) {
  console.error('[Error] Failed to copy coverage directory:', err);
}
