const { Plugin, PluginSettingTab, Setting } = require('obsidian');

var CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
var ORBIT = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

var DEF = { cdnUrl: CDN, previewHeight: 400, orbitOn: false, darkBg: '#1a1a2e', lightBg: '#e8e8e8' };

module.exports = class ThreeJSPreviewPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new STab(this.app, this));

    this.registerMarkdownCodeBlockProcessor('threejs', function(s, el) {
      this.doRender(s, el, false);
    }.bind(this));

    this.registerMarkdownCodeBlockProcessor('threejs-orbit', function(s, el) {
      this.doRender(s, el, true);
    }.bind(this));

    this.addCommand({
      id: 'refresh-threejs',
      name: 'Refresh Three.js previews',
      callback: this.refresh.bind(this),
    });
  }

  doRender(src, el, orbitForced) {
    var dark = this.isDark();
    var use = orbitForced || this.settings.orbitOn;
    var bg = dark ? this.settings.darkBg : this.settings.lightBg;

    var f = document.createElement('iframe');
    f.style.width = '100%';
    f.style.height = this.settings.previewHeight + 'px';
    f.style.border = 'none';
    f.style.borderRadius = '8px';
    f.style.background = bg;
    f.setAttribute('sandbox', 'allow-scripts');
    f.title = 'Three.js preview';
    f.dataset.src = btoa(unescape(encodeURIComponent(src)));
    f.dataset.orbit = use ? '1' : '0';
    f.srcdoc = this.buildHtml(src, use, bg, dark);

    el.empty();
    el.appendChild(f);
  }

  buildHtml(code, orbit, bg, dark) {
    var s = code.replace(/<\/script>/gi, 'XXX_ENDSCRIPT_XXX');

    var orbitLoad = '';
    var orbitSetup = '';
    if (orbit) {
      orbitLoad = '<script src="' + ORBIT + '">' + '</script>';
      orbitSetup = [
        'var controls=null;',
        'var _r=requestAnimationFrame.bind(window);',
        'var requestAnimationFrame=function(fn){',
        '  return _r(function(t){',
        '    if(controls&&controls.update)controls.update();',
        '    fn(t);',
        '  });',
        '};'
      ].join('\n');
    }

    var bgCss = bg || '#1a1a2e';
    return ''
      + '<!DOCTYPE html><html><head>'
      + '<meta charset="utf-8">'
      + '<script src="' + this.settings.cdnUrl + '">' + '</script>'
      + orbitLoad
      + '<style>'
      + 'body{margin:0;overflow:hidden;background:' + bgCss + '}'
      + '#c{width:100vw;height:100vh}'
      + '</style>'
      + '</head><body>'
      + '<div id="c"></div>'
      + '<script>'
      + 'try{'
      + 'var container=document.getElementById("c");'
      + 'var w=container.clientWidth||600,h=c.clientHeight||400;'
      + orbitSetup
      + s.replace(/XXX_ENDSCRIPT_XXX/g, '<\\/script>')
      + '}catch(e){document.body.innerHTML="<pre>"+e.message+"</pre>"}'
      + '</script>'
      + '</body></html>';
  }

  refresh() {
    var self = this;
    document.querySelectorAll('iframe[data-src]').forEach(function(f) {
      var p = f.parentElement;
      if (!p) return;
      try {
        var src = decodeURIComponent(escape(atob(f.dataset.src)));
        var orbit = f.dataset.orbit === '1';
        self.doRender(src, p, orbit);
      } catch(e) {}
    });
  }

  isDark() {
    return document.body.classList.contains('theme-dark')
      || document.body.getAttribute('saved-theme') === 'dark';
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEF, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};

class STab extends PluginSettingTab {
  constructor(a, p) { super(a, p); this.p = p; }
  display() {
    var e = this.containerEl;
    e.empty();
    e.createEl('h2', { text: 'Three.js Preview' });
    new Setting(e).setName('CDN URL')
      .addText(function(t) {
        t.setPlaceholder(CDN).setValue(this.p.settings.cdnUrl)
          .onChange(async function(v) { this.p.settings.cdnUrl = v || CDN; await this.p.saveSettings(); }.bind(this));
      }.bind(this));
    new Setting(e).setName('Preview height (px)')
      .addText(function(t) {
        t.setPlaceholder('400').setValue(String(this.p.settings.previewHeight))
          .onChange(async function(v) { var h = parseInt(v); if (h > 50) { this.p.settings.previewHeight = h; await this.p.saveSettings(); } }.bind(this));
      }.bind(this));
    new Setting(e).setName('OrbitControls for threejs blocks').setDesc('Toggle to add OrbitControls to basic threejs blocks')
      .addToggle(function(t) {
        t.setValue(this.p.settings.orbitOn)
          .onChange(async function(v) { this.p.settings.orbitOn = v; await this.p.saveSettings(); }.bind(this));
      }.bind(this));
    new Setting(e).setName('Dark bg')
      .addText(function(t) {
        t.setPlaceholder('#1a1a2e').setValue(this.p.settings.darkBg)
          .onChange(async function(v) { this.p.settings.darkBg = v || '#1a1a2e'; await this.p.saveSettings(); }.bind(this));
      }.bind(this));
    new Setting(e).setName('Light bg')
      .addText(function(t) {
        t.setPlaceholder('#e8e8e8').setValue(this.p.settings.lightBg)
          .onChange(async function(v) { this.p.settings.lightBg = v || '#e8e8e8'; await this.p.saveSettings(); }.bind(this));
      }.bind(this));
  }
}