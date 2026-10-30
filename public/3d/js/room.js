// File: public/3d/js/room.js
// Dựng "Nhà từ đường" thử nghiệm: gian chính + gian phụ nối bằng một ô cửa.
// Đơn vị: mét. Trục Y hướng lên, mặt sàn ở y = 0. Mặt phẳng di chuyển là XZ.
//
//            z = -4.5  ┌──────────────────────────┬────────────────┐
//                      │  bàn thờ                 │ giường (phản)  │
//                      │                          │                │
//                      │   bàn + 4 ghế (thảm)     ◄ cửa thông      │
//   cửa chính (z=+4.5) │ tủ    rương              │  kệ, chum      │
//            z = +4.5  └──────────────────────────┴────────────────┘
//                     x=-6                      x=4              x=9
import * as THREE from "three";
import { createTextures, withRepeat } from "./textures.js";

export const WALL_H = 3.2;
export const BOUNDS = { minX: -6, maxX: 9, minZ: -4.5, maxZ: 4.5 };
export const SPAWN = { x: -2, z: 3.0, yaw: 0 }; // đứng gần cửa chính, nhìn về phía bàn thờ

const PARTITION_X = 4;      // tường ngăn giữa hai gian
const DOOR_HALF = 0.6;      // ô cửa rộng 1.2m
const DOOR_H = 2.1;

