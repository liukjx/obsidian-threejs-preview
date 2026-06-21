/**
 * process-threejs.js
 *
 * Post-build script for Quartz: converts ```threejs / ```threejs-orbit code blocks
 * into working Three.js HTML (canvas + CDN script + user code).
 *
 * Usage: node scripts/process-threejs.js <public-dir>
 * Example: node scripts/process-threejs.js quartz/public
 */

const fs = require('fs');
const path = require('path');

const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const ORBIT_CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

const publicDir = process.argv[2];
if (!publicDir) {
  console.error('Usage: node scripts/process-threejs.js <public-dir>');
  process.exit(1);
}

let blockCounter = 0;

function processHtml(filePath, html) {
  // Match ```threejs* code blocks (Shiki or Prism format)
  const regex = /(?:<figure[^>]*>)?\s*<pre[^>]*(?:data-language="(threejs(?:-orbit)?)"|class="[^"]*\blanguage-(threejs(?:-orbit)?)\b[^"]*")[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>\s*(?:<\/figure>)?/g;

  return html.replace(regex, function (match, lang1, lang2, encodedCode) {
    var lang = lang1 || lang2;
    var hasOrbit = lang === 'threejs-orbit';
    blockCounter++;

    var fname = 'initThreeJS_' + blockCounter;
    var cid = 'threejs-container-' + blockCounter;

    // Decode HTML entities and strip syntax-highlighting tags
    var code = stripHtmlTags(decodeHtmlEntities(encodedCode));
    var safeCode = code.replace(/<\/script>/gi, '<\\/script>');
    if (!safeCode.trim()) return match;

    // Build orbit control wrapper if needed
    var extraScript = '';
    var orbitWrap = '';
    if (hasOrbit) {
      extraScript = '<script src="' + ORBIT_CDN + '"><\\/script>\n  ';
      orbitWrap = [
        'var controls = null;',
        'var __origRAF = window.requestAnimationFrame;',
        'window.requestAnimationFrame = function(cb) {',
        '  return __origRAF.call(window, function() {',
        "    if (controls && typeof controls.update === 'function') controls.update();",
        '    cb();',
        '  });',
        '};'
      ].join('\n    ');
    }

    return [
      '<div class="threejs-wrapper" style="position:relative;width:100%;height:400px;border-radius:12px;overflow:hidden;background:#1a1a2e;margin:1em 0;">',
      '  <div id="' + cid + '" style="width:100%;height:100%;"></div>',
      '</div>',
      '<script src="' + CDN + '"><\\/script>',
      extraScript,
      '<script>',
      'function ' + fname + '() {',
      "  var container = document.getElementById('" + cid + "');",
      '  if (!container || container.dataset.initialized) return;',
      "  container.dataset.initialized = 'true';",
      '  var w = container.clientWidth || 600;',
      '  var h = container.clientHeight || 400;',
      orbitWrap,
      '  try {',
      '    ' + safeCode,
      '  } catch(e) {',
      "    container.innerHTML = '<pre style=\"color:#ff6b6b;padding:1em;font-size:14px;\">Three.js error:\\\\n' + e.message + '</pre>';",
      '  }',
      '}',
      "if (document.readyState === 'loading') {",
      "  document.addEventListener('DOMContentLoaded', " + fname + ');',
      '} else {',
      '  ' + fname + '();',
      '}',
      "document.addEventListener('nav', " + fname + ');',
      '<\\/script>'
    ].join('\n');
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

function scanDir(dir) {
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      var content = fs.readFileSync(fullPath, 'utf-8');
      var processed = processHtml(fullPath, content);
      if (processed !== content) {
        fs.writeFileSync(fullPath, processed, 'utf-8');
        console.log('  ✓ Processed: ' + path.relative(publicDir, fullPath));
      }
    }
  }
}

console.log('Processing Three.js code blocks...');
scanDir(publicDir);
console.log('Done. Processed ' + blockCounter + ' block(s).');