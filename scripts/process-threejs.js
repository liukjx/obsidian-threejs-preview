/**
 * process-threejs.js
 *
 * Post-build script for Quartz: converts ```threejs code blocks
 * into working Three.js HTML (canvas + CDN script + user code).
 *
 * Usage: node scripts/process-threejs.js <public-dir>
 * Example: node scripts/process-threejs.js quartz/public
 */

const fs = require('fs');
const path = require('path');

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

const publicDir = process.argv[2];
if (!publicDir) {
  console.error('Usage: node scripts/process-threejs.js <public-dir>');
  process.exit(1);
}

let blockCounter = 0;

function processHtml(filePath, html) {
  // Match ```threejs code blocks in multiple formats:
  // 1. Shiki: <figure>...<pre data-language="threejs"><code data-language="threejs">...</code></pre></figure>
  // 2. Prism:  <pre><code class="language-threejs">...</code></pre>
  const regex = /(?:<figure[^>]*>)?\s*<pre[^>]*(?:data-language="threejs"|class="[^"]*\blanguage-threejs\b[^"]*")[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>\s*(?:<\/figure>)?/g;

  return html.replace(regex, (match, encodedCode) => {
    blockCounter++;
    const id = `threejs-${blockCounter}`;

    // Decode HTML entities and strip syntax-highlighting tags (span, etc.)
    const code = stripHtmlTags(decodeHtmlEntities(encodedCode));

    // Escape </script> in user code
    const safeCode = code.replace(/<\/script>/gi, '<\\/script>');

    // Skip if code is empty after stripping
    if (!safeCode.trim()) return match;

    // Generate working Three.js HTML
    return `
<div class="threejs-wrapper" style="position:relative;width:100%;height:400px;border-radius:12px;overflow:hidden;background:#1a1a2e;margin:1em 0;">
  <div id="${id}" style="width:100%;height:100%;"></div>
</div>
<script src="${CDN}"><\/script>
<script>
function init_${id}() {
  var container = document.getElementById('${id}');
  if (!container || container.dataset.initialized) return;
  container.dataset.initialized = 'true';
  var w = container.clientWidth || 600;
  var h = container.clientHeight || 400;
  try {
    ${safeCode}
  } catch(e) {
    container.innerHTML = '<pre style="color:#ff6b6b;padding:1em;font-size:14px;">Three.js error:\\n' + e.message + '</pre>';
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init_${id});
} else {
  init_${id}();
}
document.addEventListener('nav', init_${id});
<\/script>`.trim();
  });
}

function stripHtmlTags(str) {
  return str.replace(/<[^>]*>/g, '');
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

// Recursively scan and process HTML files
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const processed = processHtml(fullPath, content);
      if (processed !== content) {
        fs.writeFileSync(fullPath, processed, 'utf-8');
        console.log(`  ✓ Processed: ${path.relative(publicDir, fullPath)}`);
      }
    }
  }
}

console.log('Processing Three.js code blocks...');
scanDir(publicDir);
console.log(`Done. Processed ${blockCounter} block(s).`);