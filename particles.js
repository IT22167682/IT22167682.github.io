// =====================================================
//  Particle network background for the hero section
//  Moving "nodes" that connect with lines when close -
//  like devices on a network. Reacts to the mouse.
// =====================================================

const hero = document.querySelector(".hero");
const canvas = document.createElement("canvas");
canvas.className = "particles";
canvas.setAttribute("aria-hidden", "true");
hero.prepend(canvas);                         // first child of the hero = behind the content
const ctx = canvas.getContext("2d");

const COLORS = ["236, 72, 153", "6, 182, 212", "139, 92, 246"];   // pink, cyan, purple (RGB)
const LINK_DISTANCE = 130;                    // nodes closer than this get a line
const MOUSE_DISTANCE = 170;                   // the mouse connects to nodes within this
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let width, height, areaWidth, particles = [];
const mouse = { x: null, y: null };
let running = true;

// ---------- Create the nodes ----------
function setup() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);   // sharp on retina, but not too heavy
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Desktop: keep the nodes on the LEFT side only (the photo is on the right).
    // Phones: the layout is stacked, so use the full width.
    areaWidth = width > 768 ? width * 0.55 : width;

    // More screen = more nodes (but capped, so phones stay fast)
    const count = Math.min(Math.floor((areaWidth * height) / 14000), width < 768 ? 45 : 70);
    particles = Array.from({ length: count }, () => ({
        x: Math.random() * areaWidth,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,      // speed in x (pixels per frame)
        vy: (Math.random() - 0.5) * 0.5,      // speed in y
        r: Math.random() * 1.8 + 1,           // radius
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
}

// ---------- Draw one frame ----------
function draw() {
    ctx.clearRect(0, 0, width, height);
    const light = document.documentElement.dataset.theme === "light";
    const strength = light ? 0.35 : 0.5;      // softer lines in light mode

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move, and bounce off the edges
        if (!reduceMotion) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > areaWidth) p.vx *= -1;   // bounce inside the left area
            if (p.y < 0 || p.y > height) p.vy *= -1;
        }

        // Lines to nearby nodes (j > i, so each pair is drawn once)
        for (let j = i + 1; j < particles.length; j++) {
            const q = particles[j];
            const dist = Math.hypot(p.x - q.x, p.y - q.y);
            if (dist < LINK_DISTANCE) {
                ctx.strokeStyle = `rgba(${p.color}, ${(1 - dist / LINK_DISTANCE) * strength})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.stroke();
            }
        }

        // Line to the mouse + a gentle pull towards it
        if (mouse.x !== null) {
            const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
            if (dist < MOUSE_DISTANCE) {
                ctx.strokeStyle = `rgba(6, 182, 212, ${(1 - dist / MOUSE_DISTANCE) * 0.8})`;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
                if (!reduceMotion) {
                    p.x += (mouse.x - p.x) * 0.003;
                    p.y += (mouse.y - p.y) * 0.003;
                }
            }
        }

        // The node itself
        ctx.fillStyle = `rgba(${p.color}, 0.9)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ---------- Animation loop ----------
function loop() {
    if (!running) return;
    draw();
    requestAnimationFrame(loop);
}

// ---------- Mouse tracking (relative to the hero) ----------
hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});
hero.addEventListener("mouseleave", () => { mouse.x = mouse.y = null; });

// ---------- Only animate while the hero is on screen (saves battery) ----------
const heroObserver = new IntersectionObserver(([entry]) => {
    const shouldRun = entry.isIntersecting && !document.hidden && !reduceMotion;
    if (shouldRun && !running) { running = true; loop(); }
    if (!shouldRun) running = false;
});
heroObserver.observe(hero);
document.addEventListener("visibilitychange", () => {
    if (document.hidden) running = false;
    else if (!reduceMotion) { running = true; loop(); }
});

// ---------- Rebuild when the window size changes ----------
let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { setup(); if (reduceMotion) draw(); }, 200);
});

setup();
if (reduceMotion) { running = false; draw(); }   // still picture for people who prefer less motion
else loop();
