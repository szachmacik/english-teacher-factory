import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Trash2, Loader2, User, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface Props {
  projectId: number;
}

const QUICK_PROMPTS = [
  "Suggest 5 discussion questions",
  "Create a warm-up activity",
  "Generate a grammar drill",
  "Write a role-play scenario",
  "Suggest homework ideas",
  "Create a vocabulary quiz",
  "Explain the grammar point",
  "Make it more challenging",
];

export default function ProjectChatAssistant({ projectId }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: chatData, refetch } = trpc.factory.chat.history.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const sendMessage = trpc.factory.chat.send.useMutation({
    onSuccess: () => {
      setInput("");
      refetch();
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    },
    onError: (err) => toast.error("Failed to send message", { description: err.message }),
  });

  const clearChat = trpc.factory.chat.clear.useMutation({
    onSuccess: () => { refetch(); toast.success("Chat cleared"); },
  });

  const handleSend = (msg?: string) => {
    const text = msg ?? input.trim();
    if (!text || sendMessage.isPending) return;
    sendMessage.mutate({ projectId, message: text });
    if (!msg) setInput("");
  };

  const messages = chatData ?? [];

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm">AI Teaching Assistant</div>
            <div className="text-xs text-muted-foreground">Ask anything about this project</div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-destructive"
            onClick={() => clearChat.mutate({ projectId })}>
            <Trash2 className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Quick prompts */}
      <div className="py-3 border-b border-border">
        <p className="text-xs text-muted-foreground mb-2 font-medium">Quick prompts:</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => handleSend(p)}
              className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20">
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef as any}>
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">Your AI teaching assistant is ready</p>
              <p className="text-xs mt-1">Ask about this project, request modifications, or get teaching ideas</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                }`}>
                  {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted rounded-tl-sm"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  <div className={`text-xs mt-1 opacity-60 ${msg.role === "user" ? "text-right" : ""}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))
          )}
          {sendMessage.isPending && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="pt-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about this project..."
            className="flex-1 text-sm"
            disabled={sendMessage.isPending}
          />
          <Button size="sm" onClick={() => handleSend()} disabled={!input.trim() || sendMessage.isPending} className="px-3">
            {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
