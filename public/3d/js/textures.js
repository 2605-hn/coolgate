// File: public/3d/js/textures.js
// Texture vẽ bằng Canvas 2D (không cần file ảnh). Dùng bộ sinh số ngẫu nhiên cố định
// để mỗi lần chạy hình ảnh giống nhau.
import * as THREE from "three";

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size, draw) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  return c;
}

function toTexture(canvas, anisotropy) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

/** Ván sàn gỗ: các tấm ngang, mỗi tấm một sắc độ. */
function floorCanvas() {
  const r = rng(11);
  return makeCanvas(512, (g, s) => {
    const rows = 8, h = s / rows;
    for (let i = 0; i < rows; i++) {
      const tone = 52 + r() * 22;
      g.fillStyle = `rgb(${tone + 18},${tone},${tone - 18})`;
      g.fillRect(0, i * h, s, h);
      // vân gỗ
      for (let k = 0; k < 40; k++) {
        g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.06})`;
        g.fillRect(r() * s, i * h + r() * h, 30 + r() * 140, 1);
      }
      // mối ghép giữa các ván
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.fillRect(0, i * h, s, 2);
      g.fillRect(((i * 173) % s), i * h, 2, h);
    }
  });
}

/** Nền gạch tối cho phòng phụ. */
function tileCanvas() {
  const r = rng(23);
  return makeCanvas(512, (g, s) => {
    const n = 4, w = s / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const tone = 58 + r() * 18;
        g.fillStyle = `rgb(${tone},${tone + 4},${tone})`;
        g.fillRect(x * w, y * w, w, w);
        for (let k = 0; k < 60; k++) {
          g.fillStyle = `rgba(0,0,0,${r() * 0.07})`;
          g.fillRect(x * w + r() * w, y * w + r() * w, 2 + r() * 8, 2 + r() * 8);
        }
      }
    }
    g.strokeStyle = "rgba(0,0,0,0.6)";
    g.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, s); g.stroke();
      g.beginPath(); g.moveTo(0, i * w); g.lineTo(s, i * w); g.stroke();
    }
  });
}

/** Tường vôi ngả vàng, ẩm mốc ở chân tường. Một ô = 3.2m x 3.2m (đúng chiều cao tường). */
function plasterCanvas() {
  const r = rng(37);
  return makeCanvas(512, (g, s) => {
    g.fillStyle = "#b3a68a";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2500; i++) {
      const v = r();
      g.fillStyle = v > 0.5 ? `rgba(255,245,215,${r() * 0.05})` : `rgba(40,30,15,${r() * 0.07})`;
      const w = 2 + r() * 14;
      g.fillRect(r() * s, r() * s, w, w);
    }
    // ẩm mốc từ chân tường lên (đáy canvas = chân tường)
    const grad = g.createLinearGradient(0, s * 0.55, 0, s);
    grad.addColorStop(0, "rgba(30,28,18,0)");
    grad.addColorStop(1, "rgba(30,28,18,0.55)");
    g.fillStyle = grad;
    g.fillRect(0, s * 0.55, s, s * 0.45);
    // vết loang
    for (let i = 0; i < 7; i++) {
      const x = r() * s, y = r() * s * 0.8, rad = 20 + r() * 50;
      const rg = g.createRadialGradient(x, y, 0, x, y, rad);
      rg.addColorStop(0, "rgba(50,40,20,0.18)");
      rg.addColorStop(1, "rgba(50,40,20,0)");
      g.fillStyle = rg;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });
}

/** Gỗ sẫm (dầm, đồ nội thất). */
function darkWoodCanvas() {
  const r = rng(51);
  return makeCanvas(256, (g, s) => {
    g.fillStyle = "#4a3222";
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? "0,0,0" : "120,80,50"},${0.04 + r() * 0.08})`;
      g.fillRect(0, r() * s, s, 1 + r() * 2);
    }
  });
}

export function createTextures(anisotropy = 4) {
  return {
    floor: toTexture(floorCanvas(), anisotropy),
    tile: toTexture(tileCanvas(), anisotropy),
    plaster: toTexture(plasterCanvas(), anisotropy),
    darkWood: toTexture(darkWoodCanvas(), anisotropy),
  };
}

/** Bản sao texture với số lần lặp riêng (dùng chung ảnh nguồn, không tốn thêm bộ nhớ ảnh). */
export function withRepeat(tex, rx, ry) {
  const t = tex.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}
