import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
}

interface LiveChatProps {
  /** CSS height class, defaults to h-[60vh] */
  heightClass?: string;
}

export function LiveChat({ heightClass = "h-[60vh]" }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem("tww-nickname") || "";
  });
  const [nicknameSet, setNicknameSet] = useState(() => !!localStorage.getItem("tww-nickname"));
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime-live")
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

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!nicknameSet) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6 ${heightClass}`}>
        <Users className="h-8 w-8 text-primary" />
        <h2 className="font-display text-lg font-bold text-foreground">Join the Chat</h2>
        <p className="font-mono text-xs text-muted-foreground text-center max-w-xs">
          Pick a nickname to chat with fellow Gooners
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

  return (
    <div className={`flex flex-col rounded-xl border border-border bg-card overflow-hidden ${heightClass}`}>
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
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-2.5">
          {messages.length === 0 && (
            <p className="text-center font-mono text-xs text-muted-foreground py-8">
              No messages yet. Be the first! 🔴
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-[10px] font-bold">
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
                <p className="font-mono text-xs text-foreground/90 break-words">{msg.message}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-2.5">
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
            className="font-mono text-xs"
            maxLength={500}
            disabled={sending}
          />
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!newMessage.trim() || sending}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
