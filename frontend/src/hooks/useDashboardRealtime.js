import { useEffect, useRef, useState } from "react";
import { API_URL } from "../api";

function buildSocketUrl(token) {
  const baseUrl = API_URL.replace(/\/api$/, "");
  return `${baseUrl.replace(/^http/, "ws")}/ws/dashboard?token=${encodeURIComponent(token)}`;
}

export function useDashboardRealtime({
  token,
  enabled = true,
  pollIntervalMs = 45000,
  onPoll,
  handlers = {}
}) {
  const [isLive, setIsLive] = useState(false);
  const handlersRef = useRef(handlers);
  const onPollRef = useRef(onPoll);
  const pollRef = useRef(null);
  const reconnectRef = useRef(null);

  handlersRef.current = handlers;
  onPollRef.current = onPoll;

  useEffect(() => {
    if (!enabled || !token) {
      setIsLive(false);
      return undefined;
    }

    let socket = null;
    let disposed = false;

    function clearPoller() {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    function startPoller() {
      if (!onPollRef.current || pollRef.current) {
        return;
      }

      pollRef.current = window.setInterval(() => {
        const nextPoll = onPollRef.current();
        Promise.resolve(nextPoll).catch(() => {});
      }, pollIntervalMs);
    }

    function scheduleReconnect() {
      if (disposed || reconnectRef.current) {
        return;
      }

      reconnectRef.current = window.setTimeout(() => {
        reconnectRef.current = null;
        if (!disposed) {
          connect();
        }
      }, 3000);
    }

    function connect() {
      if (disposed) {
        return;
      }

      socket = new WebSocket(buildSocketUrl(token));

      socket.addEventListener("open", () => {
        setIsLive(true);
        clearPoller();
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data);
          const handler = handlersRef.current[payload.type];
          if (handler) {
            handler(payload);
          }
        } catch (_error) {
          // Ignore malformed payloads from stale sockets.
        }
      });

      socket.addEventListener("close", () => {
        setIsLive(false);
        startPoller();
        scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        setIsLive(false);
        startPoller();
      });
    }

    connect();
    startPoller();

    return () => {
      disposed = true;
      setIsLive(false);
      clearPoller();
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [enabled, pollIntervalMs, token]);

  return { isLive };
}
