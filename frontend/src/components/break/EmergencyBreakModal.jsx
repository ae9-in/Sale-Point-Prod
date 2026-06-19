import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldAlert, Loader2 } from 'lucide-react';
import * as breakApi from '../../api/breakApi';
import toast from 'react-hot-toast';

const EmergencyBreakModal = ({ 
  isOpen, 
  onClose, 
  refreshFromDb,
  dispatch
}) => {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(15);
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const modalRef = useRef(null);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap & Form resets
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const textarea = modalRef.current?.querySelector('textarea');
        if (textarea) textarea.focus();
      }, 50);
    } else {
      setReason('');
      setDuration(15);
      setValidationError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setValidationError('Reason must be at least 10 characters long.');
      return;
    }
    setValidationError('');
    setSubmitting(true);

    try {
      // Start emergency break directly! No approvals.
      const res = await breakApi.startBreak('Emergency Break', reason, duration);
      
      const slot = {
        id: 'emergency',
        label: 'Emergency Break',
        durationMinutes: duration,
        color: 'red',
        icon: 'coffee'
      };

      dispatch({ 
        type: 'START_BREAK', 
        payload: { 
          activeBreak: slot, 
          startedAt: new Date(res.data.started_at).getTime() 
        } 
      });

      toast.success('Emergency break started');
      await refreshFromDb();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start emergency break');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        ref={modalRef}
        role="dialog" 
        aria-modal="true"
        aria-labelledby="modal-title"
        className="card w-full max-w-md bg-dark-surface border-dark-border flex flex-col p-6 shadow-2xl relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-dark-bg text-content-muted hover:text-content-primary transition-colors"
          aria-label="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-brand-danger" />
          <h2 id="modal-title" className="text-base font-semibold text-content-primary">
            Start Emergency Break
          </h2>
        </div>

        {/* Form State */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-[11px] text-content-secondary leading-relaxed">
            Emergency breaks start immediately. Please state the reason for your records.
          </p>

          <div>
            <label htmlFor="reason" className="block text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-1">
              Reason for Break (Min 10 characters) *
            </label>
            <textarea
              id="reason"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the emergency reason..."
              className="input-field resize-none text-[12px] h-20"
              required
            />
            {validationError && (
              <span className="text-[11px] text-brand-danger mt-1 block">
                {validationError}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="duration" className="block text-[11px] font-semibold text-content-secondary uppercase tracking-wider mb-1">
              Estimated Duration (Minutes, 1-60)
            </label>
            <input
              id="duration"
              type="number"
              min="1"
              max="60"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              className="input-field text-[12px]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-primary text-sm py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Start Emergency Break
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmergencyBreakModal;
