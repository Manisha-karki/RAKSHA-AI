// --- Chat ---
let chatHistory = [];

function appendChatMessage(role, text) {
  const messagesEl = document.getElementById("chat-messages");
  if (!messagesEl) return;
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble " + (role === "user" ? "chat-user" : "chat-assistant");

  const span = document.createElement("span");
  span.textContent = text;

  // Delete button on each message
  const del = document.createElement("button");
  del.type = "button";
  del.className = "bubble-delete";
  del.title = "Delete message";
  del.textContent = "×";
  del.addEventListener("click", () => bubble.remove());

  bubble.appendChild(span);
  bubble.appendChild(del);
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Clear the whole chat
const clearBtn = document.getElementById("chat-clear");
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (!confirm("Delete all messages in this chat?")) return;
    document.getElementById("chat-messages").innerHTML = "";
  });
}

const chatForm = document.getElementById("chat-form");
if (chatForm) {
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    appendChatMessage("user", text);
    input.value = "";
    input.disabled = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");
      appendChatMessage("assistant", data.reply);
    } catch (err) {
      appendChatMessage("assistant", "Sorry, something went wrong. Please try again.");
      console.error(err);
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
}

// --- Mic input (Web Speech API) ---
const chatMic = document.getElementById("chat-mic");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (chatMic) {
  if (!SpeechRecognition) {
    chatMic.style.display = "none"; // browser doesn't support it (e.g. Firefox)
  } else {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let listening = false;

    chatMic.addEventListener("click", () => {
      if (listening) {
        recognition.stop();
        return;
      }
      try { recognition.start(); } catch (err) { /* already starting, ignore */ }
    });

    recognition.addEventListener("start", () => {
      listening = true;
      chatMic.classList.add("listening");
      chatMic.title = "Listening... click to stop";
    });

    recognition.addEventListener("end", () => {
      listening = false;
      chatMic.classList.remove("listening");
      chatMic.title = "Speak your message";
    });

    recognition.addEventListener("result", (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById("chat-input").value = transcript;
      document.getElementById("chat-input").focus();
    });

    recognition.addEventListener("error", (event) => {
      listening = false;
      chatMic.classList.remove("listening");
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        alert("Microphone access was blocked. Please allow microphone permission to use voice input.");
      }
    });
  }
}

// --- Profile icon (dashboard) ---
function renderProfile() {
  const btn = document.getElementById("profile-btn");
  if (!btn) return;
  const email = localStorage.getItem("auth_username") || "";
  const name = localStorage.getItem("auth_name") || email || "User";
  const picture = localStorage.getItem("auth_picture");

  btn.innerHTML = "";
  if (picture) {
    const img = document.createElement("img");
    img.src = picture;
    img.alt = name;
    img.referrerPolicy = "no-referrer";
    btn.appendChild(img);
  } else {
    btn.textContent = name.charAt(0).toUpperCase();
  }
  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-email").textContent = email;
}

const profileBtn = document.getElementById("profile-btn");
const profileMenu = document.getElementById("profile-menu");
if (profileBtn) {
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu.style.display = profileMenu.style.display === "none" ? "block" : "none";
  });
  document.addEventListener("click", () => { profileMenu.style.display = "none"; });

  document.getElementById("profile-logout").addEventListener("click", () => {
    document.getElementById("logout-btn").click(); // reuses your existing logout
  });
}

// Refresh the icon after login and when opening the dashboard
const prevUnlock = window.onAppUnlocked;
window.onAppUnlocked = function (username) {
  if (typeof prevUnlock === "function") prevUnlock(username);
  renderProfile();
};
const dashTab = document.getElementById("tab-dashboard");
if (dashTab) dashTab.addEventListener("click", renderProfile);
renderProfile();