const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

// 🔑 Replace with your OpenAI API key (keep secret)
const API_KEY = "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";

sendBtn.addEventListener("click", async () => {
    const message = userInput.value.trim();
    if (!message) return;

    appendMessage("user", message);
    userInput.value = "";

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: message }]
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content;
        appendMessage("bot", reply);

    } catch (error) {
        appendMessage("bot", "Oops! Something went wrong.");
        console.error(error);
    }
});

function appendMessage(sender, text) {
    const msg = document.createElement("p");
    msg.textContent = text;
    msg.className = sender === "user" ? "user-msg" : "bot-msg";
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}
