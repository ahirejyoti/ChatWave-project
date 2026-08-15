import { useEffect, useRef, useState } from "react";

export default function ChatRoom({ me, peer, socket, onBack, onCall, callDisabled }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    socket.emit("history:get", peer.id);

    const onHistory = ({ peerId, messages: history }) => {
      if (peerId === peer.id) setMessages(history);
    };
    const onNew = ({ peerId, message }) => {
      if (peerId === peer.id) setMessages((prev) => [...prev, message]);
    };

    socket.on("history:data", onHistory);
    socket.on("message:new", onNew);
    return () => {
      socket.off("history:data", onHistory);
      socket.off("message:new", onNew);
    };
  }, [socket, peer.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    socket.emit("message:send", { toId: peer.id, text });
    setDraft("");
  };

  return (
    <div className="screen chat-room-screen">
      <header className="top-bar chat-room-header">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <div className="chat-room-title">
          <span className="avatar avatar-sm">{peer.name.slice(0, 1).toUpperCase()}</span>
          <span>{peer.name}</span>
        </div>
        <button
          className="icon-btn call-btn"
          onClick={onCall}
          aria-label="Start voice call"
          disabled={callDisabled}
          title={callDisabled ? "Call in progress" : "Voice call"}
        >
          📞
        </button>
      </header>

      <div className="message-list">
        {messages.map((m, i) => (
          <div key={i} className={`bubble-row ${m.from === me.id ? "mine" : "theirs"}`}>
            <div className="bubble">{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="composer" onSubmit={send}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message..."
        />
        <button type="submit" className="btn-send" disabled={!draft.trim()}>
          ➤
        </button>
      </form>
    </div>
  );
}
