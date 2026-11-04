const orbit = document.querySelector('.about-orbit');
const photos = [...orbit.querySelectorAll('img')];
const toggle = document.querySelector('.about-orbit-toggle');
const controls = document.querySelector('.about-orbit-controls');
const speed = document.querySelector('#orbit-speed');
const angleOffset = document.querySelector('#orbit-angle');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let visible = false;
let paused = false;
let phase = 0;
let lastTime;
let frame;
let drag;
let tilt = 0;

function drawOrbit(time) {
  if (lastTime !== undefined) phase += (time - lastTime) * Number(speed.value) * Math.PI * 2 / 20000;
  lastTime = time;
  const radiusX = orbit.clientWidth * .56;
  const radiusY = Math.min(110, orbit.clientHeight * .30);
  const offset = Number(angleOffset.value) * Math.PI / 180;
  photos.forEach((photo, index) => {
    const angle = phase + offset + index * Math.PI * 2 / photos.length;
    const depth = Math.sin(angle);
    photo.style.setProperty('--orbit-x', `${Math.cos(angle) * radiusX}px`);
    const verticalOffset = depth * radiusY + Math.cos(angle) * tilt;
    photo.style.setProperty('--orbit-y', `${verticalOffset}px`);
    photo.style.setProperty('--orbit-scale', .88 + depth * .12);
    const distance = (1 - depth) / 2;
    photo.style.setProperty('--orbit-opacity', 1 - distance * .58);
    photo.style.setProperty('--orbit-blur', `${distance * distance * 3}px`);
    photo.style.zIndex = Math.round(depth * 50 + 50);
  });
  if (visible && !paused && !drag && !reduceMotion.matches) frame = requestAnimationFrame(drawOrbit);
}

function updateOrbit() {
  cancelAnimationFrame(frame);
  lastTime = undefined;
  orbit.classList.toggle('is-orbiting', !reduceMotion.matches);
  controls.hidden = reduceMotion.matches;
  if (!reduceMotion.matches) drawOrbit(performance.now());
}

new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  updateOrbit();
}).observe(orbit);
new ResizeObserver(updateOrbit).observe(orbit);
reduceMotion.addEventListener('change', updateOrbit);
toggle.addEventListener('click', () => {
  paused = !paused;
  toggle.textContent = paused ? 'Play rotation' : 'Pause rotation';
  updateOrbit();
});

angleOffset.addEventListener('input', updateOrbit);
orbit.addEventListener('pointerdown', event => {
  if (reduceMotion.matches || !event.isPrimary || event.button !== 0) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, phase, tilt };
  orbit.setPointerCapture(event.pointerId);
  updateOrbit();
});
orbit.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  phase = drag.phase + (event.clientX - drag.x) / orbit.clientWidth * Math.PI * 2;
  tilt = Math.max(-90, Math.min(90, drag.tilt + (event.clientY - drag.y) * .7));
  updateOrbit();
});
orbit.addEventListener('lostpointercapture', event => {
  if (drag?.id !== event.pointerId) return;
  drag = undefined;
  updateOrbit();
});

orbit.addEventListener('keydown', event => {
  if (reduceMotion.matches) return;
  switch (event.key) {
    case 'ArrowLeft': phase -= .18; break;
    case 'ArrowRight': phase += .18; break;
    case 'ArrowUp': tilt = Math.max(-90, tilt - 12); break;
    case 'ArrowDown': tilt = Math.min(90, tilt + 12); break;
    default: return;
  }
  event.preventDefault();
  updateOrbit();
});
