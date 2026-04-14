const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const publicDest = path.join(__dirname, 'public', 'dest-images');
if (!fs.existsSync(publicDest)) {
  fs.mkdirSync(publicDest, { recursive: true });
}

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const downloadAvif = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
      }
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
};

(async () => {
  let modifiedFilesCount = 0;
  const processedImages = new Set();
  
  const files = [];
  walkDir(__dirname, (filePath) => {
    if (filePath.endsWith('.html') && !filePath.includes('/node_modules/') && !filePath.includes('/dist/')) {
      files.push(filePath);
    }
  });

  for (const filePath of files) {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // The current state is https://ttandmore.com/wp-content/uploads/2026/02/NAME.webp
    // But the true file on server is .avif or .webp for cenote-ik-kil. 
    // We will match both .webp and .avif just in case.
    const regex = /https:\/\/ttandmore\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/([a-zA-Z0-9_-]+)\.(webp|avif|jpg)/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      const fullUrl = match[0];
      const filename = match[1];
      const originalExt = match[2];
      const newJpgPath = `/dest-images/${filename}.jpg`;
      
      // We know original images on WP were .avif (Except cenote-ik-kil which was .webp originally)
      let sourceUrl = `https://ttandmore.com/wp-content/uploads/2026/02/${filename}.avif`;
      if (filename === 'cenote-ik-kil') {
          sourceUrl = `https://ttandmore.com/wp-content/uploads/2026/02/${filename}.webp`;
      }

      if (!processedImages.has(filename)) {
        processedImages.add(filename);
        try {
          console.log(`Downloading ${sourceUrl}...`);
          const imgBuffer = await downloadAvif(sourceUrl);
          const outPath = path.join(publicDest, `${filename}.jpg`);
          await sharp(imgBuffer)
            .jpeg({ quality: 80, progressive: true })
            .toFile(outPath);
          console.log(`✅ Saved ${outPath}`);
        } catch (err) {
          console.error(`❌ Error downloading/converting ${filename}:`, err.message);
        }
      }

      // Replace URL in content
      content = content.replace(fullUrl, newJpgPath);
      hasChanges = true;
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFilesCount++;
    }
  }

  console.log(`Successfully migrated images in ${modifiedFilesCount} HTML files to local perfectly-compatible JPGs.`);
})();
