import { useState } from "react";

export default function Login({ onJoin }) {
  const [name, setName] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onJoin(trimmed);
  };

  return (
    <div className="screen login-screen">
      <div className="login-hero">
        <div className="login-logo">💬</div>
        <h1>ChatWave</h1>
        <p className="login-sub">Message. Call. Connect.</p>
      </div>
      <form className="login-form" onSubmit={submit}>
        <label htmlFor="name">Enter your display name</label>
        <input
          id="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
          maxLength={40}
        />
        <button type="submit" className="btn-primary" disabled={!name.trim()}>
          Continue
        </button>
      </form>
    </div>
  );
}
