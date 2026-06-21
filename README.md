# Three.js Preview

Render ````threejs` code blocks as interactive 3D previews in Obsidian's reading view.

![preview](https://placehold.co/800x400/1a1a2e/00bfff?text=Three.js+Preview)

## Usage

Wrap your Three.js code in a ````threejs` code block:

````markdown
```threejs
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

var camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 3;

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
container.appendChild(renderer.domElement);

var geometry = new THREE.BoxGeometry(1, 1, 1);
var material = new THREE.MeshStandardMaterial({ color: 0x00bfff });
var cube = new THREE.Mesh(geometry, material);
scene.add(cube);

var ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);
var light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 2, 2);
scene.add(light);

function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.02;
  renderer.render(scene, camera);
}
animate();
```
````

### Code conventions

| Variable | Provided by | Description |
|----------|-------------|-------------|
| `container` | plugin | The DOM element to append your renderer to |
| `w` | plugin | Container width in pixels |
| `h` | plugin | Container height in pixels |
| `THREE` | CDN | Three.js namespace (loaded automatically) |

- `var` is recommended over `let`/`const` (iframe sandbox compatibility)
- The Three.js CDN is loaded automatically; no need to add `<script>` tags yourself
- Error messages are displayed inline if something goes wrong

## Installation

### Via Obsidian Community Plugins (coming soon)

Once approved, search "Three.js Preview" in Obsidian's community plugin browser.

### Via BRAT (recommended for now)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from Community Plugins
2. Run command: `BRAT: Add a beta plugin for testing`
3. Enter: `https://github.com/liukjx/obsidian-threejs-preview`
4. Enable "Three.js Preview" in Community Plugins settings

### Manual install

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/liukjx/obsidian-threejs-preview/releases)
2. Create folder `<vault>/.obsidian/plugins/threejs-preview/`
3. Copy both files there
4. Enable the plugin in Obsidian Settings → Community Plugins

## Settings

Open Settings → Community Plugins → Three.js Preview:

| Setting | Default | Description |
|---------|---------|-------------|
| CDN URL | `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` | Change Three.js version by using a different CDN link |
| Preview height | `400` | Default iframe height in pixels |

## Publishing with Quartz

If you use [Quartz](https://quartz.jzhao.xyz) to publish your Obsidian vault as a static site, you also need the [post-build processing script](scripts/process-threejs.js) to convert ````threejs` code blocks into working Three.js HTML:

```yaml
# Add to your GitHub Actions after `npx quartz build`
- name: Process Three.js code blocks
  run: node scripts/process-threejs.js quartz/public
```

## License

MIT