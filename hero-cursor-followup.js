(() => {
    // Set data-enabled="false" on this script to restore the original cursor outro.
    if (document.currentScript?.dataset.enabled !== 'true') return;

    window.runHeroCursorFollowup = async ({
        hero, cursor, target, exit, animate, transform, travelTilt,
        finish, isFinished, registerCleanup
    }) => {
        const button = document.querySelector('#button-call > a');
        if (!button) return false;
        const buttonBounds = button.getBoundingClientRect();
        // Never scroll the page for the demo or point at an offscreen CTA.
        if (buttonBounds.top < 0 || buttonBounds.bottom > window.innerHeight - 12) return false;

        const heroBounds = hero.getBoundingClientRect();
        const destination = {
            x: buttonBounds.left - heroBounds.left + buttonBounds.width * .54,
            y: buttonBounds.top - heroBounds.top + buttonBounds.height * .54
        };
        const comment = document.createElement('span');
        comment.className = 'hero-cursor-comment';
        comment.setAttribute('aria-hidden', 'true');
        comment.innerHTML = '<img class="hero-cursor-comment-avatar" src="images/responsive/avatar-56.png" width="28" height="28" alt=""><span><span class="hero-cursor-comment-author">Axel</span><span class="hero-cursor-comment-message"></span></span>';
        const text = comment.querySelector('.hero-cursor-comment-message');
        const minX = 12 - heroBounds.left;
        const maxX = window.innerWidth - 12 - heroBounds.left - 176;
        let commentX = exit.x + 20;
        if (commentX > maxX) commentX = exit.x - 188;
        comment.style.left = `${Math.max(minX, Math.min(maxX, commentX))}px`;
        comment.style.top = `${Math.min(exit.y + 24, window.innerHeight - heroBounds.top - 80)}px`;
        hero.append(comment);

        const halo = document.createElement('span');
        halo.className = 'hero-cursor-cta-halo';
        halo.setAttribute('aria-hidden', 'true');
        Object.assign(halo.style, {
            left: `${buttonBounds.left - heroBounds.left - 5}px`,
            top: `${buttonBounds.top - heroBounds.top - 5}px`,
            width: `${buttonBounds.width + 10}px`,
            height: `${buttonBounds.height + 10}px`
        });
        hero.append(halo);

        const cleanup = () => {
            comment.remove();
            halo.remove();
            document.removeEventListener('pointerdown', finish);
            document.removeEventListener('keydown', finish);
        };
        registerCleanup(cleanup);
        document.addEventListener('pointerdown', finish, { passive: true });
        document.addEventListener('keydown', finish);
        const wait = async duration => {
            await new Promise(resolve => setTimeout(resolve, duration));
            if (isFinished()) throw new Error('Cursor follow-up interrupted');
        };

        try {
            hero.dataset.cursorState = 'comment-departing';
            await animate(cursor, [
                { transform: transform(target), opacity: 1 },
                { transform: transform(exit, 1, travelTilt(target, exit)), opacity: 1 }
            ], 480, 'cubic-bezier(.45, 0, .55, 1)');

            hero.dataset.cursorState = 'comment-typing';
            await animate(comment, [
                { transform: 'translateY(6px) scale(.97)', opacity: 0 },
                { transform: 'translateY(0) scale(1)', opacity: 1 }
            ], 180);
            for (const character of 'Interested?') {
                await wait(60);
                text.textContent += character;
            }
            comment.classList.add('is-typed');
            hero.dataset.cursorState = 'comment-holding';
            await wait(650);
            await animate(comment, [{ opacity: 1 }, { opacity: 0 }], 140);
            comment.remove();

            const control = {
                x: Math.max(exit.x, destination.x) + 20,
                y: (exit.y + destination.y) / 2
            };
            const frames = Array.from({ length: 9 }, (_, index) => {
                const t = index / 8, u = 1 - t;
                const point = {
                    x: u * u * exit.x + 2 * u * t * control.x + t * t * destination.x,
                    y: u * u * exit.y + 2 * u * t * control.y + t * t * destination.y
                };
                const ahead = {
                    x: point.x + u * (control.x - exit.x) + t * (destination.x - control.x),
                    y: point.y + u * (control.y - exit.y) + t * (destination.y - control.y)
                };
                const tilt = index === 0 ? travelTilt(target, exit) : travelTilt(point, ahead) * Math.min(1, (1 - t) / .25);
                return { offset: t, transform: transform(point, 1, tilt), opacity: 1 };
            });
            hero.dataset.cursorState = 'cta-moving';
            await animate(cursor, frames, 650, 'cubic-bezier(.45, 0, .2, 1)');
            await wait(100);

            // Visual press only: the real link remains under the visitor's control.
            hero.dataset.cursorState = 'cta-clicking';
            await Promise.all([
                animate(cursor, [{ transform: transform(destination) }, { transform: transform(destination, .86) }], 90),
                animate(button, [{ transform: 'scale(1)' }, { transform: 'scale(.965)' }], 90)
            ]);
            await Promise.all([
                animate(cursor, [
                    { transform: transform(destination, .86) },
                    { transform: transform(destination, 1.04), offset: .65 },
                    { transform: transform(destination) }
                ], 200),
                animate(button, [{ transform: 'scale(.965)' }, { transform: 'scale(1)' }], 200),
                animate(halo, [
                    { transform: 'scale(.96)', opacity: .65 },
                    { transform: 'scale(1.1)', opacity: 0 }
                ], 350)
            ]);
            await wait(150);

            hero.dataset.cursorState = 'leaving';
            const end = { x: destination.x + 60, y: destination.y + 46 };
            await animate(cursor, [
                { transform: transform(destination), opacity: 1 },
                { transform: transform({ x: destination.x + 36, y: destination.y + 28 }, 1, travelTilt(destination, end)), opacity: 1, offset: .6 },
                { transform: transform(end, 1, travelTilt(destination, end)), opacity: 0 }
            ], 480, 'cubic-bezier(.45, 0, .55, 1)');
            return true;
        } finally {
            cleanup();
        }
    };
})();
