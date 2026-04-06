// ─────────────────────────────────────────────
// CONFIG — Replace this with your OpenAI API key
// ─────────────────────────────────────────────
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-3.5-turbo";
const API_KEY = " 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   "
// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
let darkMode = localStorage.getItem("puskar-dark") === "true";
let ttsEnabled = false;
let isListening = false;
let isSpeaking = false;
let recognition = null;
let chatHistory = [];
let userName = "";

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  applyDark();
  showPage("dashboard");
});

// ─────────────────────────────────────────────
// PAGE NAVIGATION
// ─────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
  const pg = document.getElementById("page-" + id);
  if (pg) pg.classList.add("active");
  const navEl = document.getElementById("nav-" + id);
  if (navEl) navEl.classList.add("active");
}

// ─────────────────────────────────────────────
// DARK MODE
// ─────────────────────────────────────────────
function toggleDark() {
  darkMode = !darkMode;
  localStorage.setItem("puskar-dark", darkMode);
  applyDark();
}

function applyDark() {
  document.body.classList.toggle("dark", darkMode);
  const btn = document.getElementById("darkToggleBtn");
  if (btn) btn.textContent = darkMode ? "☀️" : "🌙";
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => t.className = "toast", 3000);
}

// ─────────────────────────────────────────────
// OPENAI HELPER
// ─────────────────────────────────────────────
async function callOpenAI(messages, jsonMode = false) {
  const body = {
    model: MODEL,
    max_tokens: 1024,
    messages,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("OpenAI API error: " + res.status);
  const data = await res.json();
  return data.choices[0]?.message?.content || "";
}

// ─────────────────────────────────────────────
// COMPOSE — OUTREACH EMAIL
// ─────────────────────────────────────────────
async function generateOutreachEmail() {
  const name    = document.getElementById("compose-name").value.trim();
  const company = document.getElementById("compose-company").value.trim();
  const title   = document.getElementById("compose-title").value.trim();
  const tone    = document.getElementById("compose-tone").value;
  const context = document.getElementById("compose-context").value.trim();

  if (!name) { showToast("Please enter a recipient name.", true); return; }

  const btnText = document.getElementById("compose-btn-text");
  btnText.textContent = "⏳ Generating...";

  const systemPrompt = `You are an expert sales copywriter. Write personalized outreach emails that are concise, compelling, and get responses.
The email should have a ${tone} tone.
${context ? "Additional context: " + context : ""}
Return a JSON object with:
- "subject": a compelling subject line (max 60 characters)
- "body": the email body (plain text, 3-5 short paragraphs, max 300 words, do not include markdown)`;

  const prospectInfo = [
    "Name: " + name,
    company ? "Company: " + company : null,
    title ? "Title: " + title : null,
  ].filter(Boolean).join("\n");

  try {
    const raw = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Write a sales outreach email for:\n" + prospectInfo },
    ], true);

    const result = JSON.parse(raw);
    document.getElementById("compose-subject-out").value = result.subject || "";
    document.getElementById("compose-body-out").value = result.body || "";
    document.getElementById("compose-result").style.display = "block";
    document.getElementById("compose-result").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    showToast("Oops, something went wrong. Please try again.", true);
  } finally {
    btnText.textContent = "✨ Generate Email";
  }
}

function copyCompose() {
  const subject = document.getElementById("compose-subject-out").value;
  const body    = document.getElementById("compose-body-out").value;
  navigator.clipboard.writeText("Subject: " + subject + "\n\n" + body);
  const lbl = document.getElementById("copy-compose-label");
  lbl.textContent = "✅ Copied!";
  setTimeout(() => lbl.textContent = "📋 Copy All", 2000);
  showToast("Copied to clipboard!");
}

// ─────────────────────────────────────────────
// REPLY ASSISTANT
// ─────────────────────────────────────────────
async function generateReply() {
  const original = document.getElementById("reply-original").value.trim();
  const tone     = document.getElementById("reply-tone").value;
  const context  = document.getElementById("reply-context").value.trim();

  if (!original) { showToast("Please paste the email you want to reply to.", true); return; }

  const btnText = document.getElementById("reply-btn-text");
  btnText.textContent = "⏳ Generating...";

  const systemPrompt = `You are an expert email writer. Generate a polished, professional reply to the email provided.
Tone: ${tone}
${context ? "Additional context: " + context : ""}
Return a JSON object with:
- "subject": reply subject line (prepend "Re: " if a subject is identifiable, else create one)
- "body": the full email reply body (no markdown, 2-4 paragraphs, ready to send)`;

  try {
    const raw = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Write a reply to this email:\n\n" + original },
    ], true);

    const result = JSON.parse(raw);
    document.getElementById("reply-subject-out").textContent = result.subject || "";
    document.getElementById("reply-body-out").textContent    = result.body    || "";
    document.getElementById("reply-result").style.display = "block";
    document.getElementById("reply-result").scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    showToast("Oops, something went wrong. Please try again.", true);
  } finally {
    btnText.textContent = "✨ Generate Reply";
  }
}

