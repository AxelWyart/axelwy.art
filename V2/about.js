const orbit = document.querySelector('.about-orbit');
const photos = [...orbit.querySelectorAll('.orbit-card')];
const clips = orbit.querySelectorAll('video');
const toggle = document.querySelector('.about-orbit-toggle');
const controls = document.querySelector('.about-orbit-controls');
const speed = document.querySelector('#orbit-speed');
const angleOffset = document.querySelector('#orbit-angle');
const mobileOrbit = matchMedia('(max-width: 640px)');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let visible = false;
let paused = false;
let phase = 0;
let lastTime;
let frame;
let drag;
let tilt = 0;
let momentum = 0;

function drawOrbit(time) {
  if (lastTime !== undefined) {
    const elapsed = Math.min(50, Math.max(0, time - lastTime));
    const decay = Math.exp(-elapsed / 520);
    phase += elapsed * Number(speed.value) * Math.PI * 2 / 60000 + momentum * 520 * (1 - decay);
    momentum *= decay;
  }
  lastTime = time;
  const radiusX = orbit.clientWidth * .56;
  const compact = mobileOrbit.matches;
  const radiusY = Math.min(compact ? 55 : 110, orbit.clientHeight * .30);
  const orbitTilt = compact ? tilt * .5 : tilt;
  const offset = Number(angleOffset.value) * Math.PI / 180;
  photos.forEach((photo, index) => {
    const angle = phase + offset + index * Math.PI * 2 / photos.length;
    const depth = Math.sin(angle);
    photo.style.setProperty('--orbit-x', `${Math.cos(angle) * radiusX}px`);
    const verticalOffset = depth * radiusY + Math.cos(angle) * orbitTilt;
    photo.style.setProperty('--orbit-y', `${verticalOffset}px`);
    photo.style.setProperty('--orbit-scale', .88 + depth * .12);
    const distance = (1 - depth) / 2;
    photo.style.setProperty('--orbit-opacity', 1 - distance * .58);
    const blur = compact ? Math.max(0, (distance - .35) / .65) ** 2 * 6 : distance * distance * 6;
    photo.style.setProperty('--orbit-filter', blur ? `blur(${blur}px)` : 'none');
    photo.style.zIndex = Math.round(depth * 50 + 50);
  });
  if (visible && !paused && !drag && !reduceMotion.matches) frame = requestAnimationFrame(drawOrbit);
}

function updateOrbit() {
  cancelAnimationFrame(frame);
  lastTime = undefined;
  orbit.classList.toggle('is-orbiting', !reduceMotion.matches);
  controls.hidden = reduceMotion.matches;
  clips.forEach(clip => {
    if (visible && !paused && !reduceMotion.matches) clip.play().catch(() => {});
    else clip.pause();
  });
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
  momentum = 0;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, phase, tilt, samples: [{ phase, time: event.timeStamp }] };
  orbit.setPointerCapture(event.pointerId);
  updateOrbit();
});
orbit.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  phase = drag.phase - (event.clientX - drag.x) / orbit.clientWidth * Math.PI * 2;
  tilt = Math.max(-90, Math.min(90, drag.tilt - (event.clientY - drag.y) * .7));
  drag.samples.push({ phase, time: event.timeStamp });
  drag.samples = drag.samples.filter(sample => event.timeStamp - sample.time <= 100);
  updateOrbit();
});
orbit.addEventListener('pointerup', event => {
  if (drag?.id !== event.pointerId || paused) return;
  const first = drag.samples[0];
  const last = drag.samples.at(-1);
  if (event.timeStamp - last.time > 90 || last.time === first.time) return;
  const velocity = (last.phase - first.phase) / (last.time - first.time);
  momentum = Math.max(-.018, Math.min(.018, velocity * 1.4));
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
