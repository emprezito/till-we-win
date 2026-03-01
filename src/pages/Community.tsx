import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useArsenalLive } from "@/hooks/useArsenalLive";
import { LiveIndicator } from "@/components/LiveIndicator";

interface ChatMessage {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
}

function MatchBanner() {
  const { data: arsenalData } = useArsenalLive();

  if (!arsenalData) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            {arsenalData.live && <LiveIndicator isLive />}
            <h2 className="font-display text-lg font-bold text-foreground">
              {arsenalData.homeTeam && arsenalData.awayTeam
                ? `${arsenalData.homeTeam} vs ${arsenalData.awayTeam}`
                : arsenalData.opponent
                  ? `Arsenal vs ${arsenalData.opponent}`
                  : "No match right now"}
            </h2>
          </div>
          {arsenalData.league && (
            <p className="font-mono text-xs text-muted-foreground mt-1">{arsenalData.league}</p>
          )}
          {arsenalData.score && (
            <p className="font-mono text-sm text-primary font-bold mt-1">{arsenalData.score}</p>
          )}
        </div>
        {arsenalData.status && (
          <span className="font-mono text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {arsenalData.status}
          </span>
        )}
      </div>
    </div>
  );
}

function ChatBox() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem("tww-nickname") || "";
  });
  const [nicknameSet, setNicknameSet] = useState(() => !!localStorage.getItem("tww-nickname"));
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    };
    fetchMessages();
  }, []);

  // Subscribe to realtime
  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSetNickname = () => {
    if (nickname.trim()) {
      localStorage.setItem("tww-nickname", nickname.trim());
      setNicknameSet(true);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    await supabase.from("chat_messages").insert({
      nickname: nickname.trim(),
      message: newMessage.trim(),
    });
    setNewMessage("");
    setSending(false);
  };

  if (!nicknameSet) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Users className="h-10 w-10 text-primary" />
        <h2 className="font-display text-xl font-bold text-foreground">Join the Chat</h2>
        <p className="font-mono text-sm text-muted-foreground text-center max-w-xs">
          Pick a nickname to start chatting with fellow Gooners
        </p>
        <div className="flex gap-2 w-full max-w-xs">
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your nickname..."
            className="font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSetNickname()}
            maxLength={20}
          />
          <Button onClick={handleSetNickname} disabled={!nickname.trim()}>
            Go
          </Button>
        </div>
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-[60vh] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-bold text-foreground uppercase tracking-wider">
            Live Chat
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          as <span className="text-primary font-bold">{nickname}</span>
        </span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-center font-mono text-sm text-muted-foreground py-8">
              No messages yet. Be the first to say something! 🔴
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-xs font-bold">
                {msg.nickname.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-xs font-bold text-foreground">
                    {msg.nickname}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <p className="font-mono text-sm text-foreground/90 break-words">{msg.message}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something..."
            className="font-mono text-sm"
            maxLength={500}
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

const Community = () => {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl md:text-4xl font-black uppercase tracking-wider text-foreground">
          Community
        </h1>
        <p className="font-mono text-sm text-muted-foreground mt-1">
          Chat with fellow Gooners during live matches 🔴⚪
        </p>
      </motion.div>

      <MatchBanner />
      <ChatBox />
    </div>
  );
};

export default Community;
