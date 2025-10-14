import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import websocketClient from "@/lib/websocket";
import { apiClient, Conversation, Message } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type UnreadMap = Record<string, number>;

interface ChatContextValue {
  wsConnected: boolean;
  unreadByConversation: UnreadMap;
  totalUnread: number;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [unreadByConversation, setUnreadByConversation] = useState<UnreadMap>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const initializedRef = useRef(false);
  const activeConversationIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | undefined>(undefined);
  const conversationsRef = useRef<string[]>([]);
  const joinedConversationsRef = useRef<Set<string>>(new Set());

  // Keep refs in sync with state for stable event handlers
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    userIdRef.current = user?._id;
  }, [user]);

  // Seed unread counts from API when user is present
  useEffect(() => {
    let mounted = true;
    const seedUnread = async () => {
      if (!user) return;
      try {
        const conversations: Conversation[] = await apiClient.getConversations();
        if (!mounted) return;
        conversationsRef.current = conversations.map((c) => c._id);
        const entries = await Promise.all(
          conversations.map(async (c) => {
            try {
              const { count } = await apiClient.getUnreadCount(c._id);
              return [c._id, count] as const;
            } catch (err) {
              console.error("Failed to fetch unread for conversation:", c._id, err);
              return [c._id, 0] as const;
            }
          })
        );
        const map: UnreadMap = Object.fromEntries(entries);
        setUnreadByConversation(map);
      } catch (error) {
        console.error("Failed to seed unread counts:", error);
      }
    };
    seedUnread();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Establish a single global websocket connection that persists while logged in
  useEffect(() => {
    if (!user) {
      // Disconnect on logout
      websocketClient.disconnect();
      setWsConnected(false);
      initializedRef.current = false;
      // Clear unread when logging out
      setUnreadByConversation({});
      // Clear joined and known conversations
      joinedConversationsRef.current.clear();
      conversationsRef.current = [];
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return;

    // Connect if not already connected (avoid duplicate connects)
    const ensureConnected = async () => {
      try {
        if (!websocketClient.isConnected()) {
          await websocketClient.connect(token);
          setWsConnected(true);
        }

        const joinExistingConversations = async () => {
          try {
            // If conversations not loaded yet, fetch them
            if (!conversationsRef.current.length) {
              const convs = await apiClient.getConversations();
              conversationsRef.current = convs.map((c) => c._id);
            }
            for (const id of conversationsRef.current) {
              if (!joinedConversationsRef.current.has(id)) {
                websocketClient.joinConversation(id);
                joinedConversationsRef.current.add(id);
              }
            }
          } catch (err) {
            console.error("Failed joining existing conversations", err);
          }
        };

        // Register handlers once per login session
        if (!initializedRef.current) {
          initializedRef.current = true;

          // New message handler updates unread counters when not on the active conversation
          websocketClient.on("message:new", (data: { message?: Message }) => {
            const msg = data.message;
            if (!msg) return;
            const msgConversationId = msg.conversation;
            const senderId = typeof msg.sender === "string" ? msg.sender : msg.sender?._id;
            const isOwn = senderId === userIdRef.current;

            setUnreadByConversation((prev) => {
              const shouldInc = !isOwn && (!activeConversationIdRef.current || activeConversationIdRef.current !== msgConversationId);
              if (!shouldInc) return prev;
              const next: UnreadMap = { ...prev };
              next[msgConversationId] = (next[msgConversationId] || 0) + 1;
              return next;
            });
          });

          websocketClient.on("message:deleted", (_deletedId: string) => {
            // Best effort: skip heavy unread recalculation
          });

          // Conversation membership and lifecycle
          websocketClient.on("conversation:new", (conversation: Conversation) => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const participantIds = (conversation.participants || []).map((p: any) => (typeof p === "string" ? p : p?._id));
              if (userIdRef.current && participantIds.includes(userIdRef.current)) {
                conversationsRef.current = Array.from(new Set([...conversationsRef.current, conversation._id]));
                if (!joinedConversationsRef.current.has(conversation._id)) {
                  websocketClient.joinConversation(conversation._id);
                  joinedConversationsRef.current.add(conversation._id);
                }
              }
            } catch (err) {
              console.error("Failed handling conversation:new", err);
            }
          });

          websocketClient.on(
            "conversation:participant_added",
            (data: { conversation: Conversation; addedUserId: string }) => {
              try {
                const { conversation, addedUserId } = data;
                if (userIdRef.current && addedUserId === userIdRef.current && conversation?._id) {
                  const id = conversation._id;
                  conversationsRef.current = Array.from(new Set([...conversationsRef.current, id]));
                  if (!joinedConversationsRef.current.has(id)) {
                    websocketClient.joinConversation(id);
                    joinedConversationsRef.current.add(id);
                  }
                }
              } catch (err) {
                console.error("Failed handling participant_added", err);
              }
            }
          );

          websocketClient.on(
            "conversation:participant_removed",
            (data: { conversation: Conversation; removedUserId: string }) => {
              try {
                const { conversation, removedUserId } = data;
                if (userIdRef.current && removedUserId === userIdRef.current && conversation?._id) {
                  const id = conversation._id;
                  joinedConversationsRef.current.delete(id);
                  conversationsRef.current = conversationsRef.current.filter((cid) => cid !== id);
                  websocketClient.leaveConversation(id);
                  setUnreadByConversation((prev) => {
                    if (!(id in prev)) return prev;
                    const next = { ...prev };
                    delete next[id];
                    return next;
                  });
                }
              } catch (err) {
                console.error("Failed handling participant_removed", err);
              }
            }
          );

          websocketClient.on("conversation:deleted", (conversationId: string) => {
            try {
              joinedConversationsRef.current.delete(conversationId);
              conversationsRef.current = conversationsRef.current.filter((cid) => cid !== conversationId);
              setUnreadByConversation((prev) => {
                if (!(conversationId in prev)) return prev;
                const next = { ...prev };
                delete next[conversationId];
                return next;
              });
            } catch (err) {
              console.error("Failed handling conversation:deleted", err);
            }
          });

          // Connection lifecycle
          websocketClient.on("connect", () => {
            setWsConnected(true);
            // After any reconnect, rooms are reset — rejoin
            (async () => {
              await joinExistingConversations();
            })();
          });
          websocketClient.on("disconnect", () => setWsConnected(false));

          // Initial join of existing conversations once connected
          await joinExistingConversations();
        }
      } catch (error) {
        console.error("Global WebSocket connect failed:", error);
        setWsConnected(false);
      }
    };

    ensureConnected();

    return () => {
      // Clean up handlers on provider unmount or auth change
      websocketClient.off("message:new");
      websocketClient.off("message:deleted");
      websocketClient.off("conversation:new");
      websocketClient.off("conversation:participant_added");
      websocketClient.off("conversation:participant_removed");
      websocketClient.off("conversation:deleted");
      websocketClient.off("connect");
      websocketClient.off("disconnect");
    };
  }, [user]);

  const totalUnread = useMemo(() => {
    return Object.values(unreadByConversation).reduce((sum, n) => sum + (n || 0), 0);
  }, [unreadByConversation]);

  const value: ChatContextValue = {
    wsConnected,
    unreadByConversation,
    totalUnread,
    activeConversationId,
    setActiveConversationId: (id) => {
      setActiveConversationId(id);
      activeConversationIdRef.current = id;
      if (!id) return;
      // Clear unread for conversation when it becomes active
      setUnreadByConversation((prev) => {
        if (prev[id] === undefined || prev[id] === 0) return prev;
        const next = { ...prev };
        next[id] = 0;
        return next;
      });
    },
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}