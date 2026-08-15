import { useCallback, useEffect, useRef, useState } from "react";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

// Call state machine: idle -> outgoing|incoming -> connected -> idle
export function useCall(socket, myId) {
  const [callState, setCallState] = useState("idle");
  const [peer, setPeer] = useState(null); // { id, name }
  const [muted, setMuted] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState(null);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    pendingCandidatesRef.current = [];
    setCallState("idle");
    setPeer(null);
    setMuted(false);
    setCallStartedAt(null);
  }, []);

  const createPeerConnection = useCallback(
    (targetId) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:signal", {
            toId: targetId,
            data: { type: "ice", candidate: event.candidate },
          });
        }
      };
      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallStartedAt((prev) => prev ?? Date.now());
        }
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          // let explicit call:end handle full cleanup
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [socket]
  );

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const startCall = useCallback(
    async (target) => {
      try {
        setError(null);
        setPeer(target);
        setCallState("outgoing");
        socket.emit("call:invite", { toId: target.id });
      } catch (err) {
        setError(err.message);
        cleanup();
      }
    },
    [socket, cleanup]
  );

  const acceptCall = useCallback(async () => {
    if (!peer) return;
    try {
      await getLocalStream();
      socket.emit("call:accept", { toId: peer.id });
      setCallState("connected");
    } catch (err) {
      setError("Microphone permission denied");
      socket.emit("call:decline", { toId: peer.id });
      cleanup();
    }
  }, [peer, socket, getLocalStream, cleanup]);

  const declineCall = useCallback(() => {
    if (peer) socket.emit("call:decline", { toId: peer.id });
    cleanup();
  }, [peer, socket, cleanup]);

  const endCall = useCallback(() => {
    if (peer) socket.emit("call:end", { toId: peer.id });
    cleanup();
  }, [peer, socket, cleanup]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const next = !muted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }, [muted]);

  useEffect(() => {
    const onIncoming = ({ fromId, fromName }) => {
      setPeer({ id: fromId, name: fromName });
      setCallState((prev) => (prev === "idle" ? "incoming" : prev));
    };

    const onAccepted = async ({ fromId }) => {
      // We are the caller; callee accepted. Create offer.
      const stream = await getLocalStream();
      const pc = createPeerConnection(fromId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call:signal", { toId: fromId, data: { type: "offer", sdp: offer } });
      setCallState("connected");
    };

    const onDeclined = () => {
      setError("Call declined");
      cleanup();
    };

    const onEnded = () => {
      cleanup();
    };

    const onSignal = async ({ fromId, data }) => {
      if (data.type === "offer") {
        const stream = await getLocalStream();
        const pc = pcRef.current || createPeerConnection(fromId);
        stream.getTracks().forEach((track) => {
          if (!pc.getSenders().find((s) => s.track === track)) pc.addTrack(track, stream);
        });
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(c);
        pendingCandidatesRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("call:signal", { toId: fromId, data: { type: "answer", sdp: answer } });
      } else if (data.type === "answer") {
        const pc = pcRef.current;
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === "ice") {
        const candidate = new RTCIceCandidate(data.candidate);
        const pc = pcRef.current;
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      }
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:declined", onDeclined);
    socket.on("call:ended", onEnded);
    socket.on("call:signal", onSignal);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:declined", onDeclined);
      socket.off("call:ended", onEnded);
      socket.off("call:signal", onSignal);
    };
  }, [socket, cleanup, createPeerConnection, getLocalStream]);

  return {
    callState,
    peer,
    muted,
    error,
    callStartedAt,
    remoteAudioRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  };
}
