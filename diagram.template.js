/*
 * SmarterDx — Solution diagram animation
 * WebGL (Three.js) line web + GSAP ScrollTrigger build of the Figma artboard
 * "Ai-Platform" (Design system, node 22-2247).
 *
 * Scroll build: solution circles pop in → connection lines draw from each
 * circle down into the Clinical AI box → box materializes as a digital
 * square build (top to bottom) → continuous data pulses flow circles → box.
 *
 * Cursor physics: circles are magnetized toward a nearby cursor (spring),
 * lines follow. The nearest circle becomes "focused": other circles dim,
 * only its paths stay lit, and an animated gradient stroke in that circle's
 * palette runs around the Clinical AI box.
 *
 * Usage (Webflow embed):
 *   <div id="sdx-solution-diagram"></div>
 *   <script type="module" src="https://.../diagram.js"></script>
 *
 * Fonts: Manrope (circle labels), Mona Sans (card titles), DM Mono (stat).
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';
import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger/+esm';

gsap.registerPlugin(ScrollTrigger);

const ASSETS = /*@ASSETS@*/ {};

/* ---------------------------------------------------------------- layout */

const STAGE_W = 1296;
const STAGE_H = 648;
const PAD_X = 72;              // artboard inner padding
const INNER_W = STAGE_W - PAD_X * 2;
const CIRCLE_D = 118.8;
const CIRCLE_R = CIRCLE_D / 2;
const ROW_Y = 22;              // circles top (headroom for pop + glow)
const LINES_TOP = ROW_Y + CIRCLE_D;
const BOX_TOP = LINES_TOP + 279;   // 279 = Figma "Artword" lines height
const BOX_H = 200;

const N_CIRCLES = 7;
const N_ENTRIES = 5;
const N_CURVES = N_CIRCLES * N_ENTRIES;
const SEGS = 48;
const LINE_HW = 0.85;          // ribbon half width in stage px

const STEP = (INNER_W - CIRCLE_D) / (N_CIRCLES - 1);
const centersX = Array.from({ length: N_CIRCLES }, (_, i) => PAD_X + CIRCLE_R + i * STEP);
const entriesX = Array.from({ length: N_ENTRIES }, (_, j) => PAD_X + INNER_W * (0.125 + j * 0.1875));

/* ----------------------------------------------------------------- data */

const SOLUTIONS = [
  { key: 'authorizations', label: 'Authorizations', icon: 'icon-authorizations', iw: 28.1, ih: 41.4, theme: 'teal',
    tagline: 'Automate prior authorizations' },
  { key: 'utilization',    label: 'Utilization',    icon: 'icon-utilization',    iw: 32.2, ih: 39.0, theme: 'teal',
    tagline: 'Streamline utilization review' },
  { key: 'notes',          label: 'Notes',          icon: 'icon-notes',          iw: 30.8, ih: 40.5, theme: 'teal',
    tagline: 'Strengthen clinical documentation' },
  { key: 'prebill',        label: 'Prebill',        icon: 'icon-prebill',        iw: 33.6, ih: 36.7, theme: 'blue',
    tagline: 'Audit every claim pre-bill' },
  { key: 'coding',         label: 'Coding',         icon: 'icon-coding',         iw: 39.5, ih: 39.5, theme: 'blue',
    tagline: 'Capture every code, every time' },
  { key: 'underpayments',  label: 'Underpayments',  icon: 'icon-underpayments',  iw: 30.8, ih: 38.8, theme: 'purple',
    tagline: 'Recover every underpayment' },
  { key: 'denials',        label: 'Denials',        icon: 'icon-denials',        iw: 30.9, ih: 40.7, theme: 'purple',
    tagline: 'Prevent and overturn denials' },
];

const ARROW_SVG = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1.5 6h9M7 2.5 10.5 6 7 9.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const THEMES = {
  teal:   { accent: '#00C8E2', hot: '#7FE9FF', border: '#00c8e2', dark: false,
            bg: 'linear-gradient(135deg,#d5faff 14.6%,#e0ebff 85.4%)' },
  blue:   { accent: '#3A7CFF', hot: '#8AB4FF', border: '#0257ff', dark: true,
            bg: 'linear-gradient(136deg,#0a2167 13%,#3a7cff 96%)' },
  purple: { accent: '#9985FF', hot: '#C3B5FF', border: '#7d64fc', dark: true,
            bg: 'linear-gradient(142deg,#361eae 17.5%,#9985ff 87.3%)' },
};

