import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { Clock, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const EditShiftModal = ({ employee, onClose, onSaveSuccess }) => {
  const [shiftStart, setShiftStart] = useState('');
  const [shiftEnd, setShiftEnd] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      // Postgres returns TIME fields as "HH:MM:SS", we can take the first 5 chars for the time picker "HH:MM"
      setShiftStart(employee.shift_start ? employee.shift_start.slice(0, 5) : '09:30');
      setShiftEnd(employee.shift_end ? employee.shift_end.slice(0, 5) : '19:00');
    }
  }, [employee]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!shiftStart || !shiftEnd) {
      toast.error('Both start and end times are required');
      return;
    }

    try {
      setSaving(true);
      await axios.patch(`/admin/users/${employee.id}/working-hours`, {
        shiftStart: `${shiftStart}:00`,
        shiftEnd: `${shiftEnd}:00`
      });
      toast.success('Working hours updated successfully');
      onSaveSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update working hours');
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-sm p-6 bg-dark-surface/90 border border-dark-border/60 shadow-2xl relative animate-scale-up backdrop-blur-md">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-content-muted hover:text-content-primary p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-xs font-black uppercase tracking-widest text-content-primary mb-2 flex items-center gap-2 border-b border-dark-border pb-3">
          <Clock className="w-4 h-4 text-brand-primary" />
          Edit Working Hours
        </h3>

        <div className="mb-4">
          <p className="text-sm font-bold text-content-primary">{employee.name}</p>
          <p className="text-xs text-content-secondary mt-0.5 truncate">{employee.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-content-secondary uppercase tracking-wider mb-2">Start Time</label>
              <input
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-content-secondary uppercase tracking-wider mb-2">End Time</label>
              <input
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors text-sm"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 mt-5 border-t border-dark-border">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving} className="h-9 text-[11px] font-black uppercase tracking-wider">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="h-9 text-[11px] font-black uppercase tracking-wider px-5">
              {saving ? 'Saving...' : 'Save Shift'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditShiftModal;
