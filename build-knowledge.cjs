const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const outPath = path.join(__dirname, 'api', 'knowledge.json');

// Helper to recursively find HTML files
function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (!dirPath.includes('node_modules') && !dirPath.includes('dist')) {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

const extractText = (html) => {
  // Ultra-simple HTML cleaner for LLM consumption
  let text = html;
  
  // Remove scripts & styles completely
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Replace critical block-level tags with newlines before stripping to preserve structure
  text = text.replace(/<\/?(div|p|h[1-6]|li|section|article|header|footer|br\s*\/?)>/gi, '\n');
  
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Clean up whitespace
  text = text.replace(/\n\s+/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  return text.trim();
};

const buildKnowledgeBase = () => {
  const knowledge = {};

  walkDir(srcDir, (filePath) => {
    if (filePath.endsWith('.html')) {
      const htmlContent = fs.readFileSync(filePath, 'utf8');
      const textContent = extractText(htmlContent);
      
      // Determine the relative URL route for this file
      let relPath = filePath.replace(srcDir, '').replace(/\\/g, '/');
      if (relPath.endsWith('index.html')) {
        relPath = relPath.replace('index.html', '');
      }
      
      if (!relPath.startsWith('/')) relPath = '/' + relPath;
      
      // Group by language to assist AI routing context
      const isSpanish = relPath.startsWith('/es/');
      const key = isSpanish ? 'Spanish Site' : 'English Site';
      
      if (!knowledge[key]) knowledge[key] = [];
      knowledge[key].push({
        url: `https://ttandmore.com${relPath}`,
        content: textContent.substring(0, 5000) // cap length per page if necessary, but 5000 is plenty for these pages
      });
    }
  });

  const outPathJs = path.join(__dirname, 'api', 'knowledge.js');
  const fileContent = `export const KNOWLEDGE_BASE = ${JSON.stringify(knowledge, null, 2)};`;
  fs.writeFileSync(outPathJs, fileContent, 'utf8');
  console.log(`✅ Knowledge Base built successfully at ${outPathJs}`);
};

buildKnowledgeBase();