function copyReply() {
  const subject = document.getElementById("reply-subject-out").textContent;
  const body    = document.getElementById("reply-body-out").textContent;
  navigator.clipboard.writeText("Subject: " + subject + "\n\n" + body);
  const lbl = document.getElementById("copy-reply-label");
  lbl.textContent = "✅ Copied!";
  setTimeout(() => lbl.textContent = "📋 Copy All", 2000);
  showToast("Copied to clipboard!");
}

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────
function startChat() {
  userName = document.getElementById("user-name-input").value.trim();
  document.getElementById("name-prompt").style.display = "none";
  document.getElementById("chat-ui").style.display = "flex";
  const label = document.getElementById("chat-user-label");
  label.textContent = userName ? "Hello, " + userName + "!" : "";

  // Add welcome message
  chatHistory = [];
  const container = document.getElementById("chat-messages");
  container.innerHTML = "";
  appendMessage("assistant",
    "Hello" + (userName ? ", " + userName : "") + "! I'm Puskar AI, your intelligent sales assistant. I can answer questions, explain topics, give suggestions, and help with your outreach. What would you like to talk about?"
  );
}

async function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) { showToast("Please type a message first.", true); return; }
  input.value = "";
  input.style.height = "auto";
  await sendMessage(text);
}

async function sendMessage(text) {
  appendMessage("user", text);
  chatHistory.push({ role: "user", content: text });

  const systemPrompt = `You are Puskar AI, a smart, friendly, and professional AI assistant built for sales teams.
You help with general questions, explain topics (tech, business, AI, etc.), give suggestions (travel, coding, recipes, etc.), and support sales outreach workflows.
${userName ? "The user's name is " + userName + ". Address them by name occasionally to be personable." : ""}
Be conversational, concise, and helpful. Use bullet points or numbered lists when explaining multi-step topics.
Always stay positive and encouraging.`;

  showTyping(true);
  try {
    const reply = await callOpenAI([
      { role: "system", content: systemPrompt },
      ...chatHistory,
    ]);
    chatHistory.push({ role: "assistant", content: reply });
    showTyping(false);
    appendMessage("assistant", reply);
    if (ttsEnabled) speakText(reply);
  } catch (e) {
    showTyping(false);
    appendMessage("assistant", "Oops, something went wrong. Please try again!");
    showToast("Could not reach the AI. Please check your API key.", true);
  }
}

function appendMessage(role, content) {
  const container = document.getElementById("chat-messages");
  const wrap = document.createElement("div");
  wrap.className = "msg-wrap " + role;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = role === "user"
    ? (userName ? userName[0].toUpperCase() : "U")
    : "AI";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + role;

  const text = document.createElement("p");
  text.className = "msg-text";
  text.textContent = content;

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  meta.innerHTML = `<span class="msg-time">${time}</span>
    <button class="copy-msg-btn" onclick="copyMsg(this, \`${content.replace(/`/g, "\\`")}\`)">📋</button>`;

  bubble.appendChild(text);
  bubble.appendChild(meta);

  if (role === "user") { wrap.appendChild(bubble); wrap.appendChild(avatar); }
  else { wrap.appendChild(avatar); wrap.appendChild(bubble); }

  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function copyMsg(btn, text) {
  navigator.clipboard.writeText(text);
  btn.textContent = "✅";
  setTimeout(() => btn.textContent = "📋", 2000);
}

function showTyping(show) {
  const existing = document.getElementById("typing-indicator");
  if (existing) existing.remove();
  if (!show) return;
  const container = document.getElementById("chat-messages");
  const wrap = document.createElement("div");
  wrap.className = "msg-wrap assistant";
  wrap.id = "typing-indicator";
  wrap.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-bubble assistant">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function chatKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
  // Auto-grow textarea
  e.target.style.height = "auto";
  e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
}

function sendQuick(btn) {
  const text = btn.textContent;
  sendMessage(text);
}

// ─────────────────────────────────────────────
// VOICE INPUT
// ─────────────────────────────────────────────
function toggleMic() {
  if (isListening) {
    stopMic();
  } else {
    startMic();
  }
}

function startMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast("Voice input is not supported in this browser.", true); return; }
  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.onstart = () => {
    isListening = true;
    const btn = document.getElementById("mic-btn");
    btn.textContent = "🔴";
    btn.classList.add("mic-active");
  };
  recognition.onend = () => {
    isListening = false;
    const btn = document.getElementById("mic-btn");
    btn.textContent = "🎤";
    btn.classList.remove("mic-active");
  };
  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map((r) => r[0].transcript).join("");
    document.getElementById("chat-input").value = transcript;
    if (e.results[e.results.length - 1].isFinal) sendMessage(transcript);
  };
  recognition.onerror = () => {
    isListening = false;
    showToast("Voice input error.", true);
  };
  recognition.start();
}

function stopMic() {
  if (recognition) recognition.stop();
  isListening = false;
}

// ─────────────────────────────────────────────
// TEXT TO SPEECH
// ─────────────────────────────────────────────
function toggleTts() {
  ttsEnabled = !ttsEnabled;
  const btn = document.getElementById("tts-toggle");
  btn.textContent = ttsEnabled ? "🔊 Voice On" : "🔇 Voice Off";
  if (!ttsEnabled) stopSpeaking();
}

function speakText(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.onstart = () => {
    isSpeaking = true;
    document.getElementById("stop-speak-btn").style.display = "inline-flex";
  };
  utterance.onend = () => {
    isSpeaking = false;
    document.getElementById("stop-speak-btn").style.display = "none";
  };
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  window.speechSynthesis.cancel();
  isSpeaking = false;
  document.getElementById("stop-speak-btn").style.display = "none";
}
