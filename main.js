const { Plugin, PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

module.exports = class ThreeJSPreviewPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ThreeJSPreviewSettingTab(this.app, this));

    this.registerMarkdownCodeBlockProcessor('threejs', (source, el, ctx) => {
      const cdn = this.settings.cdnUrl;  // loaded via loadSettings()
      const height = this.settings.previewHeight;

      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = height + 'px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      iframe.style.background = '#1a1a2e';
      iframe.loading = 'lazy';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.title = 'Three.js preview';

      const html = buildPreviewHtml(source, cdn);
      iframe.srcdoc = html;

      el.empty();
      el.appendChild(iframe);
    });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, { cdnUrl: DEFAULT_CDN, previewHeight: 400 }, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};

function buildPreviewHtml(code, cdn) {
  const safeCode = (code || '').replace(/<\/script>/gi, '<\\/script>');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="${cdn}"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }
    #three-container { width: 100%; height: 100%; }
    .error-msg { color: #ff6b6b; padding: 1.5em; font-family: monospace; font-size: 14px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div id="three-container"></div>
  <script>
  try {
    var container = document.getElementById('three-container');
    var w = container.clientWidth || 600;
    var h = container.clientHeight || 400;
    ${safeCode}
  } catch(e) {
    document.body.innerHTML = '<pre class="error-msg">Three.js error:\\n' +
      e.message + '\\n' + (e.stack || '') + '</pre>';
  }
  <\/script>
</body>
</html>`;
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
      .addText(text => text
        .setPlaceholder(DEFAULT_CDN)
        .setValue(this.plugin.settings.cdnUrl)
        .onChange(async (value) => {
          this.plugin.settings.cdnUrl = value || DEFAULT_CDN;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Preview height (px)')
      .setDesc('Default height of the Three.js preview iframe.')
      .addText(text => text
        .setPlaceholder('400')
        .setValue(String(this.plugin.settings.previewHeight))
        .onChange(async (value) => {
          const h = parseInt(value);
          if (!isNaN(h) && h > 50) {
            this.plugin.settings.previewHeight = h;
            await this.plugin.saveSettings();
          }
        }));
  }
}