const CARDS = [
  { title: 'Clinical Intelligence',   icon: 'card-clinical' },
  { title: 'Payer Insight Engine',    icon: 'card-payer' },
  { title: 'Reinforcement Learning',  icon: 'card-reinforcement' },
  { title: 'Smart Analytics',         icon: 'card-analytics' },
];

const ENTRY_COLORS = ['#00C8E2', '#2FA4F2', '#3A7CFF', '#6E6BFD', '#9985FF'];

/* ------------------------------------------------------------------ css */

const CSS = `
.sdxg{position:relative;width:100%;font-family:'Manrope',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.sdxg *{box-sizing:border-box;margin:0;padding:0}
.sdxg-ratio{width:100%;padding-top:${(STAGE_H / STAGE_W * 100).toFixed(4)}%}
.sdxg-stage{position:absolute;top:0;left:0;width:${STAGE_W}px;height:${STAGE_H}px;transform-origin:0 0}
.sdxg-gl{position:absolute;inset:0;z-index:2;pointer-events:none}

.sdxg-node{position:absolute;width:${CIRCLE_D}px;height:${CIRCLE_D}px;border-radius:50%;z-index:3;
  border:0.72px solid;will-change:transform;transition:box-shadow .35s ease;cursor:pointer;
  -webkit-tap-highlight-color:transparent}
.sdxg-node:focus-visible{outline:2px solid #67c9ff;outline-offset:3px}
.sdxg-node .face,.sdxg-node .expand{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:3.2px}
.sdxg-node .face{transition:opacity .28s ease .14s}
.sdxg-node .expand{gap:7px;padding:0 13px;opacity:0;pointer-events:none;transition:opacity .28s ease}
.sdxg-node.is-open .face{opacity:0;transition-delay:0s}
.sdxg-node.is-open .expand{opacity:1;pointer-events:auto;transition-delay:.14s}
.sdxg-node img.ic{display:block}
.sdxg-node .expand img.ic{transform:scale(.72);margin:-4px 0}
.sdxg-node img.wm{display:block;width:38.4px;height:8.3px;margin-top:3px}
.sdxg-node .lb{font-weight:600;font-size:11.1px;letter-spacing:-.33px;line-height:.95;text-align:center;white-space:nowrap}
.sdxg-node .tg{font-weight:600;font-size:10.6px;line-height:1.25;letter-spacing:-.2px;text-align:center}
.sdxg-node .go{width:25px;height:25px;border-radius:50%;border:1px solid;display:flex;align-items:center;
  justify-content:center;flex:none;text-decoration:none;
  transition:transform .2s ease,background-color .2s ease}
.sdxg-node .go:hover{transform:translateX(2.5px)}
.sdxg-node.dark .lb,.sdxg-node.dark .tg{color:#fff}
.sdxg-node.dark .go{color:#fff;border-color:rgba(255,255,255,.65)}
.sdxg-node.dark .go:hover{background:rgba(255,255,255,.16)}
.sdxg-node.light .lb,.sdxg-node.light .tg{color:#051137}
.sdxg-node.light .go{color:#051137;border-color:rgba(5,17,55,.4)}
.sdxg-node.light .go:hover{background:rgba(5,17,55,.08)}
.sdxg-node .halo{position:absolute;inset:-1px;border-radius:50%;opacity:0;transition:opacity .35s ease;pointer-events:none}
.sdxg-node.is-hot{z-index:4}
.sdxg-node.is-hot .halo{opacity:1}
.sdxg-node.is-open{z-index:6}
.sdxg-node.is-open .halo{opacity:1}
@media (prefers-reduced-motion:reduce){.sdxg-node .face,.sdxg-node .expand,.sdxg-node .go{transition:none}}
.sdxg-node.is-dim{transition:opacity .4s ease,filter .4s ease}
.sdxg-nodes.focused .sdxg-node:not(.is-hot){opacity:.3;filter:saturate(.35)}
.sdxg-nodes .sdxg-node{opacity:1;filter:none;transition:opacity .4s ease,filter .4s ease,box-shadow .35s ease}

.sdxg-box{position:absolute;left:${PAD_X}px;top:${BOX_TOP}px;width:${INNER_W}px;height:${BOX_H}px;z-index:3;
  border-radius:21.6px;padding:21.6px;display:flex;flex-direction:column;gap:14px;align-items:center;
  background:linear-gradient(90deg,rgba(2,87,255,.25) 0%,rgba(0,200,226,.25) 38.25%,rgba(103,74,249,.25) 100%);
  border-bottom:1.8px solid #67c9ff}
.sdxg-cards{display:flex;gap:21.6px;width:100%;flex:1}
.sdxg-card{flex:1 0 0;min-width:1px;border-radius:21.6px;padding:24px 21.6px;position:relative;overflow:hidden;
  display:flex;flex-direction:column;gap:14.4px;align-items:flex-start;justify-content:center;
  background:linear-gradient(156deg,#d5faff 14.6%,#e0ebff 85.4%);
  box-shadow:0 3.6px 0 0 rgba(0,0,0,.15)}
.sdxg-card::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.55) 50%,transparent 58%)}
.sdxg-card img{width:25.2px;height:25.2px;display:block}
.sdxg-card p{font-family:'Mona Sans','Manrope',sans-serif;font-weight:500;font-size:18.9px;line-height:1.02;color:#051137}
.sdxg-stat{display:flex;align-items:center;gap:21.6px;width:calc(100% - 43.2px);flex:none}
.sdxg-stat .ln{flex:1;height:1px;position:relative;background:linear-gradient(90deg,rgba(149,180,239,.15),rgba(149,180,239,.65))}
.sdxg-stat .ln.r{background:linear-gradient(90deg,rgba(149,180,239,.65),rgba(149,180,239,.15))}
.sdxg-stat .ln::before{content:'';position:absolute;top:-1.5px;width:4px;height:4px;border-radius:50%;background:#95b4ef}
.sdxg-stat .ln.l::before{left:0}
.sdxg-stat .ln.r::before{right:0}
.sdxg-stat .tx{font-family:'DM Mono',monospace;font-weight:500;font-size:12.6px;letter-spacing:.76px;color:#95b4ef;white-space:nowrap}

.sdxg-stroke{position:absolute;left:-6px;top:-6px;width:calc(100% + 12px);height:calc(100% + 12px);
  overflow:visible;pointer-events:none;z-index:5}
.sdxg-pixels{position:absolute;left:${PAD_X - 8}px;top:${BOX_TOP - 8}px;width:${INNER_W + 16}px;height:${BOX_H + 16}px;
  z-index:6;pointer-events:none}
@media (prefers-reduced-motion:reduce){.sdxg-card::after{display:none}}
`;

