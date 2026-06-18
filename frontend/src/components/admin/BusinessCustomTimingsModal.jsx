import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { Clock, X, User } from 'lucide-react';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { cn } from '../../utils/cn';

const BusinessCustomTimingsModal = ({ business, assignedEmployees, onClose }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeBusinessData, setEmployeeBusinessData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [customTimingsEnabled, setCustomTimingsEnabled] = useState(false);
  const [selectedTimingIds, setSelectedTimingIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchEmployeeData = async (employee) => {
    setSelectedEmployee(employee);
    setLoading(true);
    try {
      const res = await axios.get(`/admin/employees/${employee.id}/businesses`);
      const empBiz = res.data.data.find(b => b.id === business.id);
      if (empBiz) {
        setEmployeeBusinessData(empBiz);
        setCustomTimingsEnabled(empBiz.customTimingsEnabled || false);
        setSelectedTimingIds(empBiz.timings.filter(t => t.assigned).map(t => t.id));
      } else {
        toast.error("Employee business assignment not found");
        setEmployeeBusinessData(null);
      }
    } catch (err) {
      toast.error('Failed to load employee timings');
      setEmployeeBusinessData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTiming = (timingId) => {
    setSelectedTimingIds(prev => 
      prev.includes(timingId) 
        ? prev.filter(id => id !== timingId) 
        : [...prev, timingId]
    );
  };

  const handleSave = async () => {
    if (!selectedEmployee || !employeeBusinessData) return;
    try {
      setSaving(true);
      await axios.put(`/admin/employees/${selectedEmployee.id}/businesses/${business.id}/timings`, {
        customTimingsEnabled,
        timingIds: selectedTimingIds
      });
      toast.success('Custom timings updated successfully');
      // Update local state to reflect changes without closing the modal completely
      const updatedTimings = employeeBusinessData.timings.map(t => ({
        ...t,
        assigned: selectedTimingIds.includes(t.id)
      }));
      setEmployeeBusinessData({
        ...employeeBusinessData,
        customTimingsEnabled,
        timings: updatedTimings
      });
    } catch (err) {
      toast.error('Failed to update timings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-4xl bg-dark-surface/95 border border-dark-border/60 shadow-2xl relative animate-scale-up backdrop-blur-md flex flex-col max-h-[85vh]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-content-muted hover:text-content-primary p-1 rounded-md transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 border-b border-dark-border">
          <h3 className="text-sm font-black uppercase tracking-widest text-content-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-primary" />
            Custom Time Slots - {business.business_name}
          </h3>
          <p className="text-xs text-content-secondary mt-1">Configure individual time slots for assigned employees.</p>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-[400px]">
          {/* Employee List Sidebar */}
          <div className="w-1/3 border-r border-dark-border bg-dark-bg/30 overflow-y-auto">
            {assignedEmployees.length === 0 ? (
              <p className="p-5 text-center text-xs text-content-muted">No employees assigned to this business.</p>
            ) : (
              <ul className="p-3 space-y-1">
                {assignedEmployees.map(emp => (
                  <li key={emp.id}>
                    <button
                      onClick={() => fetchEmployeeData(emp)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        selectedEmployee?.id === emp.id
                          ? "bg-brand-primary/10 border border-brand-primary/30"
                          : "hover:bg-dark-bg border border-transparent"
                      )}
                    >
                      <User className={cn("w-4 h-4", selectedEmployee?.id === emp.id ? "text-brand-primary" : "text-content-muted")} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-bold truncate", selectedEmployee?.id === emp.id ? "text-content-primary" : "text-content-secondary")}>{emp.name}</p>
                        <p className="text-[10px] text-content-muted truncate mt-0.5">{emp.email}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Configuration Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-dark-bg/10 relative">
            {!selectedEmployee ? (
              <div className="h-full flex flex-col items-center justify-center text-content-muted">
                <Clock className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Select an employee from the left</p>
                <p className="text-xs opacity-70 mt-1">to configure their custom time slots</p>
              </div>
            ) : loading ? (
              <div className="h-full flex flex-col items-center justify-center">
                <Spinner size="lg" />
                <p className="text-xs mt-3 text-content-muted animate-pulse">Loading settings...</p>
              </div>
            ) : employeeBusinessData ? (
              <div className="max-w-xl mx-auto space-y-6">
                <div className="mb-2">
                  <p className="text-lg font-black text-content-primary">{selectedEmployee.name}</p>
                  <p className="text-xs text-content-secondary mt-1">Configure timings overriding business defaults.</p>
                </div>

                <div className="flex items-center justify-between bg-dark-bg/60 p-4 rounded-xl border border-dark-border shadow-sm">
                  <div>
                    <p className="text-sm font-bold text-content-primary uppercase tracking-wide">Enable Custom Timings</p>
                    <p className="text-xs text-content-muted mt-1 leading-relaxed max-w-sm">When enabled, the employee will only see the time slots selected below instead of all business timings.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={customTimingsEnabled}
                      onChange={(e) => setCustomTimingsEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-dark-bg/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-content-muted after:border-dark-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white"></div>
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-content-muted uppercase tracking-widest pl-1">Available Time Slots</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {employeeBusinessData.timings.map(t => {
                      const isChecked = customTimingsEnabled ? selectedTimingIds.includes(t.id) : true;
                      return (
                        <label 
                          key={t.id} 
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none",
                            !customTimingsEnabled 
                              ? 'bg-dark-bg/20 border-dark-border/40 text-content-muted/50 cursor-not-allowed grayscale'
                              : isChecked
                                ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary shadow-sm'
                                : 'bg-dark-bg/50 border-dark-border text-content-secondary hover:border-content-muted'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!customTimingsEnabled}
                            onChange={() => handleToggleTiming(t.id)}
                            className="rounded border-dark-border bg-dark-bg text-brand-primary focus:ring-brand-primary focus:ring-opacity-25 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="text-sm font-bold font-mono tracking-wide">{t.timing_name}</span>
                        </label>
                      );
                    })}
                    {employeeBusinessData.timings.length === 0 && (
                      <p className="col-span-full text-xs text-content-muted p-4 border border-dashed border-dark-border rounded-xl text-center">No timings configured for this business.</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-dark-border/60 mt-8">
                  <Button onClick={handleSave} disabled={saving} className="h-10 text-xs font-black uppercase tracking-wider px-8 shadow-md">
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-brand-danger">
                <p className="text-sm font-medium">Failed to load data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessCustomTimingsModal;
