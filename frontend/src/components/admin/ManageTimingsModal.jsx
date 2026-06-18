import { useState } from 'react';
import axios from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { Clock, X } from 'lucide-react';
import Button from '../ui/Button';

const ManageTimingsModal = ({ employeeId, employeeName, business, onClose, onSaveSuccess }) => {
  const [customTimingsEnabled, setCustomTimingsEnabled] = useState(business.customTimingsEnabled || false);
  const [selectedTimingIds, setSelectedTimingIds] = useState(
    business.timings.filter(t => t.assigned).map(t => t.id)
  );
  const [saving, setSaving] = useState(false);

  const handleToggleTiming = (timingId) => {
    setSelectedTimingIds(prev => 
      prev.includes(timingId) 
        ? prev.filter(id => id !== timingId) 
        : [...prev, timingId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(`/admin/employees/${employeeId}/businesses/${business.id}/timings`, {
        customTimingsEnabled,
        timingIds: selectedTimingIds
      });
      toast.success('Custom timings updated successfully');
      onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to update timings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-md p-6 bg-dark-surface/90 border border-dark-border/60 shadow-2xl relative animate-scale-up backdrop-blur-md">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-content-muted hover:text-content-primary p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-xs font-black uppercase tracking-widest text-content-primary mb-2 flex items-center gap-2 border-b border-dark-border pb-3">
          <Clock className="w-4 h-4 text-brand-primary" />
          Manage Timings
        </h3>

        <div className="mb-4">
          <p className="text-sm font-bold text-content-primary">{employeeName}</p>
          <p className="text-xs text-content-secondary mt-0.5">Business: <span className="font-semibold">{business.business_name}</span></p>
        </div>

        <div className="space-y-4">
          {/* Custom timings toggle */}
          <div className="flex items-center justify-between bg-dark-bg/40 p-3.5 rounded-lg border border-dark-border/50">
            <div>
              <p className="text-xs font-bold text-content-primary uppercase tracking-wide">Enable Custom Timings</p>
              <p className="text-[10px] text-content-muted mt-0.5 leading-relaxed">Customize timings specifically for this employee instead of defaults.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={customTimingsEnabled}
                onChange={(e) => setCustomTimingsEnabled(e.target.checked)}
              />
              <div className="w-9 h-5 bg-dark-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-content-muted after:border-dark-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white"></div>
            </label>
          </div>

          {/* Timings selection */}
          <div className="space-y-2.5">
            <p className="text-[9px] font-black text-content-muted uppercase tracking-widest">Select Assigned Time Slots</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {business.timings.map(t => {
                const isChecked = customTimingsEnabled ? selectedTimingIds.includes(t.id) : true;
                return (
                  <label 
                    key={t.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                      !customTimingsEnabled 
                        ? 'bg-dark-bg/20 border-dark-border/40 text-content-muted/60 cursor-not-allowed'
                        : isChecked
                          ? 'bg-brand-primary/5 border-brand-primary/30 text-content-primary'
                          : 'bg-dark-bg/40 border-dark-border/50 text-content-secondary hover:border-dark-border'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!customTimingsEnabled}
                      onChange={() => handleToggleTiming(t.id)}
                      className="rounded border-dark-border bg-dark-bg text-brand-primary focus:ring-brand-primary focus:ring-opacity-25 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="text-xs font-bold font-mono tracking-wide">{t.timing_name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 mt-5 border-t border-dark-border">
          <Button variant="secondary" onClick={onClose} disabled={saving} className="h-9 text-[11px] font-black uppercase tracking-wider">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-9 text-[11px] font-black uppercase tracking-wider px-5">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManageTimingsModal;
