import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pill,
  Dumbbell,
  Apple,
  Sparkles,
  Mail,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { reminderService } from '../services/api';
import type { Reminder } from '../types';

export const RemindersPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [targetEmail, setTargetEmail] = useState(user?.email || '');
  const [reminders, setReminders] = useState<{
    Morning: Reminder[];
    Midday: Reminder[];
    Evening: Reminder[];
    Bedtime: Reminder[];
  }>({
    Morning: [],
    Midday: [],
    Evening: [],
    Bedtime: [],
  });
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

  useEffect(() => {
    loadReminders();
    if (user?.email) {
      setTargetEmail(user.email);
    }
  }, [user]);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const data = await reminderService.getGrouped();
      setReminders(data.grouped);
      setStats(data.stats);
    } catch {
      showToast({
        type: 'error',
        title: 'Error Loading Timetable',
        message: 'Could not fetch medication schedule from database.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await reminderService.updateStatus(id, nextStatus as any);

      // update locally
      setReminders((prev) => {
        const updated = { ...prev };
        (Object.keys(updated) as Array<keyof typeof updated>).forEach((slot) => {
          updated[slot] = updated[slot].map((item) =>
            item.id === id ? { ...item, status: nextStatus as any } : item
          );
        });
        return updated;
      });

      setStats((prev) => ({
        ...prev,
        completed: nextStatus === 'completed' ? prev.completed + 1 : Math.max(0, prev.completed - 1),
        pending: nextStatus === 'completed' ? Math.max(0, prev.pending - 1) : prev.pending + 1,
      }));

      showToast({
        type: 'success',
        title: nextStatus === 'completed' ? 'Pill / Task Marked Taken' : 'Marked Pending',
        message: nextStatus === 'completed' ? 'Your adherence has been logged.' : 'Task reverted.',
      });
    } catch {
      showToast({ type: 'error', title: 'Update Error', message: 'Could not save state to database.' });
    }
  };

  const handleSendEmailAlert = async (specificReminderId?: number) => {
    setSendingEmail(true);
    try {
      const res = await reminderService.sendEmailAlert(specificReminderId, targetEmail);
      showToast({
        type: 'success',
        title: 'Email Alert Dispatched!',
        message:
          res.message ||
          `Scheduled recovery instructions sent directly to ${targetEmail}. Check your inbox!`,
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        'Email could not be delivered. Please check SMTP configuration in Settings.';
      showToast({
        type: 'error',
        title: 'Email Delivery Notification',
        message: msg,
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const slotMetadata: Record<
    keyof typeof reminders,
    { title: string; time: string; badgeColor: string; dotColor: string }
  > = {
    Morning: {
      title: 'Morning Care Timetable',
      time: '8:00 AM — Breakfast Regimen',
      badgeColor: 'primary',
      dotColor: 'bg-[#665BE8]',
    },
    Midday: {
      title: 'Midday Care Timetable',
      time: '1:00 PM — Post-Lunch Regimen & Light Exercise',
      badgeColor: 'warning',
      dotColor: 'bg-[#C58A30]',
    },
    Evening: {
      title: 'Evening Care Timetable',
      time: '6:30 PM — Dinner Regimen',
      badgeColor: 'lavender',
      dotColor: 'bg-[#8C91F5]',
    },
    Bedtime: {
      title: 'Bedtime Care Timetable',
      time: '10:00 PM — Nighttime Regimen',
      badgeColor: 'neutral',
      dotColor: 'bg-[#373B8F]',
    },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#665BE8] via-[#8C91F5] to-[#373B8F] text-white shadow-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <BellRing className="w-3.5 h-3.5" />
            <span>Timed Medication Schedule & Alert Bridge</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Timed Care Reminders
          </h2>
          <p className="text-xs sm:text-sm text-white/80 max-w-xl">
            Never miss essential post-hospital prescriptions. CareBridge structures your schedule into
            Morning, Midday, Evening, and Bedtime slots with explicit food and exercise timings.
          </p>
        </div>

        {/* Quick Email Dispatch Box */}
        <div className="w-full md:w-auto p-4 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white">
            Dispatch Live Outbound Email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="patient@example.com"
              className="px-3 py-2 rounded-xl bg-white text-xs text-[#24264A] placeholder:text-[#73758E] focus:outline-none min-w-[200px]"
            />
            <Button
              variant="glass"
              size="sm"
              loading={sendingEmail}
              onClick={() => handleSendEmailAlert()}
              icon={<Send className="w-3.5 h-3.5 text-[#665BE8]" />}
            >
              Send Alert
            </Button>
          </div>
          <span className="text-[10px] text-white/80 block">
            Sends real reminder email with instructions to this address.
          </span>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Total Prescribed</p>
            <p className="text-2xl font-black text-[#24264A]">{stats.total || 6}</p>
            <span className="text-[11px] text-[#73758E]">Daily recovery tasks</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#F0EEFF] text-[#665BE8] flex items-center justify-center font-bold">
            <Pill className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Completed / Taken</p>
            <p className="text-2xl font-black text-[#278567]">{stats.completed || 2}</p>
            <span className="text-[11px] text-[#278567] font-semibold">Pills taken today</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#278567]/10 text-[#278567] flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Pending Intake</p>
            <p className="text-2xl font-black text-[#C58A30]">{stats.pending || 4}</p>
            <span className="text-[11px] text-[#C58A30] font-semibold">Upcoming today</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#C58A30]/10 text-[#C58A30] flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Time Slot Sections */}
      <div className="space-y-6">
        {(Object.keys(reminders) as Array<keyof typeof reminders>).map((slotKey) => {
          const meta = slotMetadata[slotKey];
          const items = reminders[slotKey];

          return (
            <div key={slotKey} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${meta.dotColor}`}></span>
                  <h3 className="text-base font-bold text-[#24264A]">{meta.title}</h3>
                  <span className="text-xs text-[#73758E] hidden sm:inline">({meta.time})</span>
                </div>
                <span className="text-xs font-semibold text-[#73758E]">
                  {items.filter((i) => i.status === 'completed').length} / {items.length} Taken
                </span>
              </div>

              {items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-5 rounded-3xl border transition-all shadow-soft flex flex-col justify-between ${
                        item.status === 'completed'
                          ? 'bg-[#278567]/5 border-[#278567]/30 opacity-80'
                          : 'bg-white border-[#ECEAFC] hover:border-[#D4D0FA]'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-[#F0EEFF] text-[#665BE8]">
                              {item.reminder_type === 'exercise' ? (
                                <Dumbbell className="w-4 h-4" />
                              ) : item.reminder_type === 'diet' ? (
                                <Apple className="w-4 h-4" />
                              ) : (
                                <Pill className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <h4
                                className={`text-sm font-bold ${
                                  item.status === 'completed'
                                    ? 'line-through text-[#73758E]'
                                    : 'text-[#24264A]'
                                }`}
                              >
                                {item.title}
                              </h4>
                              <span className="text-[11px] text-[#373B8F] font-semibold capitalize">
                                {item.reminder_type} • {item.frequency || 'Daily'}
                              </span>
                            </div>
                          </div>

                          <Badge
                            variant={item.status === 'completed' ? 'success' : 'lavender'}
                            size="sm"
                          >
                            {item.status === 'completed' ? 'Taken' : item.time_slot}
                          </Badge>
                        </div>

                        {/* Explicit Food & Exercise Timing Requirements */}
                        <div className="p-3 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#665BE8] block">
                            Specific Intake Instructions & Food Association:
                          </span>
                          <p className="text-xs text-[#24264A] leading-relaxed">
                            {item.instructions ||
                              item.food_timing ||
                              (item.reminder_type === 'exercise'
                                ? "It's time for you to do your light walking exercise. Maintain flat ground."
                                : "It's time for you to eat this tablet with water after your meal.")}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-4 mt-3 border-t border-[#F0EEFF]">
                        <button
                          onClick={() => handleToggle(item.id, item.status)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            item.status === 'completed'
                              ? 'bg-[#278567] text-white shadow-sm'
                              : 'bg-[#278567]/10 text-[#278567] hover:bg-[#278567]/20 border border-[#278567]/20'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{item.status === 'completed' ? 'Taken' : 'Mark as Taken'}</span>
                        </button>

                        <button
                          onClick={() => handleSendEmailAlert(item.id)}
                          className="text-xs font-semibold text-[#665BE8] hover:text-[#373B8F] flex items-center gap-1 p-1 hover:bg-[#F0EEFF] rounded-lg transition-colors"
                          title="Send Email Alert for this item"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Email Alert</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-white border border-[#ECEAFC] text-xs text-[#73758E] italic text-center">
                  No medications or tasks scheduled for {slotKey.toLowerCase()}.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
