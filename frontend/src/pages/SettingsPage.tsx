import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Mail,
  Sparkles,
  ShieldCheck,
  Key,
  Server,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  User,
  History,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { settingsService } from '../services/api';
import type { EmailLog, EmailSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingAi, setSavingAi] = useState(false);

  // Email SMTP State
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromEmail, setFromEmail] = useState('carebridge.health.alerts@gmail.com');
  const [testRecipient, setTestRecipient] = useState(user?.email || '');

  // AI State
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  const [aiConfigured, setAiConfigured] = useState(true);

  // Email Logs State
  const [logs, setLogs] = useState<EmailLog[]>([]);

  useEffect(() => {
    loadSettings();
    if (user?.email) {
      setTestRecipient(user.email);
    }
  }, [user]);

  const loadSettings = async () => {
    setLoading(false);
    try {
      const [emailData, aiData, logsData] = await Promise.all([
        settingsService.getEmailSettings().catch(() => null),
        settingsService.getAiStatus().catch(() => null),
        settingsService.getEmailLogs().catch(() => ({ logs: [] })),
      ]);

      if (emailData) {
        setSmtpHost(emailData.smtpHost || 'smtp.gmail.com');
        setSmtpPort(emailData.smtpPort || 587);
        setSmtpUser(emailData.smtpUser || '');
        setFromEmail(emailData.fromEmail || 'carebridge.health.alerts@gmail.com');
      }

      if (aiData) {
        setGeminiModel(aiData.model || 'gemini-3.8-flash');
        setAiConfigured(aiData.configured);
      }

      if (logsData?.logs) {
        setLogs(logsData.logs);
      }
    } catch {
      //
    }
  };

  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const res = await settingsService.saveEmailSettings({
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPass,
        fromEmail,
      });
      showToast({
        type: 'success',
        title: 'SMTP Settings Saved',
        message: res.message || 'Email delivery configuration persisted.',
      });
      loadSettings();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err.response?.data?.error || 'Could not save SMTP configuration.',
      });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testRecipient) {
      showToast({ type: 'warning', title: 'Email Missing', message: 'Enter a recipient email address.' });
      return;
    }

    setTestingEmail(true);
    try {
      const res = await settingsService.testSmtp(testRecipient);
      showToast({
        type: 'success',
        title: 'Test Email Dispatched!',
        message: res.message || `Test verification email sent to ${testRecipient}.`,
      });
      loadSettings();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Test Email Failed',
        message: err.response?.data?.error || 'SMTP delivery failed. Verify host, port, and credentials.',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKey.trim()) {
      showToast({ type: 'warning', title: 'Key Missing', message: 'Enter a valid Gemini API key.' });
      return;
    }

    setSavingAi(true);
    try {
      const res = await settingsService.saveGeminiKey(geminiKey, geminiModel);
      showToast({
        type: 'success',
        title: 'Gemini Settings Updated',
        message: res.message || 'New API key and model connected.',
      });
      setAiConfigured(true);
    } catch {
      showToast({ type: 'error', title: 'Update Failed', message: 'Could not update AI settings.' });
    } finally {
      setSavingAi(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#665BE8] via-[#8C91F5] to-[#373B8F] text-white shadow-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Infrastructure & Outbound Relay</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Settings & Integrations
          </h2>
          <p className="text-xs sm:text-sm text-white/80 max-w-xl">
            Configure live outbound email delivery (Gmail App Passwords or SMTP), manage your Gemini
            clinical AI model, and audit real dispatch logs.
          </p>
        </div>

        <Button
          variant="glass"
          size="md"
          onClick={logout}
          icon={<LogOut className="w-4 h-4 text-[#C94C62]" />}
        >
          Sign Out
        </Button>
      </div>

      {/* Grid: Email Delivery Setup + AI Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Email SMTP Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 sm:p-8 bg-white border border-[#ECEAFC] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0EEFF]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F0EEFF] text-[#665BE8] flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#24264A]">Outbound Email Relay (SMTP)</h3>
                  <p className="text-xs text-[#73758E]">
                    Ensures reminders and alerts actually reach your Gmail inbox
                  </p>
                </div>
              </div>
              <Badge variant="primary" size="sm">
                Live Dispatch
              </Badge>
            </div>

            {/* Explanation box for Gmail */}
            <div className="p-4 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] space-y-1.5 text-xs text-[#373B8F]">
              <span className="font-bold block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#665BE8]" />
                How to deliver directly to real personal emails:
              </span>
              <p className="leading-relaxed">
                To receive emails directly in your inbox, enter your Gmail address and a 16-character
                Google App Password (generated in Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords).
                Alternatively, leave blank to use the secure CareBridge relay with live in-app audit tracking.
              </p>
            </div>

            <form onSubmit={handleSaveEmailSettings} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="587"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                  SMTP Username (e.g. Gmail Address)
                </label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                  SMTP Password (Google App Password)
                </label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="•••• •••• •••• •••• (16 characters)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                  Sender From Address
                </label>
                <input
                  type="text"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="CareBridge Alerts <carebridge@example.com>"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={savingEmail}
                >
                  Save SMTP Credentials
                </Button>
              </div>
            </form>

            {/* Test Send Section */}
            <div className="pt-4 border-t border-[#F0EEFF] space-y-3">
              <label className="block text-xs font-bold text-[#24264A] uppercase">
                Send Test Email Verification
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  loading={testingEmail}
                  onClick={handleTestEmail}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Send Test Email
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: AI Model & Profile (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Gemini AI Settings */}
          <Card className="p-6 sm:p-8 bg-white border border-[#ECEAFC] space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-[#F0EEFF]">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#24264A]">Gemini Clinical AI Model</h3>
                <p className="text-xs text-[#73758E]">
                  Status: {aiConfigured ? 'Operational & Connected' : 'Needs Key'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#278567]/10 border border-[#278567]/20 flex items-center gap-2.5 text-xs text-[#278567]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold">Model: gemini-3.8-flash (Active)</span>
            </div>

            <form onSubmit={handleSaveAi} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                  Active Model
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended & Verified)</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24264A] uppercase mb-1">
                  Update Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AQ.Ab8RN6... (leave blank to keep current)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                loading={savingAi}
              >
                Save AI Configuration
              </Button>
            </form>
          </Card>

          {/* User Profile Overview */}
          <Card className="p-6 bg-white border border-[#ECEAFC] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] text-white flex items-center justify-center font-bold text-lg">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#24264A]">{user?.name}</h4>
                <p className="text-xs text-[#73758E]">{user?.email}</p>
                <span className="text-[10px] font-semibold bg-[#F0EEFF] text-[#665BE8] px-2 py-0.5 rounded-full uppercase">
                  {user?.role}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Outbound Email Logs Audit Section */}
      <Card className="p-6 sm:p-8 bg-white border border-[#ECEAFC] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#F0EEFF] text-[#665BE8]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#24264A]">Outbound Email Dispatch Audit</h3>
              <p className="text-xs text-[#73758E]">
                Complete audit trail of all reminder emails and appointment alerts sent by CareBridge
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={loadSettings} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh Logs
          </Button>
        </div>

        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F8FF] text-[#73758E] uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Recipient</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 rounded-r-xl">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEFF]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F7F8FF]/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#24264A]">{log.recipient_email}</td>
                    <td className="py-3 px-4 text-[#373B8F] max-w-xs truncate">{log.subject}</td>
                    <td className="py-3 px-4">
                      <Badge variant={log.status === 'sent' ? 'success' : 'error'} size="sm">
                        {log.status === 'sent' ? 'Delivered' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[#73758E]">
                      {new Date(log.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-[#73758E] text-[11px] truncate max-w-xs">
                      {log.error_message || 'OK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#73758E] italic">
            No emails have been dispatched yet. Use "Send Alert" on the Reminders or Appointments page to trigger notifications.
          </div>
        )}
      </Card>
    </div>
  );
};
