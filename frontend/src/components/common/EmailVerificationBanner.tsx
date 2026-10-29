import React, { useState } from 'react';
import { ShieldCheck, Mail, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from './Toast';
import { authService } from '../../services/api';
import { Button } from './Button';

export const EmailVerificationBanner: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);

  React.useEffect(() => {
    if (user && !user.isEmailVerified) {
      authService.getOtpStatus()
        .then((res) => {
          if (res.hasPendingOtp && res.otpPreview) {
            setPreviewOtp(res.otpPreview);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  if (!user || user.isEmailVerified) {
    return null;
  }

  const handleSendOtp = async () => {
    setSending(true);
    try {
      const res = await authService.sendOtp(user.email, user.name);
      if (res.otpPreview) {
        setPreviewOtp(res.otpPreview);
      }
      showToast({
        type: 'success',
        title: 'Verification Code Dispatched',
        message: res.message || `A 6-digit OTP code has been sent to ${user.email}.`,
      });
      setIsOpen(true);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Dispatch Failed',
        message: err.response?.data?.message || 'Could not send verification OTP. Check network connection.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      showToast({ type: 'warning', title: 'Invalid Code', message: 'Please enter the 6-digit code.' });
      return;
    }

    setVerifying(true);
    try {
      const res = await authService.verifyOtp(user.email, otpCode.trim());
      updateUser({ isEmailVerified: true });
      showToast({
        type: 'success',
        title: 'Email Verified Successfully!',
        message: res.message || 'Automated medication and care alerts are now active.',
      });
      setIsOpen(false);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.response?.data?.message || 'Invalid or expired OTP code.',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-[#F0EEFF] to-[#EAE6FE] border border-[#DCD6FC] p-4 text-[#24264A] shadow-soft mb-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#665BE8] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#24264A]">Verify Email for Automatic Care Alerts</h4>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#C58A30]/15 text-[#C58A30] border border-[#C58A30]/20">
                Action Required
              </span>
            </div>
            <p className="text-xs text-[#73758E] mt-0.5">
              Verify <strong>{user.email}</strong> via 6-digit OTP to activate timely medication and appointment reminders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Button
            size="sm"
            variant="primary"
            onClick={handleSendOtp}
            loading={sending}
            icon={<KeyRound className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto"
          >
            {isOpen ? 'Resend OTP' : 'Verify with OTP'}
          </Button>
        </div>
      </div>

      {/* OTP Input Form Drawer / Expandable */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-[#DCD6FC] max-w-md animate-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#24264A] uppercase tracking-wider">
                Enter 6-Digit OTP Code
              </label>
              {previewOtp && (
                <button
                  type="button"
                  onClick={() => setOtpCode(previewOtp)}
                  className="text-[11px] font-bold text-[#665BE8] hover:underline flex items-center gap-1"
                >
                  ⚡ Auto-fill Code ({previewOtp})
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[#DCD6FC] text-center tracking-widest text-lg font-mono font-bold text-[#24264A] focus:outline-none focus:border-[#665BE8]"
                autoFocus
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={verifying}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm
              </Button>
            </div>
            <p className="text-[11px] text-[#73758E]">
              A verification code was dispatched to <strong>{user.email}</strong>. It expires in 10 minutes.
            </p>
          </form>
        </div>
      )}
    </div>
  );
};
