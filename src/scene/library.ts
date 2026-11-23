import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Book, Domain } from '../data/catalog.ts';
import { drawCover, drawTitlePage, loadArtwork } from './covers.ts';
import { Spring, Spring3, easeInOut, nearestAngle } from './motion.ts';

/** Radius of the rotunda: how far the shelves stand from the centre. */
const R = 11;
const BOOK = { w: 1.25, h: 1.85, d: 0.26 };
const COLS = 4;
const INTRO_SECONDS = 5.2;
const BRASS = 0xc9973f;

interface Volume {
  book: Book;
  domain: number;
  group: THREE.Group;
  hit: THREE.Mesh;
  hinge: THREE.Group;
  mats: THREE.MeshStandardMaterial[];
  halo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  ribbon: THREE.Mesh;
  shelf: THREE.Vector3;
  shelfQuat: THREE.Quaternion;
  /** Unit vector from the shelf toward the centre of the room. */
  inward: THREE.Vector3;
  pos: Spring3;
  /** 0 = on the shelf, 1 = presented to the camera (focused or on a path). */
  present: Spring;
  open: Spring;
  lift: Spring;
  dim: Spring;
  scale: Spring;
  spin: Spring;
  glow: Spring;
  read: Spring;
  releaseAt: number;
  released: boolean;
  spawn: THREE.Vector3;
}

export interface LibraryEvents {
  onHover: (id: string | null) => void;
  onPick: (id: string | null) => void;
  /** -1 or +1: the visitor swiped, scrolled or pressed an arrow. */
  onTurn: (direction: number) => void;
  onIntroEnd: () => void;
}

export class Library {
  events: LibraryEvents = { onHover() {}, onPick() {}, onTurn() {}, onIntroEnd() {} };

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  private composer: EffectComposer;
  private lens: ShaderPass;
  private volumes: Volume[] = [];
  private byId = new Map<string, Volume>();
  private headlight = new THREE.DirectionalLight(0xfff0dc, 1.75);
  private floor: THREE.ShaderMaterial;
  private dust: THREE.ShaderMaterial;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(0, 0);
  private pointerPx = new THREE.Vector2(-1, -1);
  private parallax = new THREE.Vector2();
  private size = new THREE.Vector2(1, 1);
  private narrow = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private time = 0;
  private last = performance.now();
  private intro: number;
  private introDone = false;
  private active = 0;
  private focused: Volume | null = null;
  private hovered: Volume | null = null;
  private path: string[] | null = null;
  private pathStarted = 0;
  private filter: Set<string> | null = null;

  private yaw = new Spring(0, 22, 7.2);
  private fov = new Spring(40, 60, 9);
  private pullBack = new Spring(0, 30, 9);

