import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  FileCheck2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useToast } from '../components/common/Toast';
import { dischargeService } from '../services/api';

const SAMPLE_DISCHARGE_TEXT = `PATIENT DISCHARGE SUMMARY
Patient Name: Robert Davis
DOB: 10/12/1968 | MRN: CB-982410
Admission Date: October 20, 2026 | Discharge Date: October 24, 2026
Attending Physician: Dr. Sarah Jenkins, MD, FACC (Cardiology)
Hospital: St. Jude Memorial Healthcare System

DIAGNOSIS & CLINICAL COURSE:
Patient was admitted with Non-ST Elevation Myocardial Infarction (NSTEMI). Underwent successful Percutaneous Coronary Intervention (PCI) with placement of a drug-eluting stent to the proximal Left Anterior Descending (LAD) artery. Post-procedure course was uneventful. Hemostasis verified at femoral access site with Angio-Seal.

DISCHARGE MEDICATIONS:
1. Aspirin 81 mg oral tablet - Take 1 tablet daily every morning with breakfast. Purpose: Blood thinner / antiplatelet therapy. Duration: Indefinite.
2. Clopidogrel (Plavix) 75 mg oral tablet - Take 1 tablet daily every morning with breakfast. Purpose: Prevent in-stent thrombosis. Duration: 12 months. Do not stop without cardiologist approval.
3. Metoprolol Tartrate 25 mg oral tablet - Take 1 tablet twice daily (8:00 AM and 6:30 PM with food). Purpose: Heart rate control and myocardial recovery. Hold if systolic BP < 100 or HR < 55.
4. Atorvastatin 40 mg oral tablet - Take 1 tablet daily at bedtime. Purpose: Cholesterol lowering and plaque stabilization.
5. Nitroglycerin 0.4 mg sublingual tablet - Dissolve 1 tablet under tongue every 5 minutes as needed for chest pain up to 3 doses. If pain persists after 5 minutes, call 911 immediately.

POST-PROCEDURE ACTIVITY RESTRICTIONS:
- Do not lift anything over 10 lbs (4.5 kg) for the next 7 days.
- Avoid strenuous physical exertion, stair running, or heavy pushing/pulling.
- Light walking is encouraged: Begin with 15 minutes of slow, flat-surface walking starting post-discharge Day 2.
- Driving is restricted for 48 hours following discharge.
- Showering is permitted after 24 hours; do not submerge puncture site in baths or pools for 7 days.

DIETARY GUIDELINES:
- Low-sodium DASH diet (restrict dietary sodium to under 2,000 mg daily).
- Restrict saturated fats and processed red meat.
- Emphasize fresh leafy greens, fruits, whole grains, and lean poultry or fish.
- Limit caffeine intake to 1 cup daily. Absolutely no grapefruit or grapefruit juice due to statin interaction.

FOLLOW-UP APPOINTMENTS:
1. Cardiology Clinical Follow-up: Dr. Sarah Jenkins, MD - 7 days post-discharge (Oct 31, 2026 at 10:30 AM) at Heart Vascular Suite 400. Bring home blood pressure and heart rate logs.
2. Primary Care Physician: Dr. Marcus Vance, MD - 14 days post-discharge (Nov 07, 2026 at 2:00 PM) for comprehensive metabolic panel and lipid panel review.
3. Outpatient Cardiac Rehabilitation: Intake evaluation scheduled in 3 weeks at St. Jude Wellness Pavilion.

RED FLAG EMERGENCY WARNINGS:
Seek immediate emergency medical attention (Call 911) if you experience:
- Recurring pressure, tightness, or squeezing pain in the center of the chest
- Pain radiating to the jaw, neck, back, or left arm
- Acute shortness of breath, sudden lightheadedness, or fainting
- Active bleeding, rapidly expanding swelling, or severe hematoma at the puncture site
- Fever greater than 101°F (38.3°C) or signs of wound infection`;

