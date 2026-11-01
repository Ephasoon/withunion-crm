"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send, Bot, User, Sparkles, RefreshCw, Copy, ThumbsUp,
  ThumbsDown, ChevronRight, Zap, Globe, BarChart3, FileText,
  Mail, Users, TrendingUp, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
}

const SUGGESTED_PROMPTS = [
  { icon: Users, text: "Analyze my leads and identify the best opportunities", category: "Leads" },
  { icon: FileText, text: "Generate a professional proposal for a tech client", category: "Proposals" },
  { icon: Mail, text: "Write a follow-up email for NA Hotel Group", category: "Email" },
  { icon: TrendingUp, text: "Show me my revenue forecast for next quarter", category: "Analytics" },
  { icon: BarChart3, text: "Which deals are most likely to close this week?", category: "Pipeline" },
  { icon: Globe, text: "Translate our service proposal to Amharic", category: "Translation" },
];

function MessageBubble({ message }: { message: Message }) {
  const isAssistant = message.role === "assistant";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse markdown-like formatting
  const formatContent = (text: string) => {
    return text
      .split("\n")
      .map((line, i) => {
        // Headers
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-bold text-slate-900 dark:text-white mt-3 first:mt-0">{line.slice(2, -2)}</p>;
        }
        // Bold inline
        const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        if (line.startsWith("•") || line.startsWith("-")) {
          return (
            <div key={i} className="flex items-start gap-2 mt-1">
              <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: boldFormatted.replace(/^[•\-]\s*/, '') }} />
            </div>
          );
        }
        // Table row
        if (line.includes("|") && line.trim().startsWith("|")) {
          return null; // Skip raw table lines, handled below
        }
        // Empty line
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        // Regular paragraph
        return <p key={i} className="mt-1 first:mt-0" dangerouslySetInnerHTML={{ __html: boldFormatted }} />;
      });
  };

  return (
    <div className={cn("flex gap-3 group", isAssistant ? "items-start" : "items-start flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center",
          isAssistant
            ? "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20"
            : "bg-slate-200 dark:bg-slate-700"
        )}
      >
        {isAssistant ? (
          <Sparkles className="w-4 h-4 text-white" />
        ) : (
          <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        )}
      </div>

      {/* Message */}
      <div className={cn("flex flex-col max-w-[80%]", isAssistant ? "items-start" : "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isAssistant
              ? "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm"
              : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
          )}
        >
          {formatContent(message.content)}
        </div>

        {/* Actions */}
        <div className={cn(
          "flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity",
          isAssistant ? "flex-row" : "flex-row-reverse"
        )}>
          <span className="text-[10px] text-slate-400 px-1">
            {formatRelativeTime(message.timestamp)}
            {message.model && ` • ${message.model}`}
          </span>
          {isAssistant && (
            <>
              <button
                onClick={handleCopy}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button className="p-1 rounded text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ThumbsDown className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! 👋 I'm your **WithUnion AI Assistant** — your intelligent business co-pilot.

I'm trained to help you:

• **Analyze leads** and identify high-value opportunities
• **Generate proposals** and professional documents
• **Write emails** for follow-ups and outreach
• **Forecast revenue** and analyze your pipeline
• **Translate** business communications to Amharic

I'm powered by the latest AI models and deeply understand Ethiopian and African business contexts.

**What would you like help with today?**`,
      timestamp: new Date(),
      model: "WithUnion AI",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message ?? "I'm sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        model: data.model,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I apologize, but I encountered an error. Please check your connection and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        <div className="mb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">New Chat</span>
          </div>
        </div>

        <div className="space-y-1 mb-6">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">Quick Actions</p>
          {SUGGESTED_PROMPTS.slice(0, 3).map((prompt, i) => {
            const Icon = prompt.icon;
            return (
              <button
                key={i}
                onClick={() => sendMessage(prompt.text)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                <span className="truncate text-xs">{prompt.text}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">AI Models</span>
          </div>
          <div className="space-y-1.5">
            {["GPT-4o Mini", "Claude 3.5", "Gemini Pro"].map((model) => (
              <div key={model} className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">{model}</span>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                  model === "GPT-4o Mini" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                )}>
                  {model === "GPT-4o Mini" ? "Active" : "Soon"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts (shown when empty) */}
        {messages.length === 1 && !loading && (
          <div className="px-6 pb-4">
            <p className="text-xs font-medium text-slate-400 mb-3">Try asking:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt.text)}
                    className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm text-left transition-all group"
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">{prompt.category}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{prompt.text}</div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0 mt-1 group-hover:text-violet-500 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
          <div className="flex items-end gap-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 focus-within:border-violet-400 dark:focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your business... (Enter to send, Shift+Enter for new line)"
              className="flex-1 resize-none bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none max-h-30 leading-relaxed"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className={cn(
                "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all",
                input.trim() && !loading
                  ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-105 active:scale-95"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
              )}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-2">
            WithUnion AI can make mistakes. Always verify important business decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
