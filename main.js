const { Plugin, PluginSettingTab, Setting } = require('obsidian');

const DEFAULT_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const ORBIT_CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

const DEFAULTS = {
  cdnUrl: DEFAULT_CDN,
  previewHeight: 400,
  enableOrbitControls: false,
  darkBackground: '#1a1a2e',
  lightBackground: '#e8e8e8',
};

module.exports = class ThreeJSPreviewPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingsTab(this.app, this));

    this.registerMarkdownCodeBlockProcessor('threejs', (src, el) => {
      this.buildFrame(src, el, false);
    });
    this.registerMarkdownCodeBlockProcessor('threejs-orbit', (src, el) => {
      this.buildFrame(src, el, true);
    });

    // Command palette: refresh all previews
    this.addCommand({
      id: 'threejs-preview-refresh',
      name: 'Refresh Three.js previews',
      callback: () => this.refreshAll(),
    });
  }

  buildFrame(src, el, orbit) {
    var isDark = this.isDark();
    var bg = isDark ? this.settings.darkBackground : this.settings.lightBackground;
    var useOrbit = orbit || this.settings.enableOrbitControls;

    var f = document.createElement('iframe');
    f.style.cssText = 'width:100%;height:' + this.settings.previewHeight + 'px;border:none;border-radius:8px;background:' + bg + ';';
    f.setAttribute('sandbox', 'allow-scripts');
    f.title = 'Three.js preview';
    f.dataset.src = btoa(unescape(encodeURIComponent(src)));
    f.dataset.orbit = useOrbit ? '1' : '0';

    var html = this.buildHTML(src, useOrbit, bg);
    f.srcdoc = html;

    el.empty();
    el.appendChild(f);
  }

  buildHTML(code, orbit, bg) {
    var s = code.replace(/<\/script>/gi, '<\\/script>');

    var extras = '';
    var prelude = '';
    if (orbit) {
      extras = '<script src="' + ORBIT_CDN + '"><\\/script>\n';
      prelude = [
        'var controls = null;',
        'var __r = window.requestAnimationFrame;',
        'window.requestAnimationFrame = function(fn) {',
        '  return __r.call(window, function() {',
        "    if (controls && controls.update) controls.update();",
        '    fn();',
        '  });',
        '};',
      ].join('\n');
    }

    return ''
      + '<!DOCTYPE html><html><head>'
      + '<meta charset="utf-8">'
      + '<script src="' + this.settings.cdnUrl + '"><\\/script>'
      + extras
      + '<style>'
      + 'body{margin:0;overflow:hidden;background:' + bg + '}'
      + '#c{width:100vw;height:100vh}'
      + '.e{color:#ff6b6b;padding:1em;font:14px monospace;white-space:pre}'
      + '<\/style>'
      + '</head><body>'
      + '<div id="c"></div>'
      + '<script>'
      + 'try{'
      + 'var c=document.getElementById("c");'
      + 'var w=c.clientWidth||600,h=c.clientHeight||400;'
      + prelude
      + s
      + '}catch(e){document.body.innerHTML="<pre class=e>Three.js error:\\n"+e.message+"</pre>"}'
      + '<\\/script>'
      + '</body></html>';
  }

  refreshAll() {
    var self = this;
    document.querySelectorAll('iframe[data-src]').forEach(function(f) {
      var el = f.parentElement;
      if (!el) return;
      try {
        var src = decodeURIComponent(escape(atob(f.dataset.src)));
        var orbit = f.dataset.orbit === '1';
        self.buildFrame(src, el, orbit);
      } catch(e) {}
    });
  }

  isDark() {
    return document.body.classList.contains('theme-dark')
      || document.body.getAttribute('saved-theme') === 'dark';
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};

class SettingsTab extends PluginSettingTab {
  constructor(a, p) {
    super(a, p);
    this.p = p;
  }
  display() {
    var e = this.containerEl;
    e.empty();
    e.createEl('h2', { text: 'Three.js Preview' });

    new Setting(e)
      .setName('Three.js CDN')
      .setDesc('Change CDN URL for a different Three.js version.')
      .addText(function(t) {
        t.setPlaceholder(DEFAULT_CDN).setValue(this.p.settings.cdnUrl)
          .onChange(async function(v) { this.p.settings.cdnUrl = v || DEFAULT_CDN; await this.p.saveSettings(); }.bind(this));
      }.bind(this));

    new Setting(e)
      .setName('Preview height (px)')
      .addText(function(t) {
        t.setPlaceholder('400').setValue(String(this.p.settings.previewHeight))
          .onChange(async function(v) {
            var h = parseInt(v);
            if (h > 50) { this.p.settings.previewHeight = h; await this.p.saveSettings(); }
          }.bind(this));
      }.bind(this));

    new Setting(e)
      .setName('OrbitControls on ```threejs')
      .setDesc('When ON, basic ```threejs blocks also get OrbitControls.')
      .addToggle(function(t) {
        t.setValue(this.p.settings.enableOrbitControls)
          .onChange(async function(v) { this.p.settings.enableOrbitControls = v; await this.p.saveSettings(); }.bind(this));
      }.bind(this));

    new Setting(e)
      .setName('Dark mode bg')
      .addText(function(t) {
        t.setPlaceholder('#1a1a2e').setValue(this.p.settings.darkBackground)
          .onChange(async function(v) { this.p.settings.darkBackground = v || '#1a1a2e'; await this.p.saveSettings(); }.bind(this));
      }.bind(this));

    new Setting(e)
      .setName('Light mode bg')
      .addText(function(t) {
        t.setPlaceholder('#e8e8e8').setValue(this.p.settings.lightBackground)
          .onChange(async function(v) { this.p.settings.lightBackground = v || '#e8e8e8'; await this.p.saveSettings(); }.bind(this));
      }.bind(this));
  }
}