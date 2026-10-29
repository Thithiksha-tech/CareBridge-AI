import React, { useState, useEffect, useRef } from 'react';
import {
  BotMessageSquare,
  Sparkles,
  Send,
  Trash2,
  ShieldAlert,
  FileText,
  Pill,
  HeartPulse,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useToast } from '../components/common/Toast';
import { chatService, dischargeService } from '../services/api';
import type { ChatMessage, DischargeRecord } from '../types';

export const AIChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<DischargeRecord | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const clinicalPrompts = [
    {
      title: 'Missed Medication Rule',
      query: 'What should I do if I miss my morning dose of Metoprolol or Clopidogrel?',
    },
    {
      title: 'Dietary Interactions',
      query: 'Why is grapefruit strictly prohibited with Atorvastatin? Explain in simple terms.',
    },
    {
      title: 'Physical Activity Safety',
      query: 'Can I carry groceries or walk up stairs during my first week home?',
    },
    {
      title: 'Chest Pain Protocol',
      query: 'How should I take sublingual Nitroglycerin if chest discomfort begins?',
    },
  ];

  useEffect(() => {
    loadChat();
    loadDischargeContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadDischargeContext = async () => {
    try {
      const data = await dischargeService.getLatest();
      if (data.record) {
        setRecord(data.record);
      }
    } catch {
      //
    }
  };

  const loadChat = async () => {
    try {
      const data = await chatService.getHistory();
      if (data.history && data.history.length > 0) {
        setMessages(data.history);
      } else {
        setMessages([
          {
            id: 1,
            sender: 'assistant',
            message:
              "Hello! I am your CareBridge AI Clinical Recovery Assistant, powered by Google's Gemini 3.8 Flash model. I have analyzed your discharge records and am ready to clarify any medications, timings, food guidelines, or activity restrictions.",
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      //
    }
  };

  const handleSend = async (customText?: string) => {
    const text = (customText || input).trim();
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
      showToast({
        type: 'error',
        title: 'Gemini AI Offline',
        message: 'Could not connect to Gemini API. Check API Key in Settings.',
      });
      const fallbackMsg: ChatMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        message:
          'I was unable to complete this query with Gemini. Please verify your internet connection or check the Gemini API key in Settings.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
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
          message: 'Chat history cleared. How can I assist you with your recovery instructions?',
          created_at: new Date().toISOString(),
        },
      ]);
      showToast({ type: 'info', title: 'Conversation Reset', message: 'Chat memory refreshed.' });
    } catch {
      //
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#665BE8] via-[#8C91F5] to-[#373B8F] text-white shadow-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-Time Clinical Reasoning • Gemini 3.8 Flash</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            AI Clinical Assistant
          </h2>
          <p className="text-xs sm:text-sm text-white/80 max-w-xl">
            Ask any questions regarding your post-hospital recovery, medication timing, or dietary
            precautions. Responses are synthesized directly from your verified hospital discharge summary.
          </p>
        </div>

        <Button
          variant="glass"
          size="md"
          onClick={handleClear}
          icon={<Trash2 className="w-4 h-4 text-[#C94C62]" />}
        >
          Reset Session
        </Button>
      </div>

      {/* Main Layout: Chat Window + Context Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        {/* Chat Workspace (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white rounded-3xl shadow-soft border border-[#ECEAFC] overflow-hidden">
          {/* Chat Header Bar */}
          <div className="px-6 py-4 border-b border-[#F0EEFF] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] text-white flex items-center justify-center font-bold">
                <BotMessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#24264A] flex items-center gap-2">
                  <span>CareBridge Clinical AI</span>
                  <span className="text-[10px] bg-[#278567]/15 text-[#278567] font-bold px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </h3>
                <p className="text-[11px] text-[#73758E]">
                  Context: {record?.parsed_data?.patientName || 'Robert Davis'} • Discharge ID #{record?.id || 1}
                </p>
              </div>
            </div>

            <div className="text-xs text-[#73758E] flex items-center gap-1.5 hidden sm:flex">
              <ShieldAlert className="w-4 h-4 text-[#665BE8]" />
              <span>Safety Protocol Active</span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F7F8FF]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-3xl p-5 text-xs sm:text-sm leading-relaxed shadow-soft ${
                    m.sender === 'user'
                      ? 'bg-[#665BE8] text-white rounded-br-none'
                      : 'bg-white text-[#24264A] border border-[#ECEAFC] rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.message}</p>
                  <span
                    className={`block text-[10px] mt-2 text-right ${
                      m.sender === 'user' ? 'text-white/70' : 'text-[#73758E]'
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#ECEAFC] rounded-3xl rounded-bl-none p-5 text-sm flex items-center gap-3 shadow-soft">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#665BE8] animate-bounce" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8C91F5] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#373B8F] animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span className="text-xs text-[#73758E] font-medium">
                    Gemini 3.8 Flash is analyzing medical discharge context...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="p-3 bg-white border-t border-[#ECEAFC] flex gap-2 overflow-x-auto scrollbar-none">
            {clinicalPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.query)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#F0EEFF] hover:bg-[#8C91F5]/20 text-[#373B8F] text-xs font-semibold transition-colors shrink-0"
              >
                {p.title}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 bg-white border-t border-[#ECEAFC] flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your medications, exercises, diet, or appointments..."
              className="flex-1 bg-[#F7F8FF] border border-[#DCD6FC] rounded-2xl px-4 py-3 text-sm text-[#24264A] placeholder:text-[#73758E] focus:outline-none focus:border-[#665BE8] transition-colors"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              variant="primary"
              size="md"
              icon={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </form>
        </div>

        {/* Right Sidebar: Active Patient Medical Context (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-6 bg-white border border-[#ECEAFC] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#373B8F]">
              <FileText className="w-4 h-4 text-[#665BE8]" />
              <span>Loaded Clinical Context</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#73758E]">Patient:</span>
                <span className="font-bold text-[#24264A]">
                  {record?.parsed_data?.patientName || 'Robert Davis'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#73758E]">Discharge Date:</span>
                <span className="font-bold text-[#24264A]">
                  {record?.parsed_data?.dischargeDate || 'Oct 24, 2026'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#73758E]">Diagnosis:</span>
                <span className="font-bold text-[#24264A] truncate max-w-[150px]">
                  {record?.parsed_data?.admissionReason || 'NSTEMI, Post-PCI'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-[#73758E] block">
                Active Medications In Memory:
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(record?.parsed_data?.medications || [
                  { name: 'Aspirin', dose: '81mg', timing: 'Morning' },
                  { name: 'Clopidogrel', dose: '75mg', timing: 'Morning' },
                  { name: 'Metoprolol', dose: '25mg', timing: 'Twice daily' },
                  { name: 'Atorvastatin', dose: '40mg', timing: 'Bedtime' },
                ]).map((m, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-[#F0EEFF] text-[11px] flex items-center justify-between font-medium text-[#373B8F]"
                  >
                    <span className="font-bold">{m.name} {m.dose}</span>
                    <span className="text-[10px] text-[#665BE8]">{m.timing}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#278567]/10 border border-[#278567]/20 text-[11px] text-[#278567] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Gemini answers are grounded in this patient record to avoid generic or contradictory advice.
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
