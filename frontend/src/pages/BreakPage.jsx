import React from 'react';
import { useBreakState, useBreakDispatch } from '../context/BreakContext';
import { useAuthStore } from '../store/authStore';
import { BREAK_SLOTS } from '../constants/breakConfig';
import { useBreakTimer } from '../hooks/useBreakTimer';
import BreakSlotCard from '../components/break/BreakSlotCard';
import BreakHistoryLog from '../components/break/BreakHistoryLog';
import * as breakApi from '../api/breakApi';
import { AlertCircle, Coffee, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const BreakPage = () => {
  const state = useBreakState();
  const { dispatch, refreshFromDb } = useBreakDispatch();
  const { user } = useAuthStore();

  const { 
    activeBreak, 
    timerSeconds, 
    breakHistory, 
    emergencyStatus, 
    overageAlertSent, 
    showResumePrompt 
  } = state;

  // Determine if a break timer is running active
  const isRunning = !!activeBreak && emergencyStatus !== 'pending' && !showResumePrompt;
  const allowedMinutes = activeBreak?.durationMinutes || 0;

  // Custom Timer Hook
  useBreakTimer(
    isRunning,
    () => {
      dispatch({ type: 'TICK' });
    },
    async () => {
      if (activeBreak && user) {
        dispatch({ type: 'MARK_OVERAGE_SENT' });
        try {
          await breakApi.sendOverageAlert();
          toast.error(`Overage alert: You exceeded the ${activeBreak.label} limit! Email alert sent.`);
          await refreshFromDb();
        } catch (e) {
          console.error('Overage alert failed to send:', e);
        }
      }
    },
    allowedMinutes,
    timerSeconds
  );

  const handleStartBreak = async (slot) => {
    try {
      const res = await breakApi.startBreak(slot.label);
      dispatch({ 
        type: 'START_BREAK', 
        payload: { 
          activeBreak: slot, 
          startedAt: new Date(res.data.started_at).getTime() 
        } 
      });
      toast.success(`${slot.label} started`);
      await refreshFromDb();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    try {
      const res = await breakApi.endBreak();
      toast.success('Break ended');
      
      // Fetch latest history to update history list
      const historyRes = await breakApi.getTodayHistory();
      dispatch({ type: 'END_BREAK', payload: historyRes.data });
      await refreshFromDb();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to end break');
    }
  };

  const handleResumeConfirm = () => {
    dispatch({ type: 'RESUME_CONFIRMED' });
    toast.success('Resumed previous active break session');
  };

  const handleDiscardConfirm = async () => {
    try {
      await breakApi.endBreak();
      dispatch({ type: 'DISCARD_BREAK' });
      toast.success('Previous break session discarded');
      await refreshFromDb();
    } catch (err) {
      // If server has no active break, we can safely discard in frontend anyway
      dispatch({ type: 'DISCARD_BREAK' });
      toast.success('Previous break session cleared');
    }
  };

  // Check if a slot is completed in today's history
  const getCompletedRecord = (slotId) => {
    const labelMap = {
      morning: 'Morning Break',
      afternoon: 'Afternoon Break',
      evening: 'Evening Break'
    };
    return breakHistory.find(r => r.type === labelMap[slotId]);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex justify-between items-center border-b border-dark-border/40 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-content-primary flex items-center gap-2">
            <Coffee className="w-6 h-6 text-brand-primary" /> Break Management
          </h1>
          <p className="text-[12px] text-content-secondary mt-1">
            Track shifts, scheduled breaks, and log overtime parameters in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-dark-surface/50 border border-dark-border px-3 py-1.5 rounded-lg text-[11px] font-semibold text-content-secondary font-mono">
          <Clock className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Resume Active Break Prompt Banner */}
      {showResumePrompt && (
        <div className="bg-brand-warning/10 border border-brand-warning/20 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-brand-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-content-primary">Unfinished Break Session Found</h3>
              <p className="text-[11px] text-content-secondary mt-0.5">
                We detected an active break from your previous session in the system. Would you like to resume it or discard it?
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={handleResumeConfirm}
              className="flex-1 md:flex-none bg-brand-warning hover:bg-brand-warning/90 text-white font-medium py-1.5 px-3 rounded-lg text-[12px] transition-colors"
            >
              Resume Break
            </button>
            <button 
              onClick={handleDiscardConfirm}
              className="flex-1 md:flex-none bg-transparent hover:bg-dark-border border border-dark-border text-content-primary font-medium py-1.5 px-3 rounded-lg text-[12px] transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Scheduled Breaks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {BREAK_SLOTS.map((slot) => {
          const completedRecord = getCompletedRecord(slot.id);
          const isActive = activeBreak?.id === slot.id;
          const isCompleted = !!completedRecord;
          const isLocked = activeBreak ? !isActive : false;

          return (
            <BreakSlotCard
              key={slot.id}
              slot={slot}
              isActive={isActive}
              isLocked={isLocked}
              isCompleted={isCompleted}
              completedRecord={completedRecord}
              timerSeconds={timerSeconds}
              onStart={handleStartBreak}
              onEnd={handleEndBreak}
            />
          );
        })}
      </div>

      {/* Break History Log Table */}
      <BreakHistoryLog history={breakHistory} />
    </div>
  );
};

export default BreakPage;
