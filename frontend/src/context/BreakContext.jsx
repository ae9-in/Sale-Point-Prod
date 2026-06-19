import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import * as breakApi from '../api/breakApi';

const BreakStateContext = createContext();
const BreakDispatchContext = createContext();

const getInitialState = () => {
  const today = new Date().toISOString().split('T')[0];
  const historyKey = `salespoint_break_history_${today}`;
  const savedHistory = localStorage.getItem(historyKey);
  const breakHistory = savedHistory ? JSON.parse(savedHistory) : [];

  // Check for local active break backup
  const savedActive = localStorage.getItem('salespoint_active_break');
  let activeBreak = null;
  let startedAt = null;
  let timerSeconds = 0;
  let hasResumePrompt = false;

  if (savedActive) {
    try {
      const parsed = JSON.parse(savedActive);
      activeBreak = parsed.activeBreak;
      startedAt = parsed.startedAt;
      timerSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      hasResumePrompt = true;
    } catch (e) {
      localStorage.removeItem('salespoint_active_break');
    }
  }

  return {
    activeBreak,
    startedAt,
    timerSeconds,
    breakHistory,
    emergencyStatus: 'idle',
    overageAlertSent: localStorage.getItem('salespoint_overage_alert_sent') === 'true',
    showResumePrompt: hasResumePrompt,
    loading: false
  };
};

const breakReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'START_BREAK': {
      localStorage.setItem('salespoint_active_break', JSON.stringify({
        activeBreak: action.payload.activeBreak,
        startedAt: action.payload.startedAt
      }));
      localStorage.setItem('salespoint_overage_alert_sent', 'false');
      return {
        ...state,
        activeBreak: action.payload.activeBreak,
        startedAt: action.payload.startedAt,
        timerSeconds: 0,
        overageAlertSent: false,
        showResumePrompt: false
      };
    }
    case 'TICK': {
      return {
        ...state,
        timerSeconds: state.timerSeconds + 1
      };
    }
    case 'END_BREAK': {
      localStorage.removeItem('salespoint_active_break');
      localStorage.removeItem('salespoint_overage_alert_sent');
      
      const today = new Date().toISOString().split('T')[0];
      const historyKey = `salespoint_break_history_${today}`;
      
      const updatedHistory = action.payload;
      localStorage.setItem(historyKey, JSON.stringify(updatedHistory));

      return {
        ...state,
        activeBreak: null,
        startedAt: null,
        timerSeconds: 0,
        breakHistory: updatedHistory,
        overageAlertSent: false,
        showResumePrompt: false
      };
    }
    case 'SET_EMERGENCY_STATUS': {
      return {
        ...state,
        emergencyStatus: action.payload
      };
    }
    case 'DISCARD_BREAK': {
      localStorage.removeItem('salespoint_active_break');
      localStorage.removeItem('salespoint_overage_alert_sent');
      return {
        ...state,
        activeBreak: null,
        startedAt: null,
        timerSeconds: 0,
        overageAlertSent: false,
        showResumePrompt: false
      };
    }
    case 'RESUME_CONFIRMED': {
      return {
        ...state,
        showResumePrompt: false
      };
    }
    case 'MARK_OVERAGE_SENT': {
      localStorage.setItem('salespoint_overage_alert_sent', 'true');
      return { ...state, overageAlertSent: true };
    }
    case 'SYNC_STATE': {
      return {
        ...state,
        ...action.payload
      };
    }
    default:
      return state;
  }
};

export const BreakProvider = ({ children }) => {
  const [state, dispatch] = useReducer(breakReducer, null, getInitialState);
  const { isAuthenticated } = useAuthStore();

  // Load and sync from database
  const refreshFromDb = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Fetch active break
      const activeRes = await breakApi.getActiveBreak();
      const activeData = activeRes.data;

      // Fetch history
      const historyRes = await breakApi.getTodayHistory();
      const historyData = historyRes.data;

      const today = new Date().toISOString().split('T')[0];
      const historyKey = `salespoint_break_history_${today}`;
      localStorage.setItem(historyKey, JSON.stringify(historyData));

      if (activeData) {
        const dbStartedAt = new Date(activeData.started_at).getTime();
        const elapsed = Math.max(0, Math.floor((Date.now() - dbStartedAt) / 1000));

        let slotConfig = {
          id: activeData.break_type === 'Emergency Break' ? 'emergency' : activeData.break_type.toLowerCase().split(' ')[0],
          label: activeData.break_type,
          durationMinutes: activeData.break_type === 'Morning Break' || activeData.break_type === 'Evening Break' ? 15 : activeData.break_type === 'Afternoon Break' ? 45 : 0,
          color: activeData.break_type === 'Morning Break' ? 'amber' : activeData.break_type === 'Afternoon Break' ? 'blue' : activeData.break_type === 'Evening Break' ? 'purple' : 'red',
          icon: activeData.break_type === 'Morning Break' ? 'sunrise' : activeData.break_type === 'Afternoon Break' ? 'sun' : activeData.break_type === 'Evening Break' ? 'moon' : 'coffee'
        };

        // Determine emergency status
        let emergencyStatus = 'idle';
        if (activeData.emergency_status && activeData.emergency_status !== 'idle') {
          emergencyStatus = activeData.emergency_status;
        }

        dispatch({
          type: 'SYNC_STATE',
          payload: {
            activeBreak: slotConfig,
            startedAt: dbStartedAt,
            timerSeconds: elapsed,
            breakHistory: historyData,
            emergencyStatus
          }
        });

        localStorage.setItem('salespoint_active_break', JSON.stringify({
          activeBreak: slotConfig,
          startedAt: dbStartedAt
        }));
      } else {
        // No active break in database
        dispatch({
          type: 'SYNC_STATE',
          payload: {
            activeBreak: null,
            startedAt: null,
            timerSeconds: 0,
            breakHistory: historyData,
            emergencyStatus: 'idle',
            showResumePrompt: false
          }
        });
        localStorage.removeItem('salespoint_active_break');
      }
    } catch (err) {
      console.error('Failed to sync break details with database:', err);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshFromDb();
    }
  }, [isAuthenticated, refreshFromDb]);

  // Sync state across browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (
        e.key === 'salespoint_active_break' ||
        (e.key && e.key.startsWith('salespoint_break_history_')) ||
        e.key === 'salespoint_overage_alert_sent'
      ) {
        refreshFromDb();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshFromDb]);

  return (
    <BreakStateContext.Provider value={state}>
      <BreakDispatchContext.Provider value={{ dispatch, refreshFromDb }}>
        {children}
      </BreakDispatchContext.Provider>
    </BreakStateContext.Provider>
  );
};

export const useBreakState = () => {
  const context = useContext(BreakStateContext);
  if (context === undefined) {
    throw new Error('useBreakState must be used within a BreakProvider');
  }
  return context;
};

export const useBreakDispatch = () => {
  const context = useContext(BreakDispatchContext);
  if (context === undefined) {
    throw new Error('useBreakDispatch must be used within a BreakProvider');
  }
  return context;
};
