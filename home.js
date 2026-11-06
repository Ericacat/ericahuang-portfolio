(() => {
    const section = document.querySelector('.scroll-projects');
    if (!section) return;
    const stories = [...section.querySelectorAll('.scroll-work')];
    const visuals = [...section.querySelectorAll('.scroll-work-visual')];
    const desktop = window.matchMedia('(min-width: 801px)');
    let active = -1;
    let pending = false;
    function activate(index) {
        if (index === active) return;
        active = index;
        visuals.forEach((visual, i) => {
            const selected = i === index;
            visual.classList.toggle('is-active', selected);
            visual.setAttribute('aria-hidden', String(!selected));
            visual.tabIndex = selected ? 0 : -1;
        });
    }
    function update() {
        pending = false;
        if (!desktop.matches) return;
        // Introduce the next image as its story rises into the image's middle.
        const frame = section.querySelector('.scroll-work-frame').getBoundingClientRect();
        const switchAt = Math.min(frame.top + frame.height * .55, window.innerHeight * .65);
        let current = 0;
        stories.forEach((story, i) => {
            if (story.getBoundingClientRect().top + 32 <= switchAt) current = i;
        });
        activate(current);
    }
    function schedule() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(update);
    }
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    desktop.addEventListener('change', schedule);
    // Keep the image in sync when tabbing through the project links.
    stories.forEach((story, i) => story.addEventListener('focusin', () => activate(i)));
    update();
})();

// Replay entrances whenever content returns to view in either direction.
(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!('IntersectionObserver' in window) || motion.matches) return;
    const groups = [
        ['.hero-left', '.decoration-container, h1'],
        ['.hero-right', '.name-section, .description-section'],
        ['.capability-list', '.capability-item'],
        ['.scroll-projects-heading, .career-header, .about-section .section-header, .lp-section .section-header', ':scope > *'],
        ['.scroll-work', '.scroll-work-details, h3, .scroll-work-subtitle, .scroll-work-description, .scroll-work-link'],
        ['.career-list', ':scope > li'],
        ['.lp-grid', '.lp-card'],
        ['.about-intro-wrapper', '.about-intro, .about-email'],
    ];
    const targets = new Set();
    groups.forEach(([containerSelector, childSelector]) => {
        document.querySelectorAll(containerSelector).forEach(container => {
            container.querySelectorAll(childSelector).forEach((element, i) => {
                element.style.setProperty('--reveal-delay', `${Math.min(i * 65, 260)}ms`);
                targets.add(element);
            });
        });
    });
    const earlier = document.querySelector('.career-earlier');
    if (earlier) targets.add(earlier);
    const reveal = element => {
        element.classList.add('is-revealed');
    };
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) reveal(entry.target);
            else if (!entry.target.contains(document.activeElement)) entry.target.classList.remove('is-revealed');
        });
    }, {threshold: 0, rootMargin: '0px 0px -6% 0px'});
    targets.forEach(element => {
        element.classList.add('scroll-reveal');
        // Content above the viewport must remain visible on reload/back navigation.
        if (element.getBoundingClientRect().bottom < 0) element.classList.add('is-revealed');
        observer.observe(element);
        element.addEventListener('focusin', () => reveal(element));
    });
    motion.addEventListener('change', event => {
        if (event.matches) {
            targets.forEach(reveal);
            observer.disconnect();
        }
    });
})();

// A brief wave of color settles back to the heading's original ink color.
(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || !('IntersectionObserver' in window)) return;
    const headings = document.querySelectorAll('.hero-left h1, .home-section-title, .career-title, .scroll-work h3');
    const animations = new Set();
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const heading = entry.target;
            if (!entry.isIntersecting) {
                heading.querySelectorAll('.heading-color-letter').forEach(letter => {
                    letter.getAnimations().forEach(animation => animation.cancel());
                });
                return;
            }
            if (motion.matches) return;
            const ink = getComputedStyle(heading).color;
            const revealDelay = parseFloat(heading.style.getPropertyValue('--reveal-delay')) || 0;
            heading.querySelectorAll('.heading-color-letter').forEach((letter, i) => {
                const animation = letter.animate([
                    {color: ink, offset: 0},
                    {color: '#2975cc', offset: .2},
                    {color: '#9561c9', offset: .4},
                    {color: '#e65565', offset: .6},
                    {color: '#b47716', offset: .75},
                    {color: ink, offset: 1},
                ], {duration: 750, delay: revealDelay + i * 55, easing: 'linear'});
                animations.add(animation);
                animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
            });
        });
    }, {threshold: 0, rootMargin: '0px 0px -6% 0px'});
    headings.forEach(heading => {
        // Preserve existing line wrappers and native word wrapping.
        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        heading.setAttribute('aria-label', heading.textContent.replace(/\s+/g, ' ').trim());
        nodes.forEach(node => {
            if (!node.textContent.trim()) return;
            const fragment = document.createDocumentFragment();
            Array.from(node.textContent).forEach(character => {
                if (/\s/.test(character)) fragment.append(document.createTextNode(character));
                else {
                    const span = document.createElement('span');
                    span.className = 'heading-color-letter';
                    span.setAttribute('aria-hidden', 'true');
                    span.textContent = character;
                    fragment.append(span);
                }
            });
            node.replaceWith(fragment);
        });
        observer.observe(heading);
    });
    motion.addEventListener('change', event => {
        if (!event.matches) return;
        observer.disconnect();
        animations.forEach(animation => animation.cancel());
        animations.clear();
    });
})();

