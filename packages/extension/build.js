// Simple build script for FundTracer Extension
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Files to copy
const files = [
  'manifest.json',
  'popup/popup.html',
  'popup/popup.css',
  'popup/popup.js',
  'background/background.js',
  'content/content.js'
];

console.log('Building extension...');
for (const file of files) {
  const src = path.join(srcDir, file);
  const dest = path.join(distDir, file);
  
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Copied:', file);
  } else {
    console.log('Warning:', file, 'not found');
  }
}

// Copy icons directory
const iconsDir = path.join(distDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy logo from web package
const logoSrc = path.join(__dirname, '../web/public/logo.png');
const logoDest = path.join(distDir, 'popup/logo.png');
if (fs.existsSync(logoSrc)) {
  fs.copyFileSync(logoSrc, logoDest);
  console.log('Copied: popup/logo.png');
}

console.log('\nExtension built successfully!');
console.log('Output:', distDir);
console.log('\nTo load in Chrome:');
console.log('1. Go to chrome://extensions/');
console.log('2. Enable Developer mode');
console.log('3. Click "Load unpacked"');
console.log('4. Select the', distDir, 'folder');
