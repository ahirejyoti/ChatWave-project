function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ChatList({ me, users, onSelect }) {
  const others = users.filter((u) => u.id !== me.id);

  return (
    <div className="screen chat-list-screen">
      <header className="top-bar">
        <div>
          <h2>Chats</h2>
          <p className="top-bar-sub">Signed in as {me.name}</p>
        </div>
      </header>

      <div className="user-list">
        {others.length === 0 && (
          <div className="empty-state">
            <p>No one else is online yet.</p>
            <p className="empty-state-hint">Open this app in another tab to test chat and voice calling.</p>
          </div>
        )}
        {others.map((u) => (
          <button key={u.id} className="user-row" onClick={() => onSelect(u)}>
            <span className="avatar">{initials(u.name)}</span>
            <span className="user-row-info">
              <span className="user-row-name">{u.name}</span>
              <span className="user-row-status">
                <span className="dot-online" /> Online
              </span>
            </span>
            <span className="chevron">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
