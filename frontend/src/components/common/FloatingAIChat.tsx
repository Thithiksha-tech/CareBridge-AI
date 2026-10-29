import React, { useState, useEffect, useRef } from 'react';
import {
  BotMessageSquare,
  X,
  Send,
  Sparkles,
  Maximize2,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { chatService } from '../../services/api';
import type { ChatMessage } from '../../types';
import { useNavigate } from 'react-router-dom';

export const FloatingAIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const promptChips = [
    'When should I take my morning tablets?',
    'What exercises are permitted today?',
    'What red flag symptoms require ER?',
    'Explain my low-sodium diet restrictions',
  ];

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadHistory = async () => {
    try {
      const data = await chatService.getHistory();
      if (data.history && data.history.length > 0) {
        setMessages(data.history);
      } else {
        setMessages([
          {
            id: 0,
            sender: 'assistant',
            message:
              "Hello! I'm your CareBridge AI Assistant powered by Gemini 3.8 Flash. I have reviewed your hospital discharge summary. Ask me anything about your medications, food timings, or exercises!",
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // fallback
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setInput('');
    const userMsg: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await chatService.sendMessage(text);
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        message: res.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        message:
          'I apologize, I encountered a connection issue while communicating with Gemini. Please verify your connection or try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await chatService.clearHistory();
      setMessages([
        {
          id: Date.now(),
          sender: 'assistant',
          message: 'Conversation cleared. How can I help you with your recovery instructions?',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      //
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-4 rounded-3xl bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] text-white shadow-floating hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 group border border-white/30"
          aria-label="Open AI Recovery Assistant"
        >
          <div className="relative">
            <BotMessageSquare className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#278567] border-2 border-white" />
          </div>
          <span className="text-sm font-bold tracking-tight pr-1 hidden sm:inline">
            Ask CareBridge AI
          </span>
        </button>
      )}

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[420px] h-[580px] bg-white rounded-3xl shadow-floating border border-[#ECEAFC] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#665BE8] to-[#373B8F] text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5 text-[#8C91F5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>CareBridge Clinical AI</span>
                  <span className="text-[10px] font-semibold bg-[#278567] text-white px-1.5 py-0.2 rounded">
                    Gemini 3.8
                  </span>
                </h3>
                <p className="text-[11px] text-white/80">Real-time Recovery Guidance</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('/ai-assistant')}
                title="Full Page Assistant"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClear}
                title="Clear Chat"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Disclaimer */}
          <div className="px-3.5 py-1.5 bg-[#F0EEFF] border-b border-[#DCD6FC] flex items-center gap-1.5 text-[11px] text-[#373B8F]">
            <ShieldAlert className="w-3.5 h-3.5 text-[#665BE8] shrink-0" />
            <span className="truncate">AI guidance is for recovery clarification. In emergencies, call 911.</span>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F7F8FF]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-[#665BE8] text-white rounded-br-none'
                      : 'bg-white text-[#24264A] border border-[#ECEAFC] rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.message}</p>
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      m.sender === 'user' ? 'text-white/70' : 'text-[#73758E]'
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#ECEAFC] rounded-2xl rounded-bl-none px-4 py-3 text-xs flex items-center gap-2 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#665BE8] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-[#8C91F5] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-[#373B8F] animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-[11px] text-[#73758E] font-medium">Gemini is reasoning...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="p-2 border-t border-[#ECEAFC] bg-white overflow-x-auto flex gap-1.5 scrollbar-none">
            {promptChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#F0EEFF] hover:bg-[#8C91F5]/20 text-[#373B8F] text-[10px] font-semibold transition-colors shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-[#ECEAFC] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about medications, foods, exercises..."
              className="flex-1 bg-[#F7F8FF] border border-[#DCD6FC] rounded-2xl px-3.5 py-2 text-xs text-[#24264A] placeholder:text-[#73758E] focus:outline-none focus:border-[#665BE8] transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-2xl bg-[#665BE8] hover:bg-[#584ddb] disabled:opacity-50 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
