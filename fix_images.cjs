const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let count = 0;
walkDir('/Users/mac/Desktop/Websites/ttandmore/src', function(filePath) {
  if (filePath.endsWith('.html')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('.avif')) {
      content = content.replace(/\.avif/g, '.webp');
      fs.writeFileSync(filePath, content, 'utf8');
      count++;
    }
  }
});

console.log(`Successfully replaced .avif with .webp in ${count} HTML files.`);
