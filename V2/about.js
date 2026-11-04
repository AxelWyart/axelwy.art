const orbit = document.querySelector('.about-orbit');
const photos = [...orbit.querySelectorAll('img')];
const toggle = document.querySelector('.about-orbit-toggle');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let visible = false;
let paused = false;
let phase = 0;
let lastTime;
let frame;

function drawOrbit(time) {
  if (lastTime !== undefined) phase += (time - lastTime) * Math.PI * 2 / 20000;
  lastTime = time;
  const radiusX = orbit.clientWidth * .48;
  const radiusY = Math.min(92, orbit.clientHeight * .25);
  photos.forEach((photo, index) => {
    const angle = phase + index * Math.PI * 2 / photos.length;
    const depth = Math.sin(angle);
    photo.style.setProperty('--orbit-x', `${Math.cos(angle) * radiusX}px`);
    photo.style.setProperty('--orbit-y', `${depth * radiusY}px`);
    photo.style.setProperty('--orbit-scale', .88 + depth * .12);
    photo.style.zIndex = Math.round(depth * 50 + 50);
  });
  if (visible && !paused && !reduceMotion.matches) frame = requestAnimationFrame(drawOrbit);
}

function updateOrbit() {
  cancelAnimationFrame(frame);
  lastTime = undefined;
  orbit.classList.toggle('is-orbiting', !reduceMotion.matches);
  toggle.hidden = reduceMotion.matches;
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
