// =====================================================
//  "Ask about Isuru" chatbot - the part in the browser
// =====================================================

// Paste your Cloudflare Worker address here (Step 3 of the setup)
const WORKER_URL = "https://isuru-chatbot.isuruprabathdm.workers.dev";

const chatToggle   = document.querySelector(".chat-toggle");
const chatPanel    = document.querySelector(".chat-panel");
const chatClose    = document.querySelector(".chat-close");
const chatMessages = document.querySelector(".chat-messages");
const chatForm     = document.querySelector(".chat-form");
const chatInput    = document.querySelector(".chat-input");
const suggestions  = document.querySelector(".chat-suggestions");

// The conversation so far - sent to the Worker each time so the AI remembers context
const history = [];

// Phones/tablets: don't auto-focus the text box, because that pops up the keyboard
// (and can zoom the page). Visitors tap the box themselves when ready to type.
const isTouchScreen = window.matchMedia("(hover: none)").matches;

// ---------- Open / close ----------
function setChat(open) {
    chatPanel.classList.toggle("open", open);
    chatToggle.setAttribute("aria-expanded", open);
    if (open && !isTouchScreen) chatInput.focus();
}
chatToggle.addEventListener("click", () => setChat(!chatPanel.classList.contains("open")));
chatClose.addEventListener("click", () => setChat(false));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setChat(false); });

// ---------- Show a message bubble ----------
function addMessage(text, who) {
    const bubble = document.createElement("div");
    bubble.className = `msg msg-${who}`;
    bubble.textContent = text;            // textContent = safe: never runs HTML/scripts
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;   // scroll to newest
    return bubble;
}

// ---------- Send a question ----------
async function ask(question) {
    question = question.trim();
    if (!question) return;

    suggestions.hidden = true;            // hide the example questions after first use
    addMessage(question, "user");
    history.push({ role: "user", text: question });

    chatInput.value = "";
    chatInput.disabled = true;
    const typing = addMessage("Thinking", "bot");
    typing.classList.add("typing");       // animated dots (see style.css)

    try {
        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: history }),
            signal: AbortSignal.timeout(25000),   // give up after 25 seconds
        });
        const data = await response.json();
        const reply = data.reply || "Sorry, something went wrong. Please try again.";

        typing.remove();
        addMessage(reply, "bot");
        if (response.ok) history.push({ role: "assistant", text: reply });
        else history.pop();               // forget the failed question
    } catch (error) {
        typing.remove();
        const message = error.name === "TimeoutError"
            ? "That took too long. Please try again."
            : "I can't connect right now. Please check your internet and try again.";
        addMessage(message, "bot");
        history.pop();
    } finally {
        chatInput.disabled = false;
        if (!isTouchScreen) chatInput.focus();
    }
}

chatForm.addEventListener("submit", (e) => {
    e.preventDefault();                   // stop the page reloading
    ask(chatInput.value);
});

// Clicking an example question sends it
suggestions.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => ask(btn.textContent));
});
