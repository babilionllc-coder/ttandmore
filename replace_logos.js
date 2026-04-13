const fs = require('fs');
const path = require('path');

const directory = '.';
const purpleLogo = 'https://ttandmore.com/wp-content/uploads/2024/09/logo-moradoTTMORE-1.png';
const whiteLogo = 'https://ttandmore.com/wp-content/uploads/2024/09/logo-blancoTTMORE.png';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.html')) {
        results.push(file);
      }
    }
  });
  return results;
}

const htmlFiles = walk(directory);

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes(purpleLogo)) {
    content = content.split(purpleLogo).join('/logo.avif');
    changed = true;
  }
  if (content.includes(whiteLogo)) {
    content = content.split(whiteLogo).join('/logo-white.png');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated logos in:', file);
  }
});
