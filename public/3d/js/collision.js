// File: public/3d/js/collision.js
// Va chạm 2D trên mặt phẳng XZ (nhìn từ trên xuống): người chơi là hình tròn,
// tường và đồ vật là hộp chữ nhật (AABB). Không phụ thuộc Three.js nên test được bằng Node.

/** Hình tròn (x, z, r) có chạm hộp {minX, maxX, minZ, maxZ} không? */
export function circleHitsBox(x, z, r, b) {
  const cx = Math.max(b.minX, Math.min(x, b.maxX));
  const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz < r * r;
}

export function isBlocked(x, z, r, boxes) {
  for (let i = 0; i < boxes.length; i++) {
    if (circleHitsBox(x, z, r, boxes[i])) return true;
  }
  return false;
}

/**
 * Di chuyển pos theo (dx, dz), có va chạm.
 * - Chia nhỏ bước đi để không "xuyên tường" khi khung hình chậm.
 * - Thử từng trục riêng (X rồi Z) nên khi đi chéo vào tường sẽ trượt dọc tường.
 * Sửa trực tiếp pos.x / pos.z và trả về pos.
 */
export function moveWithCollision(pos, dx, dz, r, boxes, maxStep = 0.08) {
  const dist = Math.hypot(dx, dz);
  if (dist === 0) return pos;

  const steps = Math.max(1, Math.ceil(dist / maxStep));
  const sx = dx / steps;
  const sz = dz / steps;

  for (let i = 0; i < steps; i++) {
    if (!isBlocked(pos.x + sx, pos.z, r, boxes)) pos.x += sx;
    if (!isBlocked(pos.x, pos.z + sz, r, boxes)) pos.z += sz;
  }
  return pos;
}
