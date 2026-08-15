import { useEffect, useState } from "react";

function useElapsed(startedAt) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function CallOverlay({ call }) {
  const { callState, peer, muted, callStartedAt, remoteAudioRef, acceptCall, declineCall, endCall, toggleMute } = call;
  const timer = useElapsed(callStartedAt);
  const [speakerOn, setSpeakerOn] = useState(true);

  if (callState === "idle" || !peer) return null;

  return (
    <div className="call-overlay">
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: speakerOn ? "block" : "none" }} />
      <div className="call-card">
        <div className="call-avatar">{peer.name.slice(0, 1).toUpperCase()}</div>
        <h2>{peer.name}</h2>
        <p className="call-status">
          {callState === "outgoing" && "Calling…"}
          {callState === "incoming" && "Incoming voice call"}
          {callState === "connected" && (callStartedAt ? timer : "Connecting…")}
        </p>

        {callState === "incoming" ? (
          <div className="call-actions call-actions-incoming">
            <button className="call-btn-round decline" onClick={declineCall} aria-label="Decline">
              ✕
            </button>
            <button className="call-btn-round accept" onClick={acceptCall} aria-label="Accept">
              ✓
            </button>
          </div>
        ) : (
          <>
            <div className="call-actions">
              <button
                className={`call-btn-round toggle ${muted ? "active" : ""}`}
                onClick={toggleMute}
                aria-label="Mute"
              >
                {muted ? "🔇" : "🎤"}
              </button>
              <button
                className={`call-btn-round toggle ${speakerOn ? "active" : ""}`}
                onClick={() => setSpeakerOn((s) => !s)}
                aria-label="Speaker"
              >
                🔊
              </button>
            </div>
            <button className="call-btn-round decline end-call" onClick={endCall} aria-label="End call">
              📞
            </button>
          </>
        )}
      </div>
    </div>
  );
}
