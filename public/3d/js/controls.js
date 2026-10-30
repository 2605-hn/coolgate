// File: public/3d/js/controls.js
// Camera góc nhìn thứ nhất: Pointer Lock cho chuột, WASD để đi, va chạm với tường.
import { moveWithCollision } from "./collision.js";

const MAX_PITCH = Math.PI / 2 - 0.05;

export class FirstPersonControls {
  /**
   * @param camera     THREE.PerspectiveCamera
   * @param element    phần tử nhận Pointer Lock (canvas)
   * @param colliders  mảng hộp {minX,maxX,minZ,maxZ}
   * @param spawn      {x, z, yaw}
   */
  constructor(camera, element, colliders, spawn, opts = {}) {
    this.camera = camera;
    this.element = element;
    this.colliders = colliders;

    this.eyeHeight = opts.eyeHeight ?? 1.65;
    this.radius = opts.radius ?? 0.28;
    this.walkSpeed = opts.walkSpeed ?? 2.4;   // m/s
    this.runSpeed = opts.runSpeed ?? 4.0;
    this.stamina = 100;
    this.isRunning = false;
    this.isCrouching = false;
    this.sensitivity = opts.sensitivity ?? 0.0022;

    this.position = { x: spawn.x, z: spawn.z };
    this.yaw = spawn.yaw || 0;
    this.pitch = 0;
    this.velocity = { x: 0, z: 0 };
    this.bobTime = 0;

    this.keys = new Set();
    this.locked = false;
    this.onLockChange = null;   // (locked:boolean) => void
    this.onLockError = null;    // (message:string) => void

    camera.rotation.order = "YXZ"; // quay quanh trục Y (yaw) trước, rồi mới ngẩng/cúi (pitch)
    this._apply(0);

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onLockChange = this._onLockChange.bind(this);
    this._onLockError = this._onLockError.bind(this);
    this._clearKeys = () => this.keys.clear();

    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
    document.addEventListener("pointerlockchange", this._onLockChange);
    document.addEventListener("pointerlockerror", this._onLockError);
    window.addEventListener("blur", this._clearKeys);
  }

  get supported() {
    return "requestPointerLock" in this.element;
  }

  /** Phải gọi từ một thao tác của người dùng (ví dụ click nút Bắt đầu). */
  lock() {
    try {
      const p = this.element.requestPointerLock();
      // Chrome trả về Promise; nếu bị từ chối (vừa nhấn Esc xong) thì báo lỗi thân thiện.
      if (p && typeof p.catch === "function") {
        p.catch(() => this.onLockError?.("Trình duyệt chưa cho khóa chuột. Đợi một giây rồi bấm lại."));
      }
    } catch (e) {
      this.onLockError?.("Không thể khóa chuột: " + e.message);
    }
  }

  unlock() {
    if (document.pointerLockElement === this.element) document.exitPointerLock();
  }

  dispose() {
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
    document.removeEventListener("pointerlockchange", this._onLockChange);
    document.removeEventListener("pointerlockerror", this._onLockError);
    window.removeEventListener("blur", this._clearKeys);
  }

  _onLockChange() {
    this.locked = document.pointerLockElement === this.element;
    if (!this.locked) {
      this.keys.clear();           // tránh bị "kẹt phím" khi thoát khóa chuột
    }
    this.onLockChange?.(this.locked);
  }

  _onLockError() {
    this.onLockError?.("Không thể khóa chuột. Hãy thử bấm lại nút.");
  }

  _onMouseMove(e) {
    if (!this.locked) return;
    // Một số trình duyệt thỉnh thoảng báo giá trị đột biến; giới hạn để camera không giật.
    const mx = Math.max(-200, Math.min(200, e.movementX || 0));
    const my = Math.max(-200, Math.min(200, e.movementY || 0));
    this.yaw -= mx * this.sensitivity;
    this.pitch -= my * this.sensitivity;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
  }

  _onKeyDown(e) {
    if (!this.locked) return;
    if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
    this.keys.add(e.code);
  }

  _onKeyUp(e) {
    this.keys.delete(e.code);
  }

  /** Gọi mỗi khung hình khi đang chơi. dt tính bằng giây. */
  update(dt) {
    const k = this.keys;
    let forward = 0, strafe = 0;
    if (k.has("KeyW") || k.has("ArrowUp")) forward += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) forward -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) strafe += 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) strafe -= 1;

    // Đi chéo không được nhanh hơn đi thẳng.
    const len = Math.hypot(forward, strafe);
    if (len > 0) { forward /= len; strafe /= len; }

    const wantsRun = (k.has("ShiftLeft") || k.has("ShiftRight")) && !this.isCrouching && len > 0.05 && this.stamina > 0;
    this.isRunning = wantsRun;
    if (wantsRun) this.stamina = Math.max(0, this.stamina - 25 * dt);
    else this.stamina = Math.min(100, this.stamina + (this.isCrouching ? 22 : 15) * dt);
    const speed = this.isCrouching ? this.walkSpeed * 0.48 : (wantsRun ? this.runSpeed : this.walkSpeed);

    // Hướng nhìn trên mặt phẳng XZ. yaw = 0 nhìn về -Z.
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const targetX = (-sin * forward + cos * strafe) * speed;
    const targetZ = (-cos * forward - sin * strafe) * speed;

    // Tăng/giảm tốc mượt, không phụ thuộc FPS.
    const a = 1 - Math.exp(-12 * dt);
    this.velocity.x += (targetX - this.velocity.x) * a;
    this.velocity.z += (targetZ - this.velocity.z) * a;

    moveWithCollision(this.position, this.velocity.x * dt, this.velocity.z * dt, this.radius, this.colliders);

    const moving = Math.hypot(this.velocity.x, this.velocity.z);
    this.bobTime += dt * moving * 2.2;
    this._apply(moving);
  }

  _apply(moving) {
    const bob = Math.sin(this.bobTime) * 0.025 * Math.min(1, moving / this.walkSpeed);
    this.camera.position.set(this.position.x, this.eyeHeight + bob, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
