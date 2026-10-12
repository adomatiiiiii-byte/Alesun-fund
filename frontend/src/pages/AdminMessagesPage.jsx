import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useAuth } from "../state/AuthContext";

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("en-GB", {
    hour12: false
  });
}

function formatRelativeLabel(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
}

function createEmptyBorrowerDetail() {
  return {
    messages: []
  };
}

function getInitials(user) {
  const name = user?.ownerInfo?.fullName || user?.email || "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AdminMessagesPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(createEmptyBorrowerDetail());
  const [messageBody, setMessageBody] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const conversationRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadUsers() {
      try {
        const data = await api.getAdminUsers(token);
        if (!isCurrent) {
          return;
        }

        setUsers(data.users || []);
        setSelectedUserId((current) => current || data.users?.[0]?.id || null);
      } catch (error) {
        if (isCurrent) {
          setStatusMessage(error.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();
    const pollId = setInterval(loadUsers, 5000);

    return () => {
      isCurrent = false;
      clearInterval(pollId);
    };
  }, [token]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return users;
    }

    return users.filter((entry) => {
      const haystack = [
        entry.ownerInfo?.fullName,
        entry.email,
        entry.businessInfo?.businessName
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [search, users]);

  const selectedUser = useMemo(
    () => filteredUsers.find((entry) => entry.id === selectedUserId)
      || users.find((entry) => entry.id === selectedUserId)
      || filteredUsers[0]
      || users[0]
      || null,
    [filteredUsers, selectedUserId, users]
  );

  useEffect(() => {
    if (!selectedUser?.id) {
      setSelectedUserDetail(createEmptyBorrowerDetail());
      return;
    }

    let isCurrent = true;

    async function loadDetail() {
      try {
        const data = await api.getAdminUserDetail(token, selectedUser.id);
        if (isCurrent) {
          setSelectedUserDetail(data.detail || createEmptyBorrowerDetail());
        }
      } catch (error) {
        if (isCurrent) {
          setStatusMessage(error.message);
        }
      }
    }

    loadDetail();
    const pollId = setInterval(loadDetail, 3000);

    return () => {
      isCurrent = false;
      clearInterval(pollId);
    };
  }, [selectedUser?.id, token]);

  useEffect(() => {
    setMessageBody("");
  }, [selectedUser?.id]);

  const orderedMessages = useMemo(
    () =>
      [...(selectedUserDetail.messages || [])].sort(
        (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
      ),
    [selectedUserDetail.messages]
  );

  useEffect(() => {
    if (!conversationRef.current) {
      return;
    }

    const holder = conversationRef.current;
    holder.scrollTop = holder.scrollHeight;
  }, [orderedMessages, selectedUser?.id]);

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!selectedUser?.id || !messageBody.trim()) {
      return;
    }

    try {
      await api.sendAdminUserMessage(token, selectedUser.id, { body: messageBody });
      setMessageBody("");
      const data = await api.getAdminUserDetail(token, selectedUser.id);
      setSelectedUserDetail(data.detail || createEmptyBorrowerDetail());
      setStatusMessage("Message sent.");
    } catch (error) {
      setStatusMessage(error.message);
    }
  }

  if (isLoading) {
    return <p>Loading messages...</p>;
  }

  return (
    <div className="adminMessengerShell">
      <aside className="adminMessengerSidebar">
        <div className="adminMessengerSidebarHeader">
          <div>
            <p className="eyebrow">Internal chat</p>
            <h2>Messages</h2>
          </div>
        </div>
        <div className="adminMessengerSearch">
          <input
            type="search"
            placeholder="Search borrower chats"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="adminMessengerList">
          {filteredUsers.length ? (
            filteredUsers.map((entry) => {
              const lastMessage = entry.id === selectedUser?.id
                ? orderedMessages[orderedMessages.length - 1]
                : null;

              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`adminMessengerListItem${selectedUser?.id === entry.id ? " active" : ""}`}
                  onClick={() => setSelectedUserId(entry.id)}
                >
                  <span className="adminMessengerAvatar">{getInitials(entry)}</span>
                  <span className="adminMessengerListCopy">
                    <strong>{entry.ownerInfo?.fullName || entry.email}</strong>
                    <span>{lastMessage?.body || entry.businessInfo?.businessName || entry.email}</span>
                  </span>
                  <span className="adminMessengerListMeta">
                    {formatRelativeLabel(lastMessage?.createdAt || entry.submittedAt)}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="infoText">No borrower chats found.</p>
          )}
        </div>
      </aside>

      <section className="adminMessengerWorkspace">
        {selectedUser ? (
          <>
            <header className="adminMessengerHeader">
              <div className="adminMessengerHeaderIdentity">
                <span className="adminMessengerAvatar large">{getInitials(selectedUser)}</span>
                <div>
                  <h3>{selectedUser.ownerInfo?.fullName || selectedUser.email}</h3>
                  <p>{selectedUser.businessInfo?.businessName || selectedUser.email}</p>
                </div>
              </div>
              <div className="adminMessengerHeaderMeta">
                <span>{selectedUserDetail.lastOnline?.at ? `Last online ${formatDateTime(selectedUserDetail.lastOnline.at)}` : "No activity yet"}</span>
              </div>
            </header>

            <div ref={conversationRef} className="adminMessengerConversation">
              {orderedMessages.length ? (
                orderedMessages.map((entry) => {
                  const isOwn = entry.senderRole !== "APPLICANT";

                  return (
                    <div
                      key={entry.id}
                      className={isOwn ? "adminMessageRow adminMessageRowOwn" : "adminMessageRow"}
                    >
                      <div className={isOwn ? "adminMessageBubble adminMessageBubbleOwn" : "adminMessageBubble"}>
                        <div className="adminMessageMeta">
                          <strong>{isOwn ? (entry.senderName || user?.fullName || "Admin") : (entry.senderName || "Borrower")}</strong>
                          <span>{formatDateTime(entry.createdAt)}</span>
                        </div>
                        <p>{entry.body}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="adminMessengerEmptyState">
                  <p className="eyebrow">No messages</p>
                  <h3>Select a borrower and start the conversation.</h3>
                </div>
              )}
            </div>

            <form className="adminMessengerComposer" onSubmit={handleSendMessage}>
              <textarea
                placeholder="Reply to this borrower"
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
              />
              <button type="submit" disabled={!messageBody.trim()}>
                Send
              </button>
            </form>
            {statusMessage ? <p className="infoText">{statusMessage}</p> : null}
          </>
        ) : (
          <div className="adminMessengerEmptyState">
            <p className="eyebrow">Messages</p>
            <h3>Select a borrower to open the conversation.</h3>
          </div>
        )}
      </section>
    </div>
  );
}