/* ------------------------------------------------------------------ dom */

function buildDOM(mount) {
  mount.classList.add('sdxg');
  const dataset = mount.dataset;
  const cap = (k) => k.charAt(0).toUpperCase() + k.slice(1);
  const nodesHTML = SOLUTIONS.map((s, i) => {
    const t = THEMES[s.theme];
    const wm = t.dark ? ASSETS['smarter-light'] : ASSETS['smarter-dark'];
    const tagline = dataset['tagline' + cap(s.key)] || s.tagline;
    const url = dataset['url' + cap(s.key)] || '#';
    return `<div class="sdxg-node ${t.dark ? 'dark' : 'light'}" data-i="${i}" role="button" tabindex="0"
      aria-expanded="false" aria-label="Smarter ${s.label}"
      style="left:${(centersX[i] - CIRCLE_R).toFixed(1)}px;top:${ROW_Y}px;background:${t.bg};border-color:${t.border}">
      <span class="halo" style="box-shadow:0 0 34px 4px ${t.accent}66,0 0 90px 12px ${t.accent}33"></span>
      <div class="face">
        <img class="ic" src="${ASSETS[s.icon]}" alt="" width="${s.iw}" height="${s.ih}" draggable="false">
        <img class="wm" src="${wm}" alt="Smarter" draggable="false">
        <span class="lb">${s.label}</span>
      </div>
      <div class="expand">
        <img class="ic" src="${ASSETS[s.icon]}" alt="" width="${s.iw}" height="${s.ih}" draggable="false">
        <span class="tg">${tagline}</span>
        <a class="go" href="${url}" aria-label="Smarter ${s.label} — ${tagline}">${ARROW_SVG}</a>
      </div>
    </div>`;
  }).join('');

  const cardsHTML = CARDS.map((c) =>
    `<div class="sdxg-card"><img src="${ASSETS[c.icon]}" alt=""><p>${c.title}</p></div>`).join('');

  mount.innerHTML = `<div class="sdxg-ratio"></div>
  <div class="sdxg-stage">
    <canvas class="sdxg-gl"></canvas>
    <div class="sdxg-nodes">${nodesHTML}</div>
    <div class="sdxg-box">
      <svg class="sdxg-stroke" viewBox="-6 -6 ${INNER_W + 12} ${BOX_H + 12}" fill="none">
        <defs>
          <linearGradient id="sdxg-grad" gradientUnits="userSpaceOnUse"
            x1="0" y1="0" x2="${INNER_W}" y2="${BOX_H}">
            <stop offset="0" stop-color="#00C8E2"/><stop offset="1" stop-color="#7FE9FF"/>
          </linearGradient>
        </defs>
        <rect class="base" x="0" y="0" width="${INNER_W}" height="${BOX_H}" rx="21.6"
          stroke="url(#sdxg-grad)" stroke-width="1.6" opacity="0"/>
        <rect class="flow" x="0" y="0" width="${INNER_W}" height="${BOX_H}" rx="21.6"
          stroke="url(#sdxg-grad)" stroke-width="2.6" pathLength="100"
          stroke-dasharray="7 18" stroke-linecap="round" opacity="0"/>
      </svg>
      <div class="sdxg-cards">${cardsHTML}</div>
      <div class="sdxg-stat"><span class="ln l"></span><span class="tx">SMARTERDX CLINICAL AI</span><span class="ln r"></span></div>
    </div>
    <canvas class="sdxg-pixels"></canvas>
  </div>`;
}