  constructor(
    private canvas: HTMLCanvasElement,
    books: Book[],
    private domains: Domain[],
    artwork: Record<string, { cover?: number }>,
    skipIntro: boolean
  ) {
    this.intro = skipIntro || this.reduced ? INTRO_SECONDS : 0;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene.background = new THREE.Color(0x060b0a);
    this.scene.fog = new THREE.FogExp2(0x060b0a, 0.026);

    this.scene.add(new THREE.HemisphereLight(0xffe9c9, 0x0a1512, 0.75));
    this.scene.add(this.headlight, this.headlight.target);

    this.floor = this.buildRoom();
    this.dust = this.buildDust();
    this.buildVolumes(books, artwork);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.6, 0.92));
    this.lens = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main() {
          vec2 c = vUv - 0.5;
          float r2 = dot(c, c);
          vec2 fringe = c * r2 * 0.012;
          vec3 col = vec3(texture2D(tDiffuse, vUv + fringe).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - fringe).b);
          col *= 1.0 - r2 * 1.05;
          col += (hash(vUv * 900.0 + fract(uTime) * 53.0) - 0.5) * 0.022;
          gl_FragColor = vec4(max(col, 0.0), 1.0);
        }
      `,
    });
    this.composer.addPass(this.lens);
    this.composer.addPass(new OutputPass());

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindInput();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ── what the interface can ask for ─────────────────────────────────────────

  setDomain(index: number): void {
    if (index === this.active) return;
    this.active = index;
    this.yaw.target = nearestAngle(this.yaw.target, this.angleOf(index));
    // A small lens punch on every turn of the room.
    this.fov.velocity += this.reduced ? 0 : 46;
  }

  focus(id: string | null): void {
    const next = id ? (this.byId.get(id) ?? null) : null;
    if (next === this.focused) return;
    if (this.focused) this.focused.open.target = 0;
    this.focused = next;
    if (next) {
      if (!this.path) this.setDomain(next.domain);
      next.spin.target += Math.PI * 2; // One full turn on the way to the reader.
      next.open.target = 0;
      window.setTimeout(() => this.focused === next && (next.open.target = 1), 520);
    }
  }

  /** Lines the books of a reading path up in front of the reader, in order. */
  setPath(ids: string[] | null): void {
    this.path = ids;
    this.pathStarted = this.time;
    this.pullBack.target = ids ? 1 : 0;
    this.fov.velocity += this.reduced ? 0 : 30;
  }

  setFilter(ids: Set<string> | null): void {
    this.filter = ids;
  }

  setRead(ids: Set<string>): void {
    for (const v of this.volumes) v.read.target = ids.has(v.book.id) ? 1 : 0;
  }

  /** Where a book is on screen, in CSS pixels, or null when it is behind the camera. */
  screenOf(id: string, lift = 0): { x: number; y: number } | null {
    const v = this.byId.get(id);
    if (!v) return null;
    const p = v.group.position.clone();
    p.y += lift * v.group.scale.y;
    p.project(this.camera);
    if (p.z > 1) return null;
    return { x: (p.x * 0.5 + 0.5) * this.size.x, y: (-p.y * 0.5 + 0.5) * this.size.y };
  }

  // ── building the room ──────────────────────────────────────────────────────

  private angleOf(domain: number): number {
    return (domain / this.domains.length) * Math.PI * 2;
  }

  private buildRoom(): THREE.ShaderMaterial {
    const brass = new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.7, roughness: 0.55, emissive: 0x1c1103 });
    const n = this.domains.length;

    const floor = new THREE.ShaderMaterial({
      uniforms: { uYaw: { value: 0 }, uTime: { value: 0 }, uTint: { value: new THREE.Color(this.domains[0].color) } },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
      `,
      fragmentShader: /* glsl */ `
        uniform float uYaw;
        uniform float uTime;
        uniform vec3 uTint;
        varying vec3 vWorld;
        void main() {
          vec2 p = vWorld.xz;
          float r = length(p);
          float a = atan(p.x, p.y);
          vec3 col = vec3(0.016, 0.030, 0.026);
          // Inlaid brass: rings, and a ray toward each bay.
          float rings = smoothstep(0.045, 0.0, abs(fract(r * 0.5) - 0.5) - 0.02) * step(r, 12.5);
          float rays = smoothstep(0.012, 0.0, abs(fract(a / 6.28318 * ${n}.0 + 0.5) - 0.5) - 0.004) * smoothstep(1.5, 3.5, r);
          col += vec3(0.60, 0.44, 0.17) * (rings * 0.20 + rays * 0.28);
          // The floor in front of the open bay picks up its colour.
          float d = a - uYaw;
          d = atan(sin(d), cos(d));
          float pool = exp(-d * d * 5.0) * smoothstep(13.0, 5.0, r) * smoothstep(1.0, 6.0, r);
          col += uTint * pool * (0.20 + 0.04 * sin(uTime * 0.9));
          // Light falling from the oculus.
          col += vec3(1.0, 0.86, 0.6) * exp(-r * r * 0.11) * 0.16;
          float fog = 1.0 - exp(-pow(length(vWorld - cameraPosition) * 0.026, 2.0));
          gl_FragColor = vec4(mix(col, vec3(0.024, 0.043, 0.039), fog), 1.0);
        }
      `,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(40, 96), floor);
    disc.rotation.x = -Math.PI / 2;
    this.scene.add(disc);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0c1714, roughness: 0.95, metalness: 0 });
    for (let i = 0; i < n; i++) {
      const a = this.angleOf(i);
      const bay = new THREE.Group();
      bay.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      bay.rotation.y = a + Math.PI;
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 7.4), wallMat);
      wall.position.set(0, 3.2, -0.42);
      bay.add(wall);
      for (const y of [0.33, 2.58, 4.84]) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.07, 0.62), brass);
        plank.position.set(0, y, -0.05);
        bay.add(plank);
      }
      this.scene.add(bay);

      // A column where two bays meet.
      const c = a + Math.PI / n;
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7.4, 20), brass);
      column.position.set(Math.sin(c) * (R + 0.45), 3.7, Math.cos(c) * (R + 0.45));
      this.scene.add(column);
    }
    for (const y of [0.04, 6.9]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.55, 0.07, 8, 160), brass);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      this.scene.add(ring);
    }

    // The oculus and the shaft of light under it.
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 4.2, 16, 40, 1, true),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `varying vec2 vUv; void main() { gl_FragColor = vec4(vec3(1.0, 0.86, 0.6) * pow(vUv.y, 2.2) * 0.07, 1.0); }`,
      })
    );
    shaft.position.y = 8;
    this.scene.add(shaft);
    return floor;
  }

  private buildDust(): THREE.ShaderMaterial {
    const COUNT = 900;
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = Math.sqrt(Math.random()) * 12;
      const a = Math.random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, Math.random() * 9, Math.sin(a) * r], i * 3);
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float aSeed;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.y = mod(p.y + uTime * (0.05 + aSeed * 0.12), 9.0);
          p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.4;
          p.z += cos(uTime * 0.25 + aSeed * 31.0) * 0.4;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          vAlpha = (0.25 + aSeed * 0.6) * smoothstep(0.4, 2.5, -mv.z) * smoothstep(22.0, 8.0, -mv.z);
          gl_PointSize = min((0.8 + aSeed * 2.0) * uPixelRatio * 14.0 / max(-mv.z, 0.5), 3.2 * uPixelRatio);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * smoothstep(0.5, 0.0, d) * vAlpha, 1.0);
        }
      `,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    this.scene.add(points);
    return mat;
  }

  private buildVolumes(books: Book[], artwork: Record<string, { cover?: number }>): void {
    const bodyGeo = new THREE.BoxGeometry(BOOK.w, BOOK.h, BOOK.d);
    const coverGeo = new THREE.BoxGeometry(BOOK.w + 0.04, BOOK.h + 0.04, 0.03);
    const ribbonGeo = new THREE.BoxGeometry(0.13, 0.62, 0.012);
    const haloGeo = new THREE.PlaneGeometry(3.6, 4.4);
    const titlePageTex = drawTitlePage();
    const brass = new THREE.MeshStandardMaterial({ color: BRASS, metalness: 0.8, roughness: 0.3, emissive: 0x5a3a08 });

    // A soft round glow, reused behind every book.
    const g = document.createElement('canvas');
    g.width = g.height = 128;
    const ctx = g.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(g);

    const perDomain = new Map<number, number>();
    books.forEach((book, index) => {
      const domain = this.domains.findIndex((d) => d.id === book.domain);
      const slot = perDomain.get(domain) ?? 0;
      perDomain.set(domain, slot + 1);
      const tint = new THREE.Color(this.domains[domain].color);

      // Shelf position: two rows of four, on a wall that curves slightly toward the reader.
      const col = slot % COLS;
      const row = slot < COLS ? 1 : 0;
      const x = (col - (COLS - 1) / 2) * 1.66;
      const a = this.angleOf(domain);
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const right = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
      const shelf = dir.clone().multiplyScalar(R - x * x * 0.045).addScaledVector(right, x);
      shelf.y = row ? 3.56 : 1.31;
      const shelfQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a + Math.PI - x * 0.06, 0));

      const coverMat = new THREE.MeshStandardMaterial({ map: drawCover(book, this.domains[domain]), roughness: 0.6 });
      const clothMat = new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.55), roughness: 0.8 });
      const pages = new THREE.MeshStandardMaterial({ color: 0xe9dfc8, roughness: 0.9 });
      const titlePage = new THREE.MeshStandardMaterial({ map: titlePageTex, roughness: 0.85 });
      const group = new THREE.Group();
      // Faces: +x fore-edge, -x spine, top, bottom, +z first page, -z back board.
      const body = new THREE.Mesh(bodyGeo, [pages, clothMat, pages, pages, titlePage, clothMat]);
      const hinge = new THREE.Group();
      hinge.position.set(-BOOK.w / 2, 0, BOOK.d / 2 + 0.017);
      const board = new THREE.Mesh(coverGeo, [clothMat, clothMat, clothMat, clothMat, coverMat, clothMat]);
      board.position.x = BOOK.w / 2;
      hinge.add(board);
      const halo = new THREE.Mesh(
        haloGeo,
        new THREE.MeshBasicMaterial({ map: glowTex, color: tint, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      halo.position.z = -0.24;
      const ribbon = new THREE.Mesh(ribbonGeo, brass);
      ribbon.position.set(BOOK.w * 0.3, BOOK.h / 2 - 0.2, BOOK.d / 2 + 0.05);
      group.add(halo, body, hinge, ribbon);
      body.userData.id = book.id;
      this.scene.add(group);

      // Before the room opens, every book waits in a column of light at the centre.
      const turn = index * 0.61;
      const spawn = new THREE.Vector3(Math.cos(turn) * 0.9, 1.2 + (index / books.length) * 9, Math.sin(turn) * 0.9);

      const volume: Volume = {
        book, domain, group, hit: body, hinge, halo, ribbon, shelf, shelfQuat,
        mats: [coverMat, clothMat, pages, titlePage],
        inward: dir.clone().negate(),
        pos: new Spring3(this.intro >= INTRO_SECONDS ? shelf : spawn, 34, 8.2),
        present: new Spring(0, 46, 10.5),
        open: new Spring(0, 34, 7.5),
        lift: new Spring(0, 190, 17),
        dim: new Spring(0.2, 26, 9),
        scale: new Spring(this.intro >= INTRO_SECONDS ? 1 : 0.12, 60, 10),
        spin: new Spring(0, 22, 7.4),
        glow: new Spring(0, 40, 10),
        read: new Spring(0, 90, 11),
        releaseAt: 1.0 + domain * 0.34 + slot * 0.075,
        released: this.intro >= INTRO_SECONDS,
        spawn,
      };
      this.volumes.push(volume);
      this.byId.set(book.id, volume);

      const coverId = artwork[book.id]?.cover;
      if (coverId) {
        // Spread the requests out: Open Library is a free service.
        window.setTimeout(
          () =>
            loadArtwork(coverId, (tex) => {
              coverMat.map?.dispose();
              coverMat.map = tex;
              coverMat.needsUpdate = true;
            }),
          400 + index * 90
        );
      }
    });
  }

  // ── every frame ────────────────────────────────────────────────────────────

  private frame(): void {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.time += dt;
    this.intro = Math.min(INTRO_SECONDS, this.intro + dt);
    if (!this.introDone && this.intro >= INTRO_SECONDS) {
      this.introDone = true;
      this.events.onIntroEnd();
    }

    this.aim(dt);
    this.pickHover();
    this.moveVolumes(dt);

    this.floor.uniforms.uYaw.value = this.yaw.value;
    this.floor.uniforms.uTime.value = this.time;
    (this.floor.uniforms.uTint.value as THREE.Color).lerp(new THREE.Color(this.domains[this.active].color), Math.min(1, dt * 3));
    this.dust.uniforms.uTime.value = this.time;
    this.lens.uniforms.uTime.value = this.time;
    this.composer.render(dt);
  }

  private aim(dt: number): void {
    const k = easeInOut(this.intro / INTRO_SECONDS);
    const yaw = this.yaw.step(dt) + (1 - k) * 5.4; // The opening shot spirals down into the room.
    const pull = this.pullBack.step(dt);
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));

    const back = (this.narrow ? 9.5 : 1.3) + pull * (this.narrow ? 1.5 : 2.4) + (1 - k) * 3.5;
    const height = 2.55 + (1 - k) * 9.5;
    const sway = this.reduced ? 0 : 1;
    this.parallax.lerp(this.pointer, Math.min(1, dt * 2.5));

    this.camera.position
      .copy(dir)
      .multiplyScalar(-back)
      .setY(height + Math.sin(this.time * 0.5) * 0.04 * sway - this.parallax.y * 0.22);
    // Slide sideways with the pointer for a little depth.
    this.camera.position.addScaledVector(new THREE.Vector3(dir.z, 0, -dir.x), -this.parallax.x * 0.5);
    const look = dir.clone().multiplyScalar(R * 0.85).setY((this.narrow ? 2.4 : 1.95) - (1 - k) * 1.8);
    this.camera.lookAt(look);
    this.camera.fov = this.fov.step(dt);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();

    this.headlight.position.copy(this.camera.position).add(new THREE.Vector3(0, 2.5, 0));
    this.headlight.target.position.copy(look);
  }

  private moveVolumes(dt: number): void {
    const cam = this.camera;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const path = this.path;
    const face = new THREE.Quaternion();
    const turn = new THREE.Quaternion();
    const Y = new THREE.Vector3(0, 1, 0);
    const X = new THREE.Vector3(1, 0, 0);

    // Books on a path light up one after another.
    const lit = path ? Math.floor((this.time - this.pathStarted - 0.5) / 0.26) : -1;

    for (const v of this.volumes) {
      if (!v.released) {
        if (this.intro < v.releaseAt) {
          // Still waiting in the column of light, turning slowly.
          v.group.position.copy(v.spawn);
          v.group.rotation.set(0, this.time * 1.2 + v.spawn.y, 0.2);
          v.group.scale.setScalar(v.scale.value);
          v.dim.snap(0.9);
          this.paint(v, 0.9, 0.5);
          continue;
        }
        v.released = true;
      }

      const isFocus = v === this.focused;
      const step = path ? path.indexOf(v.book.id) : -1;
      const passes = !this.filter || this.filter.has(v.book.id);
      let presentYaw = 0;

      if (isFocus) {
        // Held up to the reader, left of centre so the page of notes fits beside it.
        const dist = this.narrow ? 6.6 : 5.6;
        const reach = dist * halfH;
        v.pos.target
          .copy(cam.position)
          .addScaledVector(fwd, dist)
          .addScaledVector(right, this.narrow ? 0 : -reach * cam.aspect * 0.42)
          .addScaledVector(up, this.narrow ? reach * 0.42 : 0.02 + Math.sin(this.time * 0.9) * 0.03);
        v.present.target = 1;
        v.scale.target = this.narrow ? 0.86 : 1.0;
        v.dim.target = 1;
        presentYaw = 0.5;
      } else if (step >= 0) {
        // One place in the line, spaced to fit the screen.
        const n = path!.length;
        const dist = 6.4;
        const width = dist * halfH * cam.aspect * 2 * 0.88;
        const spacing = Math.min(1.5, width / n);
        const t = n > 1 ? step / (n - 1) - 0.5 : 0;
        v.pos.target
          .copy(cam.position)
          .addScaledVector(fwd, dist - t * t * 1.4)
          .addScaledVector(right, t * spacing * (n - 1))
          .addScaledVector(up, -0.2 + Math.sin(this.time * 0.8 + step * 0.7) * 0.05);
        v.present.target = 1;
        v.scale.target = Math.min(0.92, spacing / (BOOK.w + 0.12));
        v.dim.target = this.focused ? 0.3 : 1;
        presentYaw = -t * 0.75;
      } else {
        const sink = passes && !path ? 0 : -0.35;
        v.pos.target.copy(v.shelf).addScaledVector(v.inward, v.lift.value * 0.55 + sink);
        v.pos.target.y += v.lift.value * 0.07;
        v.present.target = 0;
        v.scale.target = 1;
        v.dim.target = this.focused ? 0.1 : path ? 0.07 : (v.domain === this.active ? 1 : 0.5) * (passes ? 1 : 0.13);
      }

      v.lift.target = v === this.hovered && !isFocus ? 1 : 0;
      v.lift.step(dt);
      v.group.position.copy(v.pos.step(dt));
      v.group.scale.setScalar(v.scale.step(dt));

      // Blend between sitting on the shelf and facing the reader.
      const spin = v.spin.step(dt);
      face.copy(cam.quaternion).multiply(turn.setFromAxisAngle(Y, presentYaw + spin));
      const tilt = turn.setFromAxisAngle(X, -v.lift.value * 0.07);
      v.group.quaternion.copy(v.shelfQuat).multiply(tilt).slerp(face, Math.min(1, Math.max(0, v.present.step(dt))));

      // Ajar, not flat open: the cover art stays in view and the first page shows behind it.
      v.hinge.rotation.y = -v.open.step(dt) * 0.62;
      v.ribbon.scale.y = Math.max(0.001, v.read.step(dt));
      v.ribbon.position.y = BOOK.h / 2 + 0.02 - 0.31 * v.ribbon.scale.y;

      const found = this.filter !== null && passes && !path && !this.focused;
      v.glow.target = isFocus ? 0.75 : step >= 0 && step <= lit ? 0.6 : v === this.hovered ? 0.5 : found ? 0.55 : v.read.target * 0.16;
      this.paint(v, v.dim.step(dt), v.glow.step(dt));
    }
  }

  private paint(v: Volume, dim: number, glow: number): void {
    v.mats[0].color.setScalar(Math.max(0, dim));
    v.mats[1].color.set(this.domains[v.domain].color).multiplyScalar(0.55 * Math.max(0, dim));
    v.mats[2].color.setHex(0xe9dfc8).multiplyScalar(Math.max(0, dim));
    v.mats[3].color.setScalar(Math.max(0, dim));
    v.halo.material.opacity = Math.max(0, glow) * 0.5;
  }

  // ── input ──────────────────────────────────────────────────────────────────

  private interactive(): THREE.Mesh[] {
    if (!this.introDone) return [];
    if (this.path) return this.volumes.filter((v) => this.path!.includes(v.book.id)).map((v) => v.hit);
    if (this.focused) return [this.focused.hit];
    return this.volumes.filter((v) => v.domain === this.active && (!this.filter || this.filter.has(v.book.id))).map((v) => v.hit);
  }

  private pickHover(): void {
    let next: Volume | null = null;
    if (this.pointerPx.x >= 0) {
      const ndc = new THREE.Vector2((this.pointerPx.x / this.size.x) * 2 - 1, -(this.pointerPx.y / this.size.y) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      const hit = this.raycaster.intersectObjects(this.interactive(), false)[0];
      if (hit) next = this.byId.get(hit.object.userData.id as string) ?? null;
    }
    if (next !== this.hovered) {
      this.hovered = next;
      this.canvas.style.cursor = next ? 'pointer' : '';
      this.events.onHover(next && next !== this.focused ? next.book.id : null);
    }
  }

  private bindInput(): void {
    const el = this.canvas;
    let downX = 0;
    let downY = 0;
    el.addEventListener('pointermove', (e) => {
      this.pointerPx.set(e.clientX, e.clientY);
      this.pointer.set((e.clientX / this.size.x) * 2 - 1, (e.clientY / this.size.y) * 2 - 1);
    });
    el.addEventListener('pointerleave', () => this.pointerPx.set(-1, -1));
    el.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
      this.pointerPx.set(e.clientX, e.clientY);
    });
    el.addEventListener('pointerup', (e) => {
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        this.events.onTurn(dx < 0 ? 1 : -1);
        return;
      }
      if (Math.hypot(dx, dy) > 8) return;
      this.pointerPx.set(e.clientX, e.clientY);
      this.pickHover();
      this.events.onPick(this.hovered ? this.hovered.book.id : null);
      // Touch has no hover: do not leave a book lifted after a tap.
      if (e.pointerType !== 'mouse') this.pointerPx.set(-1, -1);
    });

    let wheel = 0;
    let lockedUntil = 0;
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (performance.now() < lockedUntil) return;
        wheel += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (Math.abs(wheel) > 70) {
          this.events.onTurn(wheel > 0 ? 1 : -1);
          wheel = 0;
          lockedUntil = performance.now() + 650;
        }
      },
      { passive: false }
    );
  }

  private resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.size.set(w, h);
    this.narrow = w / h < 0.9;
    this.camera.aspect = w / h;
    this.fov.target = this.narrow ? 56 : 40;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
  }
}