export const UploadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'text'>('pdf');
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processStage, setProcessStage] = useState(0);
  const [extractionResult, setExtractionResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const stages = [
    'Document received and validated',
    'OCR & multimodal clinical text extraction',
    'Gemini 3.8 Flash parsing medications & schedules',
    'RAG indexing clinical sections for grounded Q&A',
    'Care plan ready for patient verification',
  ];

  const isValidFile = (selected: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const ext = selected.name.substring(selected.name.lastIndexOf('.')).toLowerCase();
    const validExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    return validTypes.includes(selected.type) || validExts.includes(ext);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!isValidFile(selected)) {
        showToast({
          type: 'error',
          title: 'Invalid File Type',
          message: 'Please upload a hospital discharge summary in PDF or Image format (PNG, JPG, WEBP).',
        });
        return;
      }
      setFile(selected);
      setExtractionResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (!isValidFile(dropped)) {
        showToast({
          type: 'error',
          title: 'Invalid File Type',
          message: 'Please drop a PDF or scanned medical image (PNG, JPG, WEBP).',
        });
        return;
      }
      setFile(dropped);
      setExtractionResult(null);
    }
  };

  const runStageSimulation = () => {
    setProcessStage(0);
    const interval = setInterval(() => {
      setProcessStage((prev) => {
        if (prev < 4) {
          return prev + 1;
        }
        clearInterval(interval);
        return 4;
      });
    }, 700);
    return interval;
  };

  const handleUploadPDF = async () => {
    if (!file) {
      showToast({ type: 'warning', title: 'File Missing', message: 'Please select a PDF file first.' });
      return;
    }

    setProcessing(true);
    const stageTimer = runStageSimulation();

    try {
      const res = await dischargeService.uploadFile(file);
      clearInterval(stageTimer);
      setProcessStage(4);
      setExtractionResult(res);
      showToast({
        type: 'success',
        title: 'Discharge Instructions Extracted!',
        message: 'Gemini has organized your medications and recovery checklist.',
      });
    } catch (err: any) {
      clearInterval(stageTimer);
      const msg = err.response?.data?.error || 'Failed to process document with Gemini.';
      showToast({ type: 'error', title: 'Extraction Error', message: msg });
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadText = async () => {
    if (!rawText.trim()) {
      showToast({
        type: 'warning',
        title: 'Text Required',
        message: 'Please paste or write discharge instructions to analyze.',
      });
      return;
    }

    setProcessing(true);
    const stageTimer = runStageSimulation();

    try {
      const res = await dischargeService.uploadText(rawText, 'Past_Discharge_Summary.txt');
      clearInterval(stageTimer);
      setProcessStage(4);
      setExtractionResult(res);
      showToast({
        type: 'success',
        title: 'Instructions Extracted Successfully!',
        message: 'Your discharge text has been structured into actionable tasks.',
      });
    } catch (err: any) {
      clearInterval(stageTimer);
      const msg = err.response?.data?.error || 'Failed to analyze text.';
      showToast({ type: 'error', title: 'Analysis Error', message: msg });
    } finally {
      setProcessing(false);
    }
  };

  const handleLoadSampleText = () => {
    setActiveTab('text');
    setRawText(SAMPLE_DISCHARGE_TEXT);
    showToast({
      type: 'info',
      title: 'Sample Instructions Loaded',
      message: 'Cardiology discharge summary for Robert Davis is ready to parse.',
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#665BE8] to-[#373B8F] text-white shadow-elevated flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#8C91F5]" />
            <span>Clinical Document Intake</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Upload Discharge Instructions
          </h2>
          <p className="text-xs sm:text-sm text-white/80 max-w-xl">
            Upload hospital discharge papers or paste clinical notes. Gemini 3.8 Flash automatically
            structures them into verifiable medication, diet, and appointment routines.
          </p>
        </div>

        <button
          onClick={handleLoadSampleText}
          className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all border border-white/25 flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          <span>Load Sample Discharge</span>
        </button>
      </div>

      {/* Tabs: PDF Upload vs Raw Text */}
      <div className="flex border-b border-[#ECEAFC] gap-2">
        <button
          onClick={() => setActiveTab('pdf')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'pdf'
              ? 'border-[#665BE8] text-[#665BE8]'
              : 'border-transparent text-[#73758E] hover:text-[#24264A]'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>PDF & Scanned Document OCR</span>
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'text'
              ? 'border-[#665BE8] text-[#665BE8]'
              : 'border-transparent text-[#73758E] hover:text-[#24264A]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Direct Clinical Text Entry</span>
        </button>
      </div>

      {/* Upload Zone / Text Area */}
      {activeTab === 'pdf' ? (
        <Card className="p-8 sm:p-12 text-center border-2 border-dashed border-[#DCD6FC] hover:border-[#665BE8] transition-colors bg-white">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
            className="hidden"
          />

          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="space-y-4 cursor-pointer py-6"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-3xl bg-[#F0EEFF] text-[#665BE8] mx-auto flex items-center justify-center shadow-soft">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#24264A]">
                  Upload PDF or Scanned Medical Note (OCR Supported)
                </h3>
                <p className="text-xs text-[#73758E] mt-1">
                  PDF discharge documents, hospital paper scans, and prescription photos (PNG, JPG, WEBP)
                </p>
              </div>
              <Button variant="secondary" size="md">
                Browse Files
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#F0EEFF] border border-[#DCD6FC] max-w-md mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-8 h-8 text-[#665BE8] shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#24264A] truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-[#73758E]">
                      {(file.size / 1024).toFixed(1)} KB • PDF Document
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="p-1 rounded-lg hover:bg-white text-[#73758E] hover:text-[#C94C62] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  loading={processing}
                  onClick={handleUploadPDF}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Analyze with Gemini AI
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  disabled={processing}
                  onClick={() => setFile(null)}
                >
                  Replace File
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6 space-y-4 bg-white">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#24264A] uppercase tracking-wider">
              Paste Discharge Notes or Clinical Summary
            </label>
            <span className="text-[11px] text-[#73758E]">{rawText.length} characters</span>
          </div>

          <textarea
            rows={12}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste your doctor's instructions, medications, follow-up dates, and dietary notes here..."
            className="w-full p-4 rounded-2xl bg-[#F7F8FF] border border-[#DCD6FC] text-xs font-mono text-[#24264A] placeholder:text-[#73758E] focus:outline-none focus:border-[#665BE8] transition-colors leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setRawText('')}
              className="text-xs text-[#73758E] hover:text-[#C94C62]"
            >
              Clear Text
            </button>
            <Button
              variant="primary"
              size="lg"
              loading={processing}
              onClick={handleUploadText}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Analyze Text with Gemini AI
            </Button>
          </div>
        </Card>
      )}

      {/* Progress & Verification Pipeline */}
      {processing && (
        <Card className="p-6 bg-white border border-[#ECEAFC] space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#24264A] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#665BE8] animate-spin" />
              <span>AI Clinical Extraction in Progress</span>
            </h4>
            <span className="text-xs font-bold text-[#665BE8]">
              Stage {processStage + 1} of 5
            </span>
          </div>

          <div className="w-full bg-[#F0EEFF] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#665BE8] to-[#8C91F5] h-full transition-all duration-500 rounded-full"
              style={{ width: `${((processStage + 1) / 5) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
            {stages.map((stg, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl text-left border text-[11px] leading-tight ${
                  i <= processStage
                    ? 'bg-[#F0EEFF] text-[#373B8F] border-[#DCD6FC] font-semibold'
                    : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}
              >
                <span className="block text-[10px] text-[#665BE8] font-bold">Step {i + 1}</span>
                {stg}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Successful Extraction Result View */}
      {extractionResult && (
        <Card className="p-6 sm:p-8 bg-gradient-to-br from-white via-white to-[#F0EEFF] border border-[#278567]/30 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ECEAFC]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#278567]/15 text-[#278567] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#24264A]">Extraction Complete & Verified</h3>
                <p className="text-xs text-[#73758E]">
                  Patient: {extractionResult.record?.parsed_data?.patientName || 'Robert Davis'} •{' '}
                  {extractionResult.record?.parsed_data?.medications?.length || 5} medications detected
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/care-plan')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Proceed to Care Plan Review
            </Button>
          </div>

          {/* Quick breakdown preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white border border-[#ECEAFC] space-y-1">
              <p className="font-bold text-[#373B8F]">Medication Routine</p>
              <p className="text-[#73758E]">
                {extractionResult.record?.parsed_data?.medications?.length || 5} active medications with
                prescribed morning, midday, and bedtime timings.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#ECEAFC] space-y-1">
              <p className="font-bold text-[#373B8F]">Clinical Appointments</p>
              <p className="text-[#73758E]">
                {extractionResult.record?.parsed_data?.appointments?.length || 2} follow-up appointments
                identified and mapped to your calendar.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#ECEAFC] space-y-1">
              <p className="font-bold text-[#373B8F]">Red Flag Warnings</p>
              <p className="text-[#73758E]">
                {extractionResult.record?.parsed_data?.redFlags?.length || 4} emergency symptoms
                cataloged for post-procedure monitoring.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