/* -------------------------------------------------------------- geometry */

// Cubic bezier through vertical tangents: circle bottom -> box entry.
function curvePoint(out, t, x0, y0, x3, y3) {
  const x1 = x0, y1 = y0 + 112;
  const x2 = x3, y2 = y3 - 118;
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  out.x = a * x0 + b * x1 + c * x2 + d * x3;
  out.y = a * y0 + b * y1 + c * y2 + d * y3;
  // derivative for normal
  const dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
  const dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2);
  const len = Math.hypot(dx, dy) || 1;
  out.nx = -dy / len; out.ny = dx / len;
  return out;
}

/* ---------------------------------------------------------------- webgl */

function makeGL(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(0, STAGE_W, 0, -STAGE_H, -100, 100);

  /* --- ribbon lines --- */
  const vertsPerCurve = (SEGS + 1) * 2;
  const nVerts = N_CURVES * vertsPerCurve;
  const pos = new Float32Array(nVerts * 3);
  const aT = new Float32Array(nVerts);
  const aCircle = new Float32Array(nVerts);
  const aPhase = new Float32Array(nVerts);
  const aColor = new Float32Array(nVerts * 3);
  const idx = [];

  const colorOf = (i) => new THREE.Color(THEMES[SOLUTIONS[i].theme].accent);

  let v = 0;
  for (let c = 0; c < N_CURVES; c++) {
    const ci = Math.floor(c / N_ENTRIES);
    const col = colorOf(ci);
    const phase = (c * 0.618) % 1;
    for (let s = 0; s <= SEGS; s++) {
      const t = s / SEGS;
      for (let k = 0; k < 2; k++) {
        aT[v] = t; aCircle[v] = ci; aPhase[v] = phase;
        aColor.set([col.r, col.g, col.b], v * 3);
        v++;
      }
    }
    const base = c * vertsPerCurve;
    for (let s = 0; s < SEGS; s++) {
      const p = base + s * 2;
      idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  geo.setAttribute('aCircle', new THREE.BufferAttribute(aCircle, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3));
  geo.setIndex(idx);

  const uniforms = {
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uFocus: { value: -1 },
    uFocusAmt: { value: 0 },
    uProg: { value: new Float32Array(N_CIRCLES) },
  };

  const lineMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms,
    vertexShader: `
      attribute float aT; attribute float aCircle; attribute float aPhase; attribute vec3 aColor;
      uniform float uProg[${N_CIRCLES}]; uniform float uTime, uPulse, uFocus, uFocusAmt;
      varying vec3 vC; varying float vA; varying float vG;
      void main(){
        float prog = uProg[int(aCircle + 0.5)];
        float reveal = 1.0 - smoothstep(prog - 0.04, prog, aT);
        float tip = exp(-pow((aT - prog) * 55.0, 2.0)) * step(0.001, prog) * (1.0 - step(0.995, prog));
        float focused = 1.0 - step(0.5, abs(aCircle - uFocus));
        float dimf = mix(1.0, mix(0.09, 1.8, focused), uFocusAmt);
        float head = fract(uTime * 0.21 + aPhase);
        float g = exp(-pow((aT - head) * 15.0, 2.0)) * step(head - 0.06, prog);
        float dimg = mix(1.0, mix(0.05, 1.7, focused), uFocusAmt);
        vG = (g * uPulse * 0.9 + tip * 2.2) * reveal * dimg;
        vA = (0.40 + 0.30 * g * uPulse) * reveal * dimf;
        vC = aColor;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      precision mediump float;
      varying vec3 vC; varying float vA; varying float vG;
      void main(){
        vec3 c = vC + (vC * 0.5 + vec3(0.5)) * vG * 0.85;
        gl_FragColor = vec4(c, clamp(vA + vG * 0.55, 0.0, 1.0));
        if (gl_FragColor.a < 0.004) discard;
      }`,
  });
  const mesh = new THREE.Mesh(geo, lineMat);
  mesh.frustumCulled = false;
  scene.add(mesh);

  /* --- pulse heads + entry glows (point sprites, additive) --- */
  const nPts = N_CURVES + N_ENTRIES;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(nPts * 3);
  const pCol = new Float32Array(nPts * 3);
  const pA = new Float32Array(nPts);
  const pS = new Float32Array(nPts);
  for (let c = 0; c < N_CURVES; c++) {
    const col = colorOf(Math.floor(c / N_ENTRIES));
    pCol.set([col.r, col.g, col.b], c * 3);
    pS[c] = 9;
  }
  for (let j = 0; j < N_ENTRIES; j++) {
    const col = new THREE.Color(ENTRY_COLORS[j]);
    const i = N_CURVES + j;
    pCol.set([col.r, col.g, col.b], i * 3);
    pS[i] = 30;
    pPos[i * 3] = entriesX[j]; pPos[i * 3 + 1] = -BOX_TOP; pPos[i * 3 + 2] = 1;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(pA, 1));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pS, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 1 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aAlpha; attribute float aSize;
      uniform float uScale; varying vec3 vC; varying float vA;
      void main(){
        vC = aColor; vA = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale;
      }`,
    fragmentShader: `
      precision mediump float;
      varying vec3 vC; varying float vA;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float m = smoothstep(0.5, 0.02, length(d));
        gl_FragColor = vec4(vC, vA * m * m);
      }`,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  /* --- per-frame update --- */
  const P = { x: 0, y: 0, nx: 0, ny: 0 };
  const state = {
    disp: Array.from({ length: N_CIRCLES }, () => ({ x: 0, y: 0 })),
    pulse: 0, focus: -1, focusAmt: 0,
    prog: new Float32Array(N_CIRCLES),
  };

  function update(time) {
    uniforms.uTime.value = time;
    uniforms.uPulse.value = state.pulse;
    uniforms.uFocus.value = state.focus;
    uniforms.uFocusAmt.value = state.focusAmt;
    uniforms.uProg.value.set(state.prog);

    let v3 = 0;
    for (let c = 0; c < N_CURVES; c++) {
      const ci = Math.floor(c / N_ENTRIES);
      const ei = c % N_ENTRIES;
      const d = state.disp[ci];
      const x0 = centersX[ci] + d.x, y0 = ROW_Y + CIRCLE_D + d.y * 0.9;
      const x3 = entriesX[ei], y3 = BOX_TOP + 2;
      for (let s = 0; s <= SEGS; s++) {
        curvePoint(P, s / SEGS, x0, y0, x3, y3);
        pos[v3]     = P.x + P.nx * LINE_HW; pos[v3 + 1] = -(P.y + P.ny * LINE_HW); pos[v3 + 2] = 0;
        pos[v3 + 3] = P.x - P.nx * LINE_HW; pos[v3 + 4] = -(P.y - P.ny * LINE_HW); pos[v3 + 5] = 0;
        v3 += 6;
      }
      // pulse head position
      const phase = (c * 0.618) % 1;
      const ht = (time * 0.21 + phase) % 1;
      curvePoint(P, ht, x0, y0, x3, y3);
      pPos[c * 3] = P.x; pPos[c * 3 + 1] = -P.y; pPos[c * 3 + 2] = 1;
      const focused = state.focus === ci ? 1 : 0;
      const dimf = 1 + state.focusAmt * (focused ? 1.2 : -0.94);
      const drawn = ht < state.prog[ci] ? 1 : 0;
      pA[c] = 0.5 * state.pulse * drawn * dimf * Math.sin(ht * Math.PI);
    }
    for (let j = 0; j < N_ENTRIES; j++) {
      pA[N_CURVES + j] = state.pulse * (0.10 + 0.05 * Math.sin(time * 1.8 + j)) *
        (1 - state.focusAmt * 0.55);
    }
    geo.attributes.position.needsUpdate = true;
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aAlpha.needsUpdate = true;
    renderer.render(scene, cam);
  }

  function resize(w, h) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    pMat.uniforms.uScale.value = (h / STAGE_H) * Math.min(window.devicePixelRatio || 1, 2);
  }

  return { update, resize, state };
}

/* ----------------------------------------------------- pixel-build layer */

function makePixelBuild(canvas) {
  const W = INNER_W + 16, H = BOX_H + 16;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const CELL = 16;
  const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
  const rnd = Array.from({ length: cols * rows }, () => Math.random());

  function grad(x) {
    // teal -> blue -> purple across box width
    const c1 = [0, 200, 226], c2 = [58, 124, 255], c3 = [153, 133, 255];
    const t = x / W;
    const [a, b, tt] = t < 0.5 ? [c1, c2, t * 2] : [c2, c3, (t - 0.5) * 2];
    return a.map((v0, i) => Math.round(v0 + (b[i] - v0) * tt));
  }

  return function draw(p) {
    ctx.clearRect(0, 0, W, H);
    if (p <= 0 || p >= 1) return;
    const front = p * (rows + 3) - 1.5; // leading edge row (fractional)
    for (let r = 0; r < rows; r++) {
      const dRow = front - r;
      if (dRow < -1 || dRow > 2.6) continue;
      for (let cIdx = 0; cIdx < cols; cIdx++) {
        const z = rnd[r * cols + cIdx];
        const flick = Math.max(0, 1 - Math.abs(dRow - z * 1.6) / 1.1);
        if (flick <= 0.02) continue;
        const [cr, cg, cb] = grad(cIdx * CELL);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${(flick * (0.14 + z * 0.5)).toFixed(3)})`;
        ctx.fillRect(cIdx * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      }
    }
  };
}

