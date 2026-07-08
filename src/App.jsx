import { useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setReply(JSON.stringify(data, null, 2));
    } catch (err) {
      setReply("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: "0 20px" }}>
      <h1>AI Chat</h1>
      <textarea
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        style={{ width: "100%", marginBottom: 10 }}
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? "Sending..." : "Send"}
      </button>
      {reply && (
        <pre
          style={{
            marginTop: 20,
            background: "#f5f5f5",
            padding: 16,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          {reply}
        </pre>
      )}
    </div>
  );
}

export default App;