export function buildRoom(anisotropy = 4) {
  const group = new THREE.Group();
  const colliders = [];       // các hộp chữ nhật chặn người chơi (mặt phẳng XZ)
  const tex = createTextures(anisotropy);

  // ---------- Vật liệu dùng chung ----------
  const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...opts });
  const mat = {
    wood: std({ map: tex.darkWood }),
    woodLight: std({ color: 0x8a6a45 }),
    woodDark: std({ color: 0x2f2016 }),
    brass: std({ color: 0xb08d3c, roughness: 0.4, metalness: 0.35 }),
    iron: std({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.3 }),
    red: std({ color: 0x6b1d1d }),
    gold: std({ color: 0xb8923a, roughness: 0.5, metalness: 0.3 }),
    candle: std({ color: 0xe8e0cc }),
    mat: std({ color: 0x8a7a55 }),
    cloth: std({ color: 0x3b3a35 }),
    ceramic: std({ color: 0x6d5b45, roughness: 0.6 }),
    frameInner: std({ color: 0x1c1c1c }),
    flame: new THREE.MeshBasicMaterial({ color: 0xffc66a }),
    ember: new THREE.MeshBasicMaterial({ color: 0xff7a2a }),
    window: new THREE.MeshBasicMaterial({ color: 0x1b2c44 }),
  };

  const unit = new THREE.BoxGeometry(1, 1, 1); // hộp đơn vị, co giãn bằng mesh.scale

  // ---------- Hàm tiện ích ----------
  function addCollider(cx, cz, w, d, ry = 0) {
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const ex = (c * w + s * d) / 2, ez = (s * w + c * d) / 2;
    colliders.push({ minX: cx - ex, maxX: cx + ex, minZ: cz - ez, maxZ: cz + ez });
  }

  /** Hộp kích thước (w,h,d), tâm đáy tại (x, yBottom, z). */
  function box(w, h, d, material, x, yBottom, z, o = {}) {
    const m = new THREE.Mesh(unit, material);
    m.scale.set(w, h, d);
    m.position.set(x, yBottom + h / 2, z);
    if (o.ry) m.rotation.y = o.ry;
    (o.parent || group).add(m);
    if (o.collide) addCollider(x, z, w, d, o.ry || 0);
    return m;
  }

  function cylinder(rTop, rBottom, h, material, x, yBottom, z, o = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, 20), material);
    m.position.set(x, yBottom + h / 2, z);
    (o.parent || group).add(m);
    if (o.collide) addCollider(x, z, Math.max(rTop, rBottom) * 2, Math.max(rTop, rBottom) * 2);
    return m;
  }

  function sphere(r, material, x, y, z, sy = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), material);
    m.position.set(x, y, z);
    m.scale.y = sy;
    group.add(m);
    return m;
  }

  /** Một đoạn tường (khoảng x, z, độ cao). Texture lặp theo kích thước thật và khớp nhau giữa các đoạn. */
  function wall(minX, maxX, minZ, maxZ, o = {}) {
    const yb = o.yBottom ?? 0;
    const h = o.height ?? WALL_H;
    const w = maxX - minX, d = maxZ - minZ;
    const alongX = w >= d;
    const map = withRepeat(tex.plaster, Math.max(w, d) / WALL_H, h / WALL_H);
    map.offset.set((alongX ? minX : minZ) / WALL_H, yb / WALL_H);
    const m = box(w, h, d, std({ map, roughness: 0.95 }), (minX + maxX) / 2, yb, (minZ + maxZ) / 2);
    if (o.collide !== false) {
      colliders.push({ minX, maxX, minZ, maxZ });
    }
    return m;
  }

  // ---------- Sàn và trần ----------
  const hallW = PARTITION_X - BOUNDS.minX, annexW = BOUNDS.maxX - PARTITION_X, depth = BOUNDS.maxZ - BOUNDS.minZ;

  const hallFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(hallW, depth),
    std({ map: withRepeat(tex.floor, hallW / 2, depth / 2), roughness: 0.75 })
  );
  hallFloor.rotation.x = -Math.PI / 2;
  hallFloor.position.set(BOUNDS.minX + hallW / 2, 0, 0);
  group.add(hallFloor);

  const annexFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(annexW, depth),
    std({ map: withRepeat(tex.tile, annexW / 1.5, depth / 1.5), roughness: 0.7 })
  );
  annexFloor.rotation.x = -Math.PI / 2;
  annexFloor.position.set(PARTITION_X + annexW / 2, 0, 0);
  group.add(annexFloor);

  const totalW = BOUNDS.maxX - BOUNDS.minX;
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(totalW, depth),
    std({ map: withRepeat(tex.darkWood, totalW / 2, depth / 2), color: 0x9a9a9a })
  );
  ceiling.rotation.x = Math.PI / 2; // mặt nhìn xuống
  ceiling.position.set(BOUNDS.minX + totalW / 2, WALL_H, 0);
  group.add(ceiling);

  // Xà gỗ trên trần
  for (const x of [-4.5, -2, 0.5, 3, 6.5]) {
    box(0.18, 0.22, depth, mat.woodDark, x, WALL_H - 0.22, 0);
  }
  box(totalW, 0.2, 0.18, mat.woodDark, BOUNDS.minX + totalW / 2, WALL_H - 0.2, 0);

  // ---------- Tường ngoài ----------
  const T = 0.3; // độ dày tường
  wall(BOUNDS.minX - T, BOUNDS.maxX + T, BOUNDS.minZ - T, BOUNDS.minZ);   // bắc
  wall(BOUNDS.minX - T, BOUNDS.maxX + T, BOUNDS.maxZ, BOUNDS.maxZ + T);   // nam
  wall(BOUNDS.minX - T, BOUNDS.minX, BOUNDS.minZ, BOUNDS.maxZ);           // tây
  wall(BOUNDS.maxX, BOUNDS.maxX + T, BOUNDS.minZ, BOUNDS.maxZ);           // đông

  // ---------- Tường ngăn + ô cửa thông ----------
  const px0 = PARTITION_X - T / 2, px1 = PARTITION_X + T / 2;
  wall(px0, px1, BOUNDS.minZ, -DOOR_HALF);                                 // đoạn bắc
  wall(px0, px1, DOOR_HALF, BOUNDS.maxZ);                                  // đoạn nam
  wall(px0, px1, -DOOR_HALF, DOOR_HALF, { yBottom: DOOR_H, height: WALL_H - DOOR_H, collide: false }); // lanh tô trên cửa

  // Khung cửa
  for (const s of [-1, 1]) {
    box(T + 0.04, DOOR_H, 0.1, mat.woodDark, PARTITION_X, 0, s * (DOOR_HALF + 0.02));
  }
  box(T + 0.04, 0.12, DOOR_HALF * 2 + 0.24, mat.woodDark, PARTITION_X, DOOR_H, 0);

  // Cánh cửa đang mở, áp vào tường phía gian phụ (có va chạm để không đi xuyên qua)
  const leafX = px1 + 0.55 + 0.02, leafZ = -DOOR_HALF - 0.04;
  box(1.1, DOOR_H - 0.05, 0.05, mat.woodLight, leafX, 0, leafZ, { collide: true });
  box(1.0, 0.08, 0.06, mat.woodDark, leafX, 0.5, leafZ);
  box(1.0, 0.08, 0.06, mat.woodDark, leafX, 1.5, leafZ);
  sphere(0.035, mat.brass, leafX + 0.4, 1.0, leafZ + 0.04);
  box(0.05, 0.12, 0.05, mat.iron, px1 + 0.04, 0.3, -DOOR_HALF - 0.02);  // bản lề
  box(0.05, 0.12, 0.05, mat.iron, px1 + 0.04, 1.7, -DOOR_HALF - 0.02);

  // ---------- Cửa chính (đóng, cài then) ở tường nam, gian chính ----------
  const fdX = -2, fdZ = BOUNDS.maxZ;
  box(1.2, 2.1, 0.06, mat.woodLight, fdX, 0, fdZ - 0.03);
  for (const dx of [-0.3, 0, 0.3]) box(0.025, 2.1, 0.02, mat.woodDark, fdX + dx, 0, fdZ - 0.07);
  for (const s of [-1, 1]) box(0.1, 2.2, 0.12, mat.woodDark, fdX + s * 0.65, 0, fdZ - 0.06);
  box(1.4, 0.12, 0.12, mat.woodDark, fdX, 2.1, fdZ - 0.06);
  box(1.5, 0.1, 0.05, mat.woodDark, fdX, 1.05, fdZ - 0.1);               // then cài ngang
  sphere(0.04, mat.brass, fdX - 0.35, 1.05, fdZ - 0.14);
  sphere(0.04, mat.brass, fdX + 0.35, 1.05, fdZ - 0.14);

  // ---------- Cửa sổ (kính xanh mờ + chấn song) ----------
  function windowOnX(faceX, z, inward) {
    // inward = +1 nếu tường nằm phía tây (mặt trong hướng +x), -1 nếu phía đông
    const x = faceX + inward * 0.02;
    box(0.04, 1.1, 0.9, mat.window, x, 1.15, z);
    for (const dz of [-0.47, 0.47]) box(0.08, 1.2, 0.06, mat.woodDark, x + inward * 0.02, 1.1, z + dz);
    for (const y of [1.1, 2.3]) box(0.08, 0.06, 1.0, mat.woodDark, x + inward * 0.02, y, z);
    box(0.06, 0.04, 0.9, mat.woodDark, x + inward * 0.02, 1.7, z);
    box(0.06, 1.1, 0.04, mat.woodDark, x + inward * 0.02, 1.15, z);
  }
  windowOnX(BOUNDS.minX, -0.9, +1);
  windowOnX(BOUNDS.minX, -2.9, +1);
  windowOnX(BOUNDS.maxX, 1.2, -1);

  // ---------- Bàn thờ (sát tường bắc, gian chính) ----------
  const altarX = -2, altarZ = BOUNDS.minZ + 0.35;
  box(2.2, 0.95, 0.7, mat.wood, altarX, 0, altarZ, { collide: true });
  box(2.3, 0.05, 0.78, mat.woodDark, altarX, 0.95, altarZ);                // mặt bàn
  box(2.0, 1.25, 0.05, mat.woodDark, altarX, 1.0, BOUNDS.minZ + 0.03);    // ván lưng
  box(1.5, 0.42, 0.03, mat.gold, altarX, 2.35, BOUNDS.minZ + 0.02);        // hoành phi
  box(1.4, 0.32, 0.035, mat.red, altarX, 2.4, BOUNDS.minZ + 0.025);
  const top = 1.0;
  // bát hương + chân nhang
  cylinder(0.1, 0.07, 0.09, mat.brass, altarX, top, altarZ + 0.05);
  for (const dx of [-0.03, 0, 0.03]) {
    cylinder(0.005, 0.005, 0.22, mat.red, altarX + dx, top + 0.09, altarZ + 0.05);
    sphere(0.008, mat.ember, altarX + dx, top + 0.32, altarZ + 0.05);
  }
  // hai chân nến
  const candleSpots = [-0.55, 0.55];
  for (const dx of candleSpots) {
    cylinder(0.04, 0.05, 0.14, mat.brass, altarX + dx, top, altarZ + 0.1);
    cylinder(0.02, 0.02, 0.14, mat.candle, altarX + dx, top + 0.14, altarZ + 0.1);
    sphere(0.018, mat.flame, altarX + dx, top + 0.31, altarZ + 0.1, 1.9);
  }
  // di ảnh
  const photo = new THREE.Group();
  photo.position.set(altarX, top + 0.26, altarZ - 0.22);
  photo.rotation.x = -0.12;
  box(0.3, 0.4, 0.03, mat.woodDark, 0, -0.2, 0, { parent: photo });
  box(0.23, 0.32, 0.035, mat.frameInner, 0, -0.16, 0.002, { parent: photo });
  group.add(photo);

  // ---------- Bàn ăn + ghế + thảm ----------
  const tableX = -2, tableZ = 0.8;
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), std({ color: 0x4a1b1b, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(tableX, 0.006, tableZ); group.add(rug);
  const rugInner = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 2.2),
    std({ color: 0x5e2a22, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  );
  rugInner.rotation.x = -Math.PI / 2; rugInner.position.set(tableX, 0.009, tableZ); group.add(rugInner);

  box(2.0, 0.06, 1.0, mat.woodLight, tableX, 0.74, tableZ);
  for (const sx of [-0.9, 0.9]) for (const sz of [-0.42, 0.42]) {
    box(0.07, 0.74, 0.07, mat.woodDark, tableX + sx, 0, tableZ + sz);
  }
  addCollider(tableX, tableZ, 2.0, 1.0);
  // vài vật trên bàn: ấm trà + chén
  cylinder(0.07, 0.09, 0.12, mat.ceramic, tableX - 0.2, 0.8, tableZ);
  sphere(0.02, mat.ceramic, tableX - 0.2, 0.94, tableZ);
  for (const dx of [0.15, 0.35]) cylinder(0.035, 0.025, 0.05, mat.ceramic, tableX + dx, 0.8, tableZ + 0.1);

  function chair(x, z, ry) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    box(0.46, 0.05, 0.46, mat.woodLight, 0, 0.43, 0, { parent: g });
    for (const sx of [-0.19, 0.19]) for (const sz of [-0.19, 0.19]) {
      box(0.045, 0.43, 0.045, mat.woodDark, sx, 0, sz, { parent: g });
    }
    for (const sx of [-0.19, 0.19]) box(0.045, 0.52, 0.045, mat.woodDark, sx, 0.48, -0.19, { parent: g });
    box(0.46, 0.14, 0.03, mat.woodDark, 0, 0.8, -0.19, { parent: g });
    box(0.46, 0.14, 0.03, mat.woodDark, 0, 0.58, -0.19, { parent: g });
    group.add(g);
    addCollider(x, z, 0.5, 0.5);
  }
  // Ghế phía bắc nhìn về nam (+z); ghế phía nam nhìn về bắc (-z)
  chair(tableX - 0.55, tableZ - 0.85, 0);
  chair(tableX + 0.55, tableZ - 0.85, 0);
  chair(tableX - 0.55, tableZ + 0.85, Math.PI);
  chair(tableX + 0.55, tableZ + 0.85, Math.PI);

  // ---------- Tủ gỗ sát tường tây ----------
  const cabX = BOUNDS.minX + 0.26, cabZ = 1.8;
  box(0.5, 2.0, 1.3, mat.wood, cabX, 0, cabZ, { collide: true });
  box(0.56, 0.08, 1.38, mat.woodDark, cabX, 2.0, cabZ);
  for (const dz of [-0.31, 0.31]) {
    box(0.03, 1.7, 0.58, mat.woodLight, cabX + 0.255, 0.15, cabZ + dz);
    box(0.03, 0.12, 0.03, mat.brass, cabX + 0.28, 1.0, cabZ + dz * 0.15);
  }

  // ---------- Rương gỗ ----------
  const chestX = BOUNDS.minX + 0.4, chestZ = -2.2;
  box(0.55, 0.45, 0.95, mat.woodLight, chestX, 0, chestZ, { collide: true });
  box(0.58, 0.12, 0.98, mat.wood, chestX, 0.45, chestZ);
  for (const dz of [-0.3, 0.3]) box(0.6, 0.58, 0.05, mat.iron, chestX, 0, chestZ + dz);
  box(0.04, 0.1, 0.08, mat.brass, chestX + 0.3, 0.38, chestZ);

  // ---------- Gian phụ: phản gỗ, kệ, chum ----------
  const bedX = BOUNDS.maxX - 0.65, bedZ = -3.3;
  box(1.3, 0.35, 2.2, mat.woodLight, bedX, 0, bedZ, { collide: true });
  box(1.2, 0.06, 2.1, mat.mat, bedX, 0.35, bedZ);
  box(0.5, 0.12, 0.3, mat.cloth, bedX, 0.41, bedZ - 0.8);

  const shelfX = 6.4, shelfZ = BOUNDS.maxZ - 0.22;
  for (const s of [-1, 1]) box(0.05, 1.9, 0.4, mat.wood, shelfX + s * 0.775, 0, shelfZ);
  for (const y of [0.1, 0.65, 1.2, 1.75]) box(1.6, 0.04, 0.4, mat.wood, shelfX, y, shelfZ);
  addCollider(shelfX, shelfZ, 1.6, 0.4);
  for (const [dx, y] of [[-0.5, 0.14], [0.1, 0.14], [-0.3, 0.69], [0.45, 0.69], [-0.1, 1.24]]) {
    cylinder(0.07, 0.09, 0.2 + (dx > 0 ? 0.05 : 0), mat.ceramic, shelfX + dx, y, shelfZ);
  }
  box(0.25, 0.18, 0.18, mat.cloth, shelfX + 0.5, 1.24, shelfZ);

  cylinder(0.13, 0.17, 0.5, mat.ceramic, 8.4, 0, 3.6, { collide: true });
  cylinder(0.1, 0.13, 0.4, mat.ceramic, 7.9, 0, 3.9, { collide: true });

  // ---------- Ánh sáng ----------
  // Ánh sáng nền rất yếu, lạnh (ánh trăng lọt qua khe) để vẫn nhìn được hình khối.
  const ambient = new THREE.HemisphereLight(0x4a5c80, 0x1a1410, 0.8);
  group.add(ambient);

  // Nến trên bàn thờ: ánh sáng ấm, chập chờn.
  const candleLight = new THREE.PointLight(0xff9a45, 12, 11, 2);
  candleLight.position.set(altarX, top + 0.45, altarZ + 0.25);
  group.add(candleLight);

  // Một chút ánh trăng xanh ở gian phụ, nơi không có nến.
  const moonLight = new THREE.PointLight(0x5b7fc4, 4, 7, 2);
  moonLight.position.set(8.4, 2.3, 1.2);
  group.add(moonLight);

  const flames = group.children.filter((c) => c.material === mat.flame);
  const BASE = candleLight.intensity;

  /** Gọi mỗi khung hình: nến chập chờn. */
  function update(t) {
    const n = Math.sin(t * 13.1) * 0.5 + Math.sin(t * 7.3 + 1.7) * 0.3 + Math.sin(t * 23.7) * 0.2;
    candleLight.intensity = BASE * (0.88 + 0.12 * n);
    for (let i = 0; i < flames.length; i++) {
      flames[i].scale.y = 1.9 + 0.35 * Math.sin(t * (17 + i * 3) + i);
    }
  }

  return { group, colliders, update, bounds: BOUNDS };
}