/* ---------------------------------------------------------------- fonts */

function ensureFonts() {
  if (document.querySelector('link[data-sdxg-fonts]')) return;
  const pre = document.createElement('link');
  pre.rel = 'preconnect'; pre.href = 'https://fonts.gstatic.com'; pre.crossOrigin = '';
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.dataset.sdxgFonts = '1';
  l.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@600;700&family=Mona+Sans:wght@500;600&family=DM+Mono:wght@500&display=swap';
  document.head.append(pre, l);
}

/* ----------------------------------------------------------------- init */

function init(mount) {
  ensureFonts();
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  buildDOM(mount);

  const stage = mount.querySelector('.sdxg-stage');
  const glCanvas = mount.querySelector('.sdxg-gl');
  const nodesWrap = mount.querySelector('.sdxg-nodes');
  const nodes = [...mount.querySelectorAll('.sdxg-node')];
  const box = mount.querySelector('.sdxg-box');
  const cards = [...mount.querySelectorAll('.sdxg-card')];
  const stat = mount.querySelector('.sdxg-stat');
  const strokeBase = mount.querySelector('.sdxg-stroke .base');
  const strokeFlow = mount.querySelector('.sdxg-stroke .flow');
  const gradEl = mount.querySelector('#sdxg-grad');
  const gradStops = gradEl.querySelectorAll('stop');
  const pixCanvas = mount.querySelector('.sdxg-pixels');

  const gl = makeGL(glCanvas);
  const drawPixels = makePixelBuild(pixCanvas);
  const S = gl.state;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* sizing */
  function fit() {
    let el = mount;
    for (let i = 0; el && i < 4; i++) {
      if (el.getBoundingClientRect().width === 0) {
        el.style.setProperty('width', '100%');
        el.style.setProperty('min-width', '0');
      }
      el = el.parentElement;
    }
    const w = mount.clientWidth;
    stage.style.transform = `scale(${w / STAGE_W})`;
    gl.resize(w, w * STAGE_H / STAGE_W);
  }
  fit();
  new ResizeObserver(fit).observe(mount);

  /* ---------------------------------------------------- click expand/open */
  const OPEN_SCALE = 1.34;
  let openIdx = -1;

  function setOpen(i, instant) {
    if (i === openIdx) return;
    const dur = instant ? 0 : 0.45;
    if (openIdx >= 0) {
      const prev = nodes[openIdx];
      prev.classList.remove('is-open');
      prev.setAttribute('aria-expanded', 'false');
      gsap.to(prev, { scale: 1, duration: dur, ease: 'power3.out' });
    }
    openIdx = i;
    if (i >= 0) {
      const n = nodes[i];
      n.classList.add('is-open');
      n.setAttribute('aria-expanded', 'true');
      gsap.to(n, { scale: OPEN_SCALE, duration: dur, ease: 'back.out(1.5)' });
    }
  }

  function wireClicks(instant) {
    nodes.forEach((n, i) => {
      n.addEventListener('click', (e) => {
        if (e.target.closest('.go')) return;      // arrow navigates, doesn't toggle
        setOpen(openIdx === i ? -1 : i, instant);
      });
      n.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(openIdx === i ? -1 : i, instant); }
      });
    });
    document.addEventListener('click', (e) => {
      if (openIdx >= 0 && !e.target.closest('.sdxg-node')) setOpen(-1, instant);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(-1, instant);
    });
  }

  /* ------------------------------------------------ reduced motion: static */
  if (reduced) {
    S.prog.fill(1); S.pulse = 0;
    gsap.set(box, { clipPath: 'none' });
    gl.update(0);
    wireClicks(true);
    return { destroy() {} };
  }
  wireClicks(false);

  /* ------------------------------------------------------- magnet physics */
  const MAG_SIGMA = 150, MAG_K = 0.38, MAG_MAX = 26, FOCUS_DIST = 165;
  const vel = Array.from({ length: N_CIRCLES }, () => ({ x: 0, y: 0 }));
  const pointer = { x: -9999, y: -9999, inside: false };
  let built = false;

  mount.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const sc = r.width / STAGE_W;
    pointer.x = (e.clientX - r.left) / sc;
    pointer.y = (e.clientY - r.top) / sc;
    pointer.inside = true;
  });
  mount.addEventListener('pointerleave', () => { pointer.inside = false; pointer.x = pointer.y = -9999; });

  /* focus state + gradient stroke */
  let focusIdx = -1;
  let strokeSpin = null;
  const focusProxy = { amt: 0 };

  function spinStroke(theme) {
    gradStops[0].setAttribute('stop-color', theme.accent);
    gradStops[1].setAttribute('stop-color', theme.hot);
    if (strokeSpin) strokeSpin.kill();
    const g = { a: 0 };
    strokeSpin = gsap.timeline()
      .to(strokeFlow, { attr: { 'stroke-dashoffset': -100 }, duration: 2.4, ease: 'none', repeat: -1 }, 0)
      .to(g, {
        a: Math.PI * 2, duration: 5, ease: 'none', repeat: -1,
        onUpdate() {
          const cx = INNER_W / 2, cy = BOX_H / 2, R = INNER_W * 0.62;
          gradEl.setAttribute('x1', cx + Math.cos(g.a) * R);
          gradEl.setAttribute('y1', cy + Math.sin(g.a) * R);
          gradEl.setAttribute('x2', cx - Math.cos(g.a) * R);
          gradEl.setAttribute('y2', cy - Math.sin(g.a) * R);
        },
      }, 0);
  }

  function setFocus(i) {
    if (i === focusIdx) return;
    const apply = () => {
      focusIdx = i;
      S.focus = i;
      nodes.forEach((n, k) => n.classList.toggle('is-hot', k === i));
      nodesWrap.classList.toggle('focused', i >= 0);
      if (i >= 0) {
        const theme = THEMES[SOLUTIONS[i].theme];
        spinStroke(theme);
        gsap.to(strokeBase, { opacity: 0.75, duration: 0.4 });
        gsap.to(strokeFlow, { opacity: 0.95, duration: 0.4 });
        gsap.to(focusProxy, { amt: 1, duration: 0.45, ease: 'power2.out', onUpdate: () => S.focusAmt = focusProxy.amt });
      } else {
        gsap.to([strokeBase, strokeFlow], { opacity: 0, duration: 0.5, onComplete: () => strokeSpin && strokeSpin.kill() });
        gsap.to(focusProxy, { amt: 0, duration: 0.5, ease: 'power2.out', onUpdate: () => S.focusAmt = focusProxy.amt });
      }
    };
    if (focusIdx >= 0 && i >= 0) {
      // crossfade through zero so the shader focus index never pops
      gsap.to(focusProxy, {
        amt: 0, duration: 0.16, ease: 'power1.in',
        onUpdate: () => S.focusAmt = focusProxy.amt, onComplete: apply,
      });
    } else apply();
  }

  function physics() {
    let nearest = -1, nearestD = 1e9;
    for (let i = 0; i < N_CIRCLES; i++) {
      const cx = centersX[i], cy = ROW_Y + CIRCLE_R;
      const dx = pointer.x - cx, dy = pointer.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < nearestD) { nearestD = dist; nearest = i; }
      let tx = 0, ty = 0;
      if (pointer.inside && built && i !== openIdx) {   // open circle holds still for reading
        const pull = MAG_K * Math.exp(-(dist * dist) / (2 * MAG_SIGMA * MAG_SIGMA));
        tx = dx * pull; ty = dy * pull;
        const m = Math.hypot(tx, ty);
        if (m > MAG_MAX) { tx *= MAG_MAX / m; ty *= MAG_MAX / m; }
      }
      const d = S.disp[i], vv = vel[i];
      vv.x = (vv.x + (tx - d.x) * 0.09) * 0.80;
      vv.y = (vv.y + (ty - d.y) * 0.09) * 0.80;
      d.x += vv.x; d.y += vv.y;
      gsap.set(nodes[i], { x: d.x, y: d.y });
    }
    // an open circle locks focus (dim others + gradient stroke) until closed
    setFocus(openIdx >= 0 ? openIdx
      : (pointer.inside && built && nearestD < FOCUS_DIST ? nearest : -1));
  }

  /* -------------------------------------------------------- scroll build */
  const progProxy = Array.from({ length: N_CIRCLES }, () => ({ v: 0 }));
  const pixProxy = { p: 0 };
  const pulseProxy = { v: 0 };

  gsap.set(nodes, { y: -26, scale: 0.55, opacity: 0, transformOrigin: '50% 50%' });
  gsap.set(box, { clipPath: 'inset(-8px -8px 105% -8px)' });
  gsap.set(cards, { y: 16, opacity: 0 });
  gsap.set(stat, { opacity: 0 });

  const build = gsap.timeline({
    scrollTrigger: {
      trigger: mount,
      start: 'top 72%',
      toggleActions: 'play none none reverse',
    },
    defaults: { ease: 'power3.out' },
    onComplete: () => { built = true; },
    onReverseComplete: () => { built = false; setOpen(-1); },
  });

  build.to(nodes, { y: 0, scale: 1, opacity: 1, duration: 0.7, stagger: 0.09, ease: 'back.out(1.6)' }, 0);
  progProxy.forEach((p, i) => {
    build.to(p, {
      v: 1, duration: 0.9, ease: 'power2.inOut',
      onUpdate: () => { S.prog[i] = p.v; },
    }, 0.38 + i * 0.09);
  });
  build.to(pixProxy, {
    p: 1, duration: 1.0, ease: 'power1.inOut',
    onUpdate: () => drawPixels(pixProxy.p),
  }, 1.15);
  build.to(box, { clipPath: 'inset(-8px -8px 0% -8px)', duration: 1.0, ease: 'power1.inOut' }, 1.15);
  build.to(cards, { y: 0, opacity: 1, duration: 0.55, stagger: 0.08 }, 1.5);
  build.to(stat, { opacity: 1, duration: 0.5 }, 2.0);
  build.to(pulseProxy, {
    v: 1, duration: 0.9, ease: 'sine.inOut',
    onUpdate: () => { S.pulse = pulseProxy.v; },
  }, 1.9);

  /* ------------------------------------------------------------ run loop */
  let raf = null, t0 = performance.now(), visible = true;
  function tick(now) {
    const t = (now - t0) / 1000;
    physics();
    gl.update(t);
    raf = requestAnimationFrame(tick);
  }
  function setRunning(on) {
    if (on && raf === null) raf = requestAnimationFrame(tick);
    if (!on && raf !== null) { cancelAnimationFrame(raf); raf = null; }
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    setRunning(visible && !document.hidden);
  }, { threshold: 0.02 }).observe(mount);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));
  setRunning(true);

  /* QA hooks — headless verification (rAF may be suspended in embedded panes) */
  window.__sdxg = {
    gsap,
    seek(p, t = 3) { build.scrollTrigger && build.scrollTrigger.disable(false); build.pause().progress(p); physics(); gl.update(t); drawPixels(pixProxy.p); },
    frame(t) { physics(); gl.update(t); },
    focus(i) { pointer.inside = true; built = true; setFocus(i); },
    pointer(x, y) { pointer.x = x; pointer.y = y; pointer.inside = true; },
    open(i) { built = true; setOpen(i); },
    state: S,
  };

  return { destroy() { setRunning(false); build.kill(); } };
}

const mountEl = document.getElementById('sdx-solution-diagram');
if (mountEl) init(mountEl);
export { init };
