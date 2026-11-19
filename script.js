// ---------- 1. Typing effect ----------
const words = ["secure cloud systems.", "automated pipelines.", "reliable networks.", "smart AI tools."];
const typingEl = document.getElementById("typing");

let wordIndex = 0;     // which word we are on
let charIndex = 0;     // how many letters are showing
let deleting = false;  // are we typing or deleting?

function type() {
    const word = words[wordIndex];

    if (deleting) {
        charIndex--;
    } else {
        charIndex++;
    }
    typingEl.textContent = word.substring(0, charIndex);

    let speed = deleting ? 50 : 100;

    if (!deleting && charIndex === word.length) {
        speed = 1500;          // pause when the word is complete
        deleting = true;
    } else if (deleting && charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;  // next word (loops back)
        speed = 400;
    }

    setTimeout(type, speed);   // run again after "speed" milliseconds
}
type();


// ---------- 2. Reveal items on scroll ----------
const items = document.querySelectorAll(".card, section h2");

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);   // animate only once
        }
    });
}, { threshold: 0.2 });

items.forEach((item) => {
    item.classList.add("reveal");

    // Cards in the same row appear one after another
    const index = [...item.parentElement.children].indexOf(item);
    const delay = index * 0.15;
    item.style.transitionDelay = `${delay}s, ${delay}s, 0s, 0s`;

    observer.observe(item);
});

// ---------- 3. Mobile hamburger menu ----------
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.getElementById("nav-links");

function setMenu(open) {
    navLinks.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", open);              // tells screen readers the state
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

// Open/close when the button is tapped
menuToggle.addEventListener("click", () => {
    setMenu(!navLinks.classList.contains("open"));
});

// Close after choosing a link, so the menu doesn't cover the section you jumped to
navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
});

// Close with the Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
});

// Close when tapping anywhere outside the nav
document.addEventListener("click", (e) => {
    if (!e.target.closest("nav")) setMenu(false);
});


// ---------- 4. Dark / light mode toggle ----------
const themeToggle = document.querySelector(".theme-toggle");

function updateThemeButton() {
    const isLight = document.documentElement.dataset.theme === "light";
    themeToggle.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
}

themeToggle.addEventListener("click", () => {
    // Read the current theme and flip it
    const current = document.documentElement.dataset.theme;
    const next = current === "light" ? "dark" : "light";

    // Changing this attribute makes CSS swap every var(--...) colour at once
    document.documentElement.dataset.theme = next;

    // Remember the choice for next visit (localStorage survives closing the browser)
    try { localStorage.setItem("theme", next); } catch (e) {}

    updateThemeButton();
});

updateThemeButton();


// ---------- 5. Count-up numbers in the About section ----------
const counters = document.querySelectorAll(".stat-num");

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        const target = Number(el.dataset.target);   // from data-target="400"
        const suffix = el.dataset.suffix || "";     // from data-suffix="+"
        const duration = 1500;                      // milliseconds
        const start = performance.now();

        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);   // fast start, slow finish
            el.textContent = Math.round(target * eased) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);

        counterObserver.unobserve(el);   // count only once
    });
}, { threshold: 0.6 });

counters.forEach((counter) => counterObserver.observe(counter));


// ---------- 6. Highlight the menu item for the section you're viewing ----------
const navItems = document.querySelectorAll("#nav-links a");
// Watch every section with an id, plus the hero (no id -> clears the highlight at the top)
const watchedSections = document.querySelectorAll("section[id], header.hero");

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;                       // e.g. "skills" ("" for the hero)
        navItems.forEach((link) => {
            const isCurrent = link.getAttribute("href") === `#${id}`;
            link.classList.toggle("active", isCurrent);
            // Tell screen readers which item is current
            if (isCurrent) link.setAttribute("aria-current", "true");
            else link.removeAttribute("aria-current");
        });
    });
}, {
    // Only count a section as "current" when it crosses the middle of the screen
    rootMargin: "-45% 0px -50% 0px",
});

watchedSections.forEach((section) => sectionObserver.observe(section));


// ---------- 7. Scroll progress bar ----------
const progressBar = document.querySelector(".scroll-progress");
const backToTop = document.querySelector(".back-to-top");
let ticking = false;   // makes sure we update at most once per screen refresh

function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;  // how far you CAN scroll
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;              // 0 = top, 1 = bottom
    progressBar.style.transform = `scaleX(${progress})`;

    // Back-to-top button: show it once you've scrolled down more than 600px
    backToTop.classList.toggle("show", window.scrollY > 600);
    ticking = false;
}

window.addEventListener("scroll", () => {
    if (!ticking) {
        requestAnimationFrame(updateProgress);   // wait for the next frame = smooth + efficient
        ticking = true;
    }
}, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();


// ---------- 8. Back-to-top button ----------
backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });   // glide back to the top
});
