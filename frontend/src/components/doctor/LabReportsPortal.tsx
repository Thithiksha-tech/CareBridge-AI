import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FlaskConical,
  Activity,
  Plus,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useToast } from '../common/Toast';
import { healthService } from '../../services/api';
import type { LabReport, LabComparisonResult, BiomarkerDelta, BiomarkerItem } from '../../types';

interface LabReportsPortalProps {
  patientId?: number;
  patientName?: string;
}

export const LabReportsPortal: React.FC<LabReportsPortalProps> = ({
  patientId,
  patientName = 'Robert Davis'
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<number | undefined>(undefined);
  const [selectedTargetId, setSelectedTargetId] = useState<number | undefined>(undefined);
  const [comparison, setComparison] = useState<LabComparisonResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Lab Report Form State
  const [newReportName, setNewReportName] = useState('Week 2 Comprehensive Metabolic & Lipid Panel');
  const [newStageName, setNewStageName] = useState('Week 2 Follow-Up');
  const [newTestDate, setNewTestDate] = useState('2026-11-10');
  const [newLabName, setNewLabName] = useState('St. Jude Core Pathology Lab');
  const [newNotes, setNewNotes] = useState('Scheduled follow-up to verify LDL < 70 and stable renal function.');
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    fetchLabReports();
  }, [patientId]);

  const fetchLabReports = async () => {
    setLoading(true);
    try {
      const res = await healthService.getLabReports(patientId);
      if (res && res.reports && res.reports.length > 0) {
        setReports(res.reports);
        // Default: compare earliest baseline (Day 0) with latest report
        const base = res.reports[0].id;
        const target = res.reports[res.reports.length - 1].id;
        setSelectedBaseId(base);
        setSelectedTargetId(target);
        await runComparison(base, target);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lab Portal Notice',
        message: 'Could not load clinical lab reports.',
      });
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async (baseId?: number, targetId?: number) => {
    try {
      const res = await healthService.compareLabReports(baseId, targetId);
      if (res && res.comparison) {
        setComparison(res.comparison);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Comparison Error',
        message: 'Failed to compute biomarker progression comparison.',
      });
    }
  };

  const handleBaseChange = (id: number) => {
    setSelectedBaseId(id);
    runComparison(id, selectedTargetId);
  };

  const handleTargetChange = (id: number) => {
    setSelectedTargetId(id);
    runComparison(selectedBaseId, id);
  };

  const handleCreateLabReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const sampleBiomarkers: BiomarkerItem[] = [
        { name: 'High-Sensitivity Troponin I', category: 'Cardiac', value: 0.02, unit: 'ng/mL', ref_range: '< 0.04', status: 'normal', clinical_impact: 'Myocardial injury fully resolved' },
        { name: 'NT-proBNP', category: 'Cardiac', value: 180, unit: 'pg/mL', ref_range: '< 300', status: 'normal', clinical_impact: 'Ventricular wall tension normalized' },
        { name: 'hs-CRP (Inflammation)', category: 'Cardiac', value: 0.9, unit: 'mg/L', ref_range: '< 1.0', status: 'normal', clinical_impact: 'Vascular inflammatory response subdued' },
        { name: 'LDL Cholesterol', category: 'Lipid Panel', value: 62, unit: 'mg/dL', ref_range: '< 70', status: 'normal', clinical_impact: 'Optimal secondary prevention target met' },
        { name: 'Total Cholesterol', category: 'Lipid Panel', value: 135, unit: 'mg/dL', ref_range: '< 200', status: 'normal', clinical_impact: 'Desirable circulating lipid profile' },
        { name: 'Serum Creatinine', category: 'Renal & Metabolic', value: 0.95, unit: 'mg/dL', ref_range: '0.7 - 1.3', status: 'normal', clinical_impact: 'Normal renal clearance maintained' },
        { name: 'Fasting Blood Glucose', category: 'Renal & Metabolic', value: 92, unit: 'mg/dL', ref_range: '70 - 100', status: 'normal', clinical_impact: 'Euglycemia maintained' },
      ];

      await healthService.createLabReport({
        patient_id: patientId,
        report_name: newReportName,
        stage_name: newStageName,
        test_date: newTestDate,
        laboratory_name: newLabName,
        clinical_notes: newNotes,
        biomarkers: sampleBiomarkers
      });

      showToast({
        type: 'success',
        title: 'Lab Report Recorded',
        message: 'New clinical lab report and biomarker panel registered.',
      });

      setShowAddModal(false);
      fetchLabReports();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Record Failed',
        message: err.response?.data?.message || 'Could not record new lab report.',
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  const categories = ['All', 'Cardiac', 'Lipid Panel', 'Renal & Metabolic', 'Coagulation & Hematology'];

  const filteredDeltas = comparison?.biomarkerDeltas.filter((d) => {
    if (activeCategory === 'All') return true;
    return d.category === activeCategory;
  }) || [];

  return (
    <Card className="p-6 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0EEFF]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#373B8F]/10 text-[#373B8F] text-xs font-bold mb-1">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Clinical Pathology & Biomarker Portal</span>
          </div>
          <h3 className="text-xl font-extrabold text-[#24264A] flex items-center gap-2">
            Lab Reports Comparison & Trend Analysis
          </h3>
          <p className="text-xs text-[#73758E]">
            Compare multi-stage lab results side-by-side to track patient recovery progression from baseline.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowAddModal(true)}
            icon={<Plus className="w-4 h-4" />}
            className="bg-[#373B8F] hover:bg-[#2b2e70]"
          >
            + Log New Lab Report
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#73758E] text-xs space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#373B8F] border-t-transparent animate-spin mx-auto" />
          <p>Analyzing clinical biomarker datasets across recovery stages...</p>
        </div>
      ) : (
        <>
          {/* Stage Comparison Selector Ribbon */}
          <div className="p-4 rounded-2xl bg-[#F7F8FF] border border-[#ECEAFC] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-bold text-[#24264A] uppercase tracking-wider">
                Select Stages to Compare:
              </span>
              <span className="text-[11px] font-semibold text-[#373B8F] bg-[#F0EEFF] px-2.5 py-1 rounded-full">
                {reports.length} Clinical Lab Records Available for {patientName}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Baseline Stage Selector */}
              <div className="space-y-1 text-xs">
                <label className="block font-bold text-[#73758E]">
                  ① Baseline Stage (Earlier Stage):
                </label>
                <select
                  value={selectedBaseId}
                  onChange={(e) => handleBaseChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DCD6FC] text-xs font-bold text-[#24264A] focus:outline-none focus:border-[#373B8F]"
                >
                  {reports.map((r) => (
                    <option key={`base-${r.id}`} value={r.id}>
                      {r.stage_name} ({r.test_date}) — {r.report_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Follow-up / Target Stage Selector */}
              <div className="space-y-1 text-xs">
                <label className="block font-bold text-[#73758E]">
                  ② Target Stage (Subsequent / Current Stage):
                </label>
                <select
                  value={selectedTargetId}
                  onChange={(e) => handleTargetChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DCD6FC] text-xs font-bold text-[#24264A] focus:outline-none focus:border-[#373B8F]"
                >
                  {reports.map((r) => (
                    <option key={`target-${r.id}`} value={r.id}>
                      {r.stage_name} ({r.test_date}) — {r.report_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* AI Clinical Progression Summary Callout */}
          {comparison && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#F0EEFF] via-[#EBF7F2] to-white border border-[#C2E8D9] space-y-2 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#278567]" />
                  <strong className="text-xs font-extrabold uppercase tracking-wider text-[#278567]">
                    Clinical Progression Synthesis ({comparison.timeElapsedDays} Days Elapsed)
                  </strong>
                </div>
                <span className="text-[10px] font-bold text-[#278567] bg-[#278567]/10 px-2.5 py-0.5 rounded-full">
                  Recovery Trajectory: Favorable
                </span>
              </div>
              <p className="text-xs text-[#24264A] leading-relaxed font-medium">
                {comparison.clinicalProgressSummary}
              </p>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  activeCategory === cat
                    ? 'bg-[#373B8F] text-white shadow-xs'
                    : 'bg-[#F7F8FF] text-[#73758E] hover:text-[#24264A] border border-[#ECEAFC]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Biomarkers Comparison Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#ECEAFC]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F7F8FF] border-b border-[#ECEAFC] text-[#73758E] font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Biomarker & Ref Range</th>
                  <th className="py-3 px-3">
                    {comparison?.baseReport ? `${comparison.baseReport.stage_name} (${comparison.baseReport.test_date})` : 'Baseline'}
                  </th>
                  <th className="py-3 px-3">
                    {comparison?.targetReport ? `${comparison.targetReport.stage_name} (${comparison.targetReport.test_date})` : 'Current'}
                  </th>
                  <th className="py-3 px-3">Net Change (Delta)</th>
                  <th className="py-3 px-3">Trend & Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEFF]">
                {filteredDeltas.map((d, idx) => {
                  const isImproved = d.trend === 'improved';
                  const isWorsened = d.trend === 'worsened';

                  return (
                    <tr key={idx} className="hover:bg-[#FDFDFF] transition-colors">
                      <td className="py-3 px-3">
                        <strong className="text-xs font-bold text-[#24264A] block">{d.name}</strong>
                        <span className="text-[10px] text-[#73758E]">
                          {d.category} • Ref: {d.ref_range} {d.unit}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#24264A]">
                            {d.base_value} {d.unit}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                              d.base_status === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : d.base_status === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {d.base_status}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#24264A]">
                            {d.target_value} {d.unit}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                              d.target_status === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : d.target_status === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {d.target_status}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-mono font-bold">
                          {isImproved ? (
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                          ) : isWorsened ? (
                            <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                          ) : (
                            <Minus className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span
                            className={`${
                              isImproved
                                ? 'text-emerald-700'
                                : isWorsened
                                ? 'text-red-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {d.delta > 0 ? `+${d.delta}` : d.delta} {d.unit}
                          </span>
                          <span className="text-[10px] text-[#73758E]">
                            ({d.percent_change > 0 ? `+${d.percent_change}` : d.percent_change}%)
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                            isImproved
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isWorsened
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {d.clinical_interpretation}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal: Log New Lab Report */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#24264A]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-elevated border border-[#ECEAFC] animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EEFF]">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[#373B8F]" />
                <h3 className="text-base font-bold text-[#24264A]">Record New Clinical Lab Report</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#73758E] hover:text-[#24264A]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLabReport} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#24264A] mb-1">Report Title</label>
                <input
                  type="text"
                  required
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-bold text-[#24264A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Stage Description</label>
                  <input
                    type="text"
                    required
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="e.g. Week 2 Follow-Up"
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#24264A] mb-1">Test Date</label>
                  <input
                    type="date"
                    required
                    value={newTestDate}
                    onChange={(e) => setNewTestDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Laboratory Facility</label>
                <input
                  type="text"
                  value={newLabName}
                  onChange={(e) => setNewLabName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#24264A] mb-1">Clinical Impressions / Notes</label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs text-[#24264A]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#F0EEFF] border border-[#DCD6FC] text-[11px] text-[#373B8F]">
                ℹ️ Standard post-PCI biomarker battery (hs-Troponin, NT-proBNP, LDL, Creatinine, Platelets) will be automatically initialized and benchmarked against baseline.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EEFF]">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" loading={submittingReport} className="bg-[#373B8F]">
                  Save & Compare
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
};

export default LabReportsPortal;
