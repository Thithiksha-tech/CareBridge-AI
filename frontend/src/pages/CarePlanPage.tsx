import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  Flag,
  Clock,
  Sparkles,
  AlertTriangle,
  Pill,
  HeartPulse,
  Apple,
  Dumbbell,
  CalendarCheck,
  Save,
  Filter,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useToast } from '../components/common/Toast';
import { dischargeService } from '../services/api';
import type { InstructionItem, DischargeRecord } from '../types';

export const CarePlanPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<DischargeRecord | null>(null);
  const [dischargeId, setDischargeId] = useState<number | null>(null);
  const [instructions, setInstructions] = useState<InstructionItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editText, setEditText] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    loadCarePlan();
  }, []);

  const loadCarePlan = async () => {
    setLoading(true);
    try {
      const data = await dischargeService.getLatest();
      if (data.record) {
        setRecord(data.record);
        setDischargeId(data.record.id);
      }

      if (data.review?.instructions && data.review.instructions.length > 0) {
        setInstructions(data.review.instructions);
      } else if (data.record?.parsed_data) {
        // synthesize initial instruction items from parsed data
        const items: InstructionItem[] = [];
        const p = data.record.parsed_data;

        (p.medications || []).forEach((m, idx) => {
          items.push({
            id: `med-${idx}`,
            category: 'medication',
            original_text: `${m.name} ${m.dose || ''} - ${m.frequency || ''}. ${m.instructions || ''}`,
            simplified_text: `Take ${m.name} (${m.dose || ''}) ${m.timing || m.frequency || 'as instructed'}. Purpose: ${m.purpose || 'Prescribed therapy'}.`,
            status: 'pending',
            timing: m.timing || 'Morning with meal',
          });
        });

        (p.diet || []).forEach((d, idx) => {
          items.push({
            id: `diet-${idx}`,
            category: 'diet',
            original_text: d,
            simplified_text: d,
            status: 'confirmed',
          });
        });

        (p.exercises || []).forEach((ex, idx) => {
          items.push({
            id: `ex-${idx}`,
            category: 'exercise',
            original_text: ex,
            simplified_text: ex,
            status: 'pending',
          });
        });

        (p.appointments || []).forEach((ap, idx) => {
          items.push({
            id: `appt-${idx}`,
            category: 'appointment',
            original_text: `${ap.specialty}: ${ap.doctor || ''} - ${ap.timing}. ${ap.notes || ''}`,
            simplified_text: `Follow-up visit with ${ap.doctor || ap.specialty} scheduled for ${ap.timing}.`,
            status: 'confirmed',
          });
        });

        (p.redFlags || []).forEach((rf, idx) => {
          items.push({
            id: `warn-${idx}`,
            category: 'warning',
            original_text: rf,
            simplified_text: `Emergency Warning: ${rf}`,
            status: 'confirmed',
          });
        });

        setInstructions(items);
      }
    } catch {
      showToast({
        type: 'error',
        title: 'Care Plan Load Error',
        message: 'Could not retrieve instructions from database.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (id: string | number, newStatus: 'confirmed' | 'pending' | 'flagged') => {
    setInstructions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const handleStartEdit = (item: InstructionItem) => {
    setEditingId(item.id);
    setEditText(item.simplified_text);
  };

  const handleSaveEdit = (id: string | number) => {
    setInstructions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, simplified_text: editText } : item))
    );
    setEditingId(null);
    showToast({
      type: 'info',
      title: 'Item Updated',
      message: 'Instruction wording updated. Click Save All Changes to persist to database.',
    });
  };

  const handleSaveAll = async () => {
    if (!dischargeId) {
      showToast({ type: 'warning', title: 'No Record', message: 'No discharge record associated.' });
      return;
    }

    setSaving(true);
    try {
      await dischargeService.updateInstructions(dischargeId, instructions, 'completed');
      showToast({
        type: 'success',
        title: 'Care Plan Persisted!',
        message: 'All confirmations, flags, and edits saved to CareBridge database.',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not persist updates to server.',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmedCount = instructions.filter((i) => i.status === 'confirmed').length;
  const flaggedCount = instructions.filter((i) => i.status === 'flagged').length;
  const pendingCount = instructions.filter((i) => i.status === 'pending').length;
  const totalCount = instructions.length || 1;
  const adherencePct = Math.round((confirmedCount / totalCount) * 100);

  const filteredInstructions =
    categoryFilter === 'all'
      ? instructions
      : instructions.filter((i) => i.category === categoryFilter);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medication':
        return <Pill className="w-4 h-4 text-[#665BE8]" />;
      case 'diet':
        return <Apple className="w-4 h-4 text-[#278567]" />;
      case 'exercise':
        return <Dumbbell className="w-4 h-4 text-[#8C91F5]" />;
      case 'appointment':
        return <CalendarCheck className="w-4 h-4 text-[#373B8F]" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#C94C62]" />;
      default:
        return <HeartPulse className="w-4 h-4 text-[#73758E]" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#665BE8] via-[#8C91F5] to-[#373B8F] text-white p-6 sm:p-8 shadow-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dual-Source Clinical Verification</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Review & Confirm Care Plan
          </h2>
          <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed">
            Side-by-side original physician discharge excerpts and AI simplified patient instructions.
            Verify each item to activate automatic pill and recovery notifications.
          </p>
        </div>

        <Button
          variant="glass"
          size="lg"
          onClick={handleSaveAll}
          loading={saving}
          icon={<Save className="w-4 h-4 text-[#665BE8]" />}
          className="shadow-elevated"
        >
          Save All Confirmations
        </Button>
      </div>

      {/* Progress & Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Plan Verified</p>
            <p className="text-2xl font-black text-[#665BE8]">{adherencePct}%</p>
            <span className="text-[11px] text-[#73758E]">Overall progress</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#F0EEFF] text-[#665BE8] flex items-center justify-center font-bold">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Confirmed</p>
            <p className="text-2xl font-black text-[#278567]">{confirmedCount}</p>
            <span className="text-[11px] text-[#278567] font-semibold">Active in timetable</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#278567]/10 text-[#278567] flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Awaiting Review</p>
            <p className="text-2xl font-black text-[#C58A30]">{pendingCount}</p>
            <span className="text-[11px] text-[#C58A30] font-semibold">Needs checkoff</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#C58A30]/10 text-[#C58A30] flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#73758E] uppercase tracking-wider">Flagged Items</p>
            <p className="text-2xl font-black text-[#C94C62]">{flaggedCount}</p>
            <span className="text-[11px] text-[#C94C62] font-semibold">Doctor clarification</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#C94C62]/10 text-[#C94C62] flex items-center justify-center">
            <Flag className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="text-xs font-bold text-[#73758E] mr-2 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          Category Filter:
        </span>
        {[
          { id: 'all', label: 'All Instructions' },
          { id: 'medication', label: 'Medications' },
          { id: 'diet', label: 'Diet & Nutrition' },
          { id: 'exercise', label: 'Exercise & Walking' },
          { id: 'appointment', label: 'Appointments' },
          { id: 'warning', label: 'Red Flags' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setCategoryFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              categoryFilter === f.id
                ? 'bg-[#665BE8] text-white shadow-soft'
                : 'bg-white text-[#73758E] hover:bg-[#F0EEFF] border border-[#ECEAFC]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Instructions List (Side-by-Side Excerpt vs Plain Language) */}
      <div className="space-y-4">
        {filteredInstructions.map((item) => (
          <div
            key={item.id}
            className={`p-6 rounded-3xl bg-white border transition-all shadow-soft ${
              item.status === 'confirmed'
                ? 'border-[#278567]/30 hover:border-[#278567]'
                : item.status === 'flagged'
                ? 'border-[#C94C62]/30 hover:border-[#C94C62]'
                : 'border-[#ECEAFC] hover:border-[#D4D0FA]'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#F0EEFF]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#F0EEFF]">
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#373B8F] capitalize">
                    {item.category}
                  </span>
                  {item.timing && (
                    <span className="ml-2 text-[11px] text-[#73758E]">• Scheduled: {item.timing}</span>
                  )}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStatusChange(item.id, 'confirmed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    item.status === 'confirmed'
                      ? 'bg-[#278567] text-white shadow-sm'
                      : 'bg-[#278567]/10 text-[#278567] hover:bg-[#278567]/20 border border-[#278567]/20'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Routine</span>
                </button>

                <button
                  onClick={() => handleStatusChange(item.id, 'flagged')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    item.status === 'flagged'
                      ? 'bg-[#C94C62] text-white shadow-sm'
                      : 'bg-[#C94C62]/10 text-[#C94C62] hover:bg-[#C94C62]/20 border border-[#C94C62]/20'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Flag for Doctor</span>
                </button>
              </div>
            </div>

            {/* Side-by-Side Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Left: Original Excerpt */}
              <div className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#73758E]">
                  Original Discharge Excerpt (Clinician Source)
                </span>
                <p className="text-xs text-[#24264A] font-mono leading-relaxed">
                  {item.original_text}
                </p>
              </div>

              {/* Right: Plain-Language Patient Explanation */}
              <div className="p-4 rounded-2xl bg-[#F0EEFF]/50 border border-[#DCD6FC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#665BE8] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Plain-Language Explanation
                  </span>
                  {editingId !== item.id && (
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="text-[10px] font-semibold text-[#373B8F] hover:underline"
                    >
                      Edit Wording
                    </button>
                  )}
                </div>

                {editingId === item.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full p-2.5 rounded-xl bg-white border border-[#665BE8] text-xs text-[#24264A] focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => handleSaveEdit(item.id)}>
                        Apply
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#24264A] leading-relaxed font-medium">
                    {item.simplified_text}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
