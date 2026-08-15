# ChatWave

A mobile-styled chat app clone with real-time messaging and real-time voice
calling (WebRTC), inspired by the Flitto control-panel preview link the
project was based on.

## Structure

- `server/` — Node.js + Express + Socket.IO backend. Tracks online users,
  relays 1:1 chat messages, and relays WebRTC signaling (offer/answer/ICE)
  for voice calls.
- `client/` — React (Vite) frontend styled as a mobile phone screen: login,
  chat list, chat room, and an in-call overlay.

## Running locally

### 1. Start the server

```bash
cd server
npm install
npm start
```

Runs on `http://localhost:4000`.

### 2. Start the client

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`. By default it connects to the server at
`http://localhost:4000` — override with a `.env` file setting
`VITE_SERVER_URL` if your server runs elsewhere (see `client/.env.example`).

### 3. Try it out

Open the client URL in two separate browser tabs (or two browsers), sign in
with a different display name in each, and:

- Pick the other user from the chat list to open a 1:1 chat and send
  messages in real time.
- Tap the phone icon in the chat header to start a **voice call**. The other
  tab shows an incoming-call screen; accepting connects real peer-to-peer
  audio (WebRTC, via a public STUN server) with mute, speaker toggle, a call
  timer, and hang up.

## Notes

- User presence and chat history are kept in memory on the server for the
  session — there's no database or persistent accounts.
- Voice calls use `RTCPeerConnection` with Google's public STUN server
  (`stun:stun.l.google.com:19302`) for NAT traversal; signaling (offer,
  answer, ICE candidates) is relayed over the existing Socket.IO connection.
