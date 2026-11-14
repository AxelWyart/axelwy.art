(() => {
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const footerWave = document.querySelector('.footer-wave');
const marineURL = 'https://marine-api.open-meteo.com/v1/marine?latitude=43.49&longitude=-1.64&current=wave_height,wave_period';

async function showFooterWave() {
  const response = await fetch(marineURL);
  if (!response.ok) return;
  const { current } = await response.json();
  const height = current?.wave_height;
  const period = current?.wave_period;
  if (!Number.isFinite(height) || height < 0 || !Number.isFinite(period) || period <= 0) return;

  const art = footerWave.querySelector('[aria-hidden]');
  footerWave.querySelector('#footer-wave-forecast').textContent = `Waves around ${height.toFixed(1)} m every ${period.toFixed(1)} s`;
  // Use vertical rows for height and horizontal spacing for the forecast period.
  // Sub-metre conditions read as surface ripples instead of breaking crests.
  const profile = [
    { below: 0.5, rows: ['..'] },
    { below: 1, rows: ['_.._'] },
    { below: 2, rows: ['  ,(', "`-'"] },
    { below: 3, rows: ['  _', " / `-.", "'     '"] },
    { below: Infinity, rows: ['   _,', '  /  `.', ' /     `', "'"] },
  ].find(band => height < band.below);
  const profileWidth = Math.max(...profile.rows.map(row => row.length));
  const width = Math.max(profileWidth + 1, Math.min(12, Math.round(period)));
  const displayWidth = 14;
  const repeats = Math.ceil(displayWidth / width) + 1;
  const delay = period * 1000 / width;
  let offset = 0;
  let timer;
  let visible = false;
  let paused = false;

  function draw() {
    const shift = line => {
      const repeated = line.padEnd(width).repeat(repeats);
      return repeated.slice(offset, offset + displayWidth);
    };
    art.textContent = profile.rows.map(shift).join('\n');
    offset = (offset + 1) % width;
  }

  function updateAnimation() {
    clearInterval(timer);

    if (visible && !paused && !reducedMotion.matches) timer = setInterval(draw, delay);
  }

  draw();
  footerWave.hidden = false;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    updateAnimation();
  }).observe(footerWave);
  footerWave.addEventListener('click', () => {
    paused = !paused;
    footerWave.setAttribute('aria-label', paused ? 'Play wave animation' : 'Pause wave animation');
    updateAnimation();
  });
  reducedMotion.addEventListener('change', updateAnimation);
}

showFooterWave().catch(() => {});


})();
