# QA — V3 audio, lighting, ghost

## Checked in this environment
- `node --check` passed for `public/3d/js/main.js`, `room.js`, `controls.js`, `collision.js`, `public/game.js`, and `server.js`.
- The HTML module paths match the files under `public/3d/`; Three.js is served from `/vendor/three/` by `server.js` after `npm install`.
- `public/index.html` and `public/game.js` SHA-256 hashes match the original project ZIP exactly; 2D files were not edited.
- Inspected gameplay wiring: E interacts with nearby clues/exit, F toggles flashlight, Shift increases movement noise, ghost transitions between stalk/investigate/chase, catch ends the run, and collecting all clues permits escape.

## Not verified here
- Browser/WebGL visual inspection and actual sound playback were not run: dependencies are not installed in this environment and a full interactive browser session was unavailable.
- Audio changes are code-level: lower oscillator levels, low-pass filtering, a dynamics compressor, and softer ambience to reduce harshness/clipping. It is still synthesized audio, not recorded sound assets.
- Ghost animation is procedural geometry deformation and subtle part motion, not a captured/rigged character animation.

## Local smoke test
1. Run `npm install` in the project directory.
2. Run `npm start` and keep the terminal open.
3. Open `http://localhost:3000/3d/`, start the game, test WASD/mouse, Shift, F, E, collect clues, and listen at normal system volume.
4. Check `http://localhost:3000/` to confirm the original 2D page still opens.
