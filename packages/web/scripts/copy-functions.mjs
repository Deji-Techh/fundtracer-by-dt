import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`⚠️  Source not found: ${src}`);
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'functions');
const distDir = path.join(rootDir, 'dist');

copyDir(srcDir, distDir);
console.log('✅ Copied functions to dist');

const routesSrc = path.join(rootDir, 'public/_routes.json');
const routesDest = path.join(distDir, '_routes.json');
if (fs.existsSync(routesSrc)) {
  fs.copyFileSync(routesSrc, routesDest);
  console.log('✅ Copied _routes.json to dist');
}