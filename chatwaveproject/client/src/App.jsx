import { useEffect, useState } from "react";
import { socket } from "./socket";
import { useCall } from "./useCall";
import Login from "./components/Login";
import ChatList from "./components/ChatList";
import ChatRoom from "./components/ChatRoom";
import CallOverlay from "./components/CallOverlay";
import "./App.css";

export default function App() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [activePeer, setActivePeer] = useState(null);

  const call = useCall(socket, me?.id);

  useEffect(() => {
    const onConnect = () => setMe((prev) => (prev ? { ...prev, id: socket.id } : prev));
    const onUsers = (list) => setUsers(list);

    socket.on("connect", onConnect);
    socket.on("users", onUsers);
    return () => {
      socket.off("connect", onConnect);
      socket.off("users", onUsers);
    };
  }, []);

  const join = (name) => {
    socket.connect();
    socket.once("connect", () => {
      setMe({ id: socket.id, name });
      socket.emit("join", name);
    });
  };

  if (!me) {
    return (
      <div className="phone">
        <Login onJoin={join} />
      </div>
    );
  }

  return (
    <div className="phone">
      {activePeer ? (
        <ChatRoom
          me={me}
          peer={activePeer}
          socket={socket}
          onBack={() => setActivePeer(null)}
          onCall={() => call.startCall(activePeer)}
          callDisabled={call.callState !== "idle"}
        />
      ) : (
        <ChatList me={me} users={users} onSelect={setActivePeer} />
      )}
      <CallOverlay call={call} />
    </div>
  );
}
