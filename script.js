// ---------- 1. Typing effect ----------
const words = ["websites.", "AI apps.", "smart tools.", "the future."];
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