// Draw the image outline once the matching story has settled into reading view.
(() => {
    const section = document.querySelector('.scroll-projects');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!section || motion.matches || !('ResizeObserver' in window)) return;
    const desktop = window.matchMedia('(min-width: 801px)');
    const stories = [...section.querySelectorAll('.scroll-work')];
    const visuals = [...section.querySelectorAll('.scroll-work-visual')];
    const frame = section.querySelector('.scroll-work-frame');
    const running = new Set();
    let timer;
    let queued = -1;
    let pending = false;
    let serial = 0;
    function outline(container) {
        const id = `work-outline-${serial++}`;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('work-color-outline');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2975cc"/><stop offset=".3" stop-color="#9561c9"/><stop offset=".6" stop-color="#e65565"/><stop offset=".8" stop-color="#e5af43"/><stop offset="1" stop-color="#168267"/></linearGradient></defs><path fill="none" stroke="url(#${id})" stroke-width="1.5" pathLength="100"/>`;
        container.append(svg);
        const rect = svg.querySelector('path');
        const resize = new ResizeObserver(() => {
            const right = Math.max(2, container.clientWidth - 2);
            const bottom = Math.max(2, container.clientHeight - 2);
            const radius = Math.max(0, Math.min(parseFloat(getComputedStyle(container).borderRadius) - 2, (right - 2) / 2, (bottom - 2) / 2));
            // Begin at the upper-left curve, then travel clockwise.
            rect.setAttribute('d', `M ${2 + radius} 2 H ${right - radius} A ${radius} ${radius} 0 0 1 ${right} ${2 + radius} V ${bottom - radius} A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom} H ${2 + radius} A ${radius} ${radius} 0 0 1 2 ${bottom - radius} V ${2 + radius} A ${radius} ${radius} 0 0 1 ${2 + radius} 2 Z`);
        });
        resize.observe(container);
        return {svg, rect};
    }
    const pinned = outline(frame);
    const mobile = stories.map(story => outline(story.querySelector('.scroll-mobile-image')));
    function candidate() {
        if (motion.matches) return -1;
        return stories.findIndex((story, i) => {
            const text = story.querySelector('.scroll-work-meta').getBoundingClientRect();
            const bounds = story.getBoundingClientRect();
            return text.top <= innerHeight * .55 && bounds.bottom > innerHeight * .3 &&
                (desktop.matches ? visuals[i].classList.contains('is-active') : true);
        });
    }
    function check() {
        pending = false;
        const index = candidate();
        if (index === queued) return;
        clearTimeout(timer);
        queued = index;
        if (index < 0) return;
        timer = setTimeout(() => {
            if (candidate() !== index) return;
            running.forEach(animation => animation.cancel());
            running.clear();
            const {svg, rect} = desktop.matches ? pinned : mobile[index];
            const draw = rect.animate([{strokeDashoffset: 100}, {strokeDashoffset: 0}], {duration: 800, easing: 'linear'});
            const fade = svg.animate([{opacity: 0, offset: 0}, {opacity: .06, offset: .25}, {opacity: .3, offset: .5}, {opacity: .85, offset: .7}, {opacity: .85, offset: .8}, {opacity: 0, offset: 1}], {duration: 1500, easing: 'ease-in-out'});
            [draw, fade].forEach(animation => {
                running.add(animation);
                animation.finished.then(() => running.delete(animation), () => running.delete(animation));
            });
        }, 100);
    }
    function schedule() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(check);
    }
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    motion.addEventListener('change', () => {
        clearTimeout(timer);
        running.forEach(animation => animation.cancel());
        running.clear();
    });
    schedule();
})();

// Each interaction chooses a new accent while idle buttons stay black.
(() => {
    const colors = ['#2975cc', '#9561c9', '#cb4658', '#168267', '#9b7019'];
    document.querySelectorAll('.scroll-work-link').forEach(button => {
        let previous = '';
        const choose = () => {
            const choices = colors.filter(color => color !== previous);
            previous = choices[Math.floor(Math.random() * choices.length)];
            button.style.setProperty('--button-color', previous);
        };
        button.addEventListener('pointerenter', choose);
        button.addEventListener('focus', choose);
    });
})();
