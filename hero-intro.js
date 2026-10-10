(() => {
    const root = document.documentElement;
    const hero = document.getElementById('hero');
    const heading = document.getElementById('hero-title');
    const designing = document.getElementById('hero-designing');
    const reality = document.getElementById('hero-reality');
    const cursor = document.getElementById('hero-demo-cursor');
    const selection = designing?.querySelector('.hero-selection');
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!hero || !heading || !designing || !reality || !cursor || !selection) {
        root.classList.remove('hero-intro-pending');
        return;
    }

    if (!root.classList.contains('hero-intro-pending') || motionPreference.matches) {
        root.classList.remove('hero-intro-pending');
        hero.dataset.cursorState = 'skipped';
        return;
    }

    const animations = new Set();
    let finished = false;
    let resizeObserver;
    let safetyTimeout;

    const finish = () => {
        if (finished) return;
        finished = true;
        root.classList.remove('hero-intro-pending');
        hero.classList.remove('is-reality-colored', 'is-cursor-clicking');
        hero.dataset.cursorState = 'complete';
        animations.forEach(animation => animation.cancel());
        animations.clear();
        resizeObserver?.disconnect();
        clearTimeout(safetyTimeout);
        window.removeEventListener('scroll', finish);
        window.removeEventListener('resize', finish);
        hero.removeEventListener('pointerdown', finish);
        motionPreference.removeEventListener('change', onMotionChange);
    };

    const onMotionChange = event => {
        if (event.matches) finish();
    };

    const animate = (element, keyframes, duration, easing = 'cubic-bezier(.23, 1, .32, 1)') => {
        if (finished) return Promise.reject(new Error('Hero intro completed'));
        const animation = element.animate(keyframes, { duration, easing, fill: 'forwards' });
        animations.add(animation);
        return animation.finished;
    };

    const transform = (point, scale = 1, tilt = 0) =>
        `translate3d(${point.x - 4}px, ${point.y - 4}px, 0) rotate(${tilt}deg) scale(${scale})`;

    // Lean into the direction of travel without spinning the pointer around.
    const travelTilt = (from, to) => {
        const dx = to.x - from.x;
        const distance = Math.hypot(dx, to.y - from.y);
        return distance ? 34 * dx / distance : 0;
    };

    hero.dataset.cursorState = 'waiting';
    safetyTimeout = setTimeout(finish, 6500);
    motionPreference.addEventListener('change', onMotionChange);

    const run = async () => {
        // Measure after the font and the existing word entrance animations settle.
        const entrances = heading.getAnimations({ subtree: true }).filter(animation =>
            animation.effect.getComputedTiming().iterations !== Infinity
        );
        await Promise.all([
            document.fonts.ready,
            Promise.allSettled(entrances.map(animation => animation.finished))
        ]);
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (finished) return;

        const headingBounds = heading.getBoundingClientRect();
        if (headingBounds.bottom <= 0 || headingBounds.top >= window.innerHeight) {
            finish();
            return;
        }

        const heroBounds = hero.getBoundingClientRect();
        const firstWord = designing.getBoundingClientRect();
        const lastWord = reality.getBoundingClientRect();
        const start = {
            x: firstWord.left - heroBounds.left + selection.offsetLeft,
            y: firstWord.top - heroBounds.top + firstWord.height * .58
        };
        const end = { x: start.x + selection.offsetWidth, y: start.y };
        const target = {
            x: lastWord.left - heroBounds.left + lastWord.width * .56,
            y: lastWord.top - heroBounds.top + lastWord.height * .58
        };
        const entry = { x: Math.max(4, start.x - 28), y: start.y + 28 };
        const exit = { x: target.x + 16, y: target.y + 20 };
        const control = { x: (end.x + target.x) / 2 + 36, y: (end.y + target.y) / 2 - 60 };
        const entryTilt = travelTilt(entry, start);
        const selectionTilt = travelTilt(start, end);
        const curveStartTilt = travelTilt(end, control);

        // Sample a smooth curve and lean with its tangent, relaxing on arrival.
        const curveFrames = Array.from({ length: 9 }, (_, index) => {
            const t = index / 8;
            const u = 1 - t;
            const point = {
                x: u * u * end.x + 2 * u * t * control.x + t * t * target.x,
                y: u * u * end.y + 2 * u * t * control.y + t * t * target.y
            };
            const direction = {
                x: point.x + u * (control.x - end.x) + t * (target.x - control.x),
                y: point.y + u * (control.y - end.y) + t * (target.y - control.y)
            };
            const settling = Math.max(0, (t - .75) / .25);
            return {
                offset: t,
                transform: transform(point, 1 + .025 * settling,
                    travelTilt(point, direction) * (1 - settling) - 6 * settling)
            };
        });

        window.addEventListener('scroll', finish, { passive: true });
        window.addEventListener('resize', finish, { passive: true });
        hero.addEventListener('pointerdown', finish);
        resizeObserver = new ResizeObserver(() => {
            const bounds = heading.getBoundingClientRect();
            if (Math.abs(bounds.width - headingBounds.width) > 1 ||
                Math.abs(bounds.height - headingBounds.height) > 1) finish();
        });
        resizeObserver.observe(heading);

        hero.dataset.cursorState = 'entering';
        await animate(cursor, [
            { transform: transform(entry, .96, entryTilt), opacity: 0 },
            { transform: transform(start, 1.025, entryTilt + 4), opacity: 1, offset: .75 },
            { transform: transform(start, 1, entryTilt), opacity: 1 }
        ], 280);

        hero.dataset.cursorState = 'selecting';
        await Promise.all([
            animate(cursor, [
                { transform: transform(start, 1, entryTilt) },
                { transform: transform(end, 1, selectionTilt) }
            ], 500, 'cubic-bezier(.45, 0, .55, 1)'),
            animate(selection, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 500, 'cubic-bezier(.45, 0, .55, 1)')
        ]);
        await animate(cursor, [
            { transform: transform(end, 1, selectionTilt) },
            { transform: transform(end, 1, curveStartTilt) }
        ], 120);

        hero.dataset.cursorState = 'moving';
        await animate(cursor, curveFrames, 460, 'cubic-bezier(.45, 0, .2, 1)');

        hero.dataset.cursorState = 'settling';
        await animate(cursor, [
            { transform: transform(target, 1.025, -6) },
            { transform: transform(target, .995, 2), offset: .65 },
            { transform: transform(target) }
        ], 140);

        hero.dataset.cursorState = 'clicking';
        await animate(cursor, [{ transform: transform(target) }, { transform: transform(target, .86) }], 90);
        hero.classList.add('is-cursor-clicking', 'is-reality-colored');
        await animate(cursor, [
            { transform: transform(target, .86) },
            { transform: transform(target, 1.05), offset: .65 },
            { transform: transform(target) }
        ], 180);
        await animate(cursor, [{ transform: transform(target) }, { transform: transform(target) }], 150);

        hero.dataset.cursorState = 'leaving';
        await animate(cursor, [
            { transform: transform(target), opacity: 1 },
            { transform: transform(exit, 1, travelTilt(target, exit)), opacity: 0 }
        ], 220);
        finish();
    };

    run().catch(finish);
})();
