const { Plugin, PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const ORBIT_CONTROLS_CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

const DEFAULT_SETTINGS = {
  cdnUrl: DEFAULT_CDN,
  previewHeight: 400,
  enableOrbitControls: false,
  darkBackground: '#1a1a2e',
  lightBackground: '#e8e8e8',
};

module.exports = class ThreeJSPreviewPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ThreeJSPreviewSettingTab(this.app, this));

    // Register processor for ```threejs (basic)
    this.registerMarkdownCodeBlockProcessor('threejs', (source, el, ctx) => {
      this.createPreview(source, el, false);
    });

    // Register processor for ```threejs-orbit (always has OrbitControls)
    this.registerMarkdownCodeBlockProcessor('threejs-orbit', (source, el, ctx) => {
      this.createPreview(source, el, true);
    });

    // When theme changes, tell all preview iframes to update
    this.registerEvent(this.app.workspace.on('css-change', () => {
      this.broadcastTheme();
    }));
  }

  createPreview(source, el, forceOrbit) {
    const isDark = this.isDarkMode();
    const useOrbit = forceOrbit || this.settings.enableOrbitControls;
    const themeBg = isDark ? this.settings.darkBackground : this.settings.lightBackground;

    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = this.settings.previewHeight + 'px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.style.background = themeBg;
    iframe.loading = 'lazy';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.title = 'Three.js preview';
    iframe.dataset.themebg = themeBg;

    const html = buildPreviewHtml(source, this.settings, useOrbit, isDark);
    iframe.srcdoc = html;

    el.empty();
    el.appendChild(iframe);
  }

  isDarkMode() {
    return document.body.classList.contains('theme-dark') ||
      document.body.getAttribute('saved-theme') === 'dark';
  }

  broadcastTheme() {
    const isDark = this.isDarkMode();
    const bg = isDark ? this.settings.darkBackground : this.settings.lightBackground;

    document.querySelectorAll('iframe[title="Three.js preview"]').forEach(function (iframe) {
      iframe.style.background = bg;
      iframe.dataset.themebg = bg;
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'threejs-theme',
          isDark: isDark,
          darkBg: isDark ? bg : null,
          lightBg: isDark ? null : bg
        }, '*');
      }
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};

function buildPreviewHtml(code, settings, orbitEnabled, isDark) {
  const safeCode = (code || '').replace(/<\/script>/gi, '<\\/script>');
  const bg = isDark ? settings.darkBackground : settings.lightBackground;

  let extraScripts = '';
  let orbitCode = '';

  if (orbitEnabled) {
    extraScripts += '<script src="' + ORBIT_CONTROLS_CDN + '"><\/script>\n';
    orbitCode = [
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
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="utf-8">',
    '  <script src="' + settings.cdnUrl + '"><\/script>',
    '  ' + extraScripts,
    '  <style>',
    '    * { margin: 0; padding: 0; box-sizing: border-box; }',
    '    html, body { width: 100%; height: 100%; overflow: hidden; background: ' + bg + '; }',
    '    #three-container { width: 100%; height: 100%; }',
    '    .error-msg { color: #ff6b6b; padding: 1.5em; font-family: monospace; font-size: 14px; white-space: pre-wrap; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div id="three-container"></div>',
    '  <script>',
    '  try {',
    '    var isDark = ' + isDark + ';',
    '    var container = document.getElementById("three-container");',
    '    var w = container.clientWidth || 600;',
    '    var h = container.clientHeight || 400;',
    orbitCode,
    '    ' + safeCode,
    '  } catch(e) {',
    '    document.body.innerHTML = \'<pre class="error-msg">Three.js error:\\\\n\' + e.message + \'\\\\n\' + (e.stack || \'\') + \'</pre>\';',
    '  }',
    '  window.addEventListener("message", function(e) {',
    '    if (e.data && e.data.type === "threejs-theme") {',
    '      isDark = e.data.isDark;',
    '      var bg = isDark ? (e.data.darkBg || "' + (isDark ? bg : settings.darkBackground) + '") : (e.data.lightBg || "' + (!isDark ? bg : settings.lightBackground) + '");',
    '      document.body.style.background = bg;',
    '    }',
    '  });',
    '  <\/script>',
    '</body>',
    '</html>'
  ].join('\n');
}

class ThreeJSPreviewSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Three.js Preview Settings' });

    new Setting(containerEl)
      .setName('Three.js CDN URL')
      .setDesc('CDN link for Three.js library. Change if you need a different version.')
      .addText(function(text) {
        text.setPlaceholder(DEFAULT_CDN)
          .setValue(this.plugin.settings.cdnUrl)
          .onChange(async function(value) {
            this.plugin.settings.cdnUrl = value || DEFAULT_CDN;
            await this.plugin.saveSettings();
          }.bind(this));
      }.bind(this));

    new Setting(containerEl)
      .setName('Preview height (px)')
      .setDesc('Default height of the Three.js preview iframe.')
      .addText(function(text) {
        text.setPlaceholder('400')
          .setValue(String(this.plugin.settings.previewHeight))
          .onChange(async function(value) {
            var h = parseInt(value);
            if (!isNaN(h) && h > 50) {
              this.plugin.settings.previewHeight = h;
              await this.plugin.saveSettings();
            }
          }.bind(this));
      }.bind(this));

    new Setting(containerEl)
      .setName('Enable OrbitControls')
      .setDesc('Auto-inject OrbitControls so you can interactively rotate/zoom the 3D scene. ' +
        'Use new THREE.OrbitControls(camera, renderer.domElement) in your code.')
      .addToggle(function(toggle) {
        toggle.setValue(this.plugin.settings.enableOrbitControls)
          .onChange(async function(value) {
            this.plugin.settings.enableOrbitControls = value;
            await this.plugin.saveSettings();
          }.bind(this));
      }.bind(this));

    new Setting(containerEl)
      .setName('Dark mode background')
      .setDesc('Background color for the preview iframe in dark mode (CSS color).')
      .addText(function(text) {
        text.setPlaceholder('#1a1a2e')
          .setValue(this.plugin.settings.darkBackground)
          .onChange(async function(value) {
            this.plugin.settings.darkBackground = value || '#1a1a2e';
            await this.plugin.saveSettings();
          }.bind(this));
      }.bind(this));

    new Setting(containerEl)
      .setName('Light mode background')
      .setDesc('Background color for the preview iframe in light mode (CSS color).')
      .addText(function(text) {
        text.setPlaceholder('#e8e8e8')
          .setValue(this.plugin.settings.lightBackground)
          .onChange(async function(value) {
            this.plugin.settings.lightBackground = value || '#e8e8e8';
            await this.plugin.saveSettings();
          }.bind(this));
      }.bind(this));

    containerEl.createEl('p', {
      text: '💡 After changing settings, refresh the reading view to apply. Theme changes apply live.',
      cls: 'setting-item-description'
    });
  }
}