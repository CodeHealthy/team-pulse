import { useEffect, useState } from "react";

import { socket } from "./lib/socket";

function App() {
  const [socketStatus, setSocketStatus] = useState("Disconnected");
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    function handleConnect() {
      setSocketStatus("Connected");
    }

    function handleDisconnect() {
      setSocketStatus("Disconnected");
      setSocketId(null);
    }

    function handleReady(data) {
      setSocketId(data.socketId);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connection:ready", handleReady);

    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connection:ready", handleReady);
      socket.disconnect();
    };
  }, []);

  return (
    <main>
      <h1>TeamPulse</h1>
      <p>Real-time team collaboration workspace</p>

      <p>
        Socket status: <strong>{socketStatus}</strong>
      </p>

      {socketId && <p>Socket ID: {socketId}</p>}
    </main>
  );
}

export default App;