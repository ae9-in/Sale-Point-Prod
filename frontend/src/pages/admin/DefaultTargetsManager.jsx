import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Target, Save, Trash2, ShieldAlert } from 'lucide-react';

const DefaultTargetsManager = ({ businesses, selectedBusiness, columns, activityType, onUpdate, globalDefaultTargets }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State for form inputs: { [metric_name]: value }
  const [targetValues, setTargetValues] = useState({});

  // When selectedBusiness, globalDefaultTargets, or columns change, populate form
  useEffect(() => {
    if (!selectedBusiness || !columns) return;
    
    // Find defaults for this business (or globally if 'all')
    const defaultsForBiz = globalDefaultTargets.filter(
      t => (selectedBusiness.id === 'all' ? !t.business_id : t.business_id === selectedBusiness.id)
    );
    
    const initialValues = {};
    columns.forEach(col => {
      const existing = defaultsForBiz.find(d => d.target_name === col);
      initialValues[col] = existing ? String(existing.target_value) : '';
    });
    setTargetValues(initialValues);
  }, [selectedBusiness, globalDefaultTargets, columns]);

  const handleValueChange = (col, val) => {
    setTargetValues(prev => ({ ...prev, [col]: val }));
  };

  const handleSaveAll = async () => {
    if (!selectedBusiness) return;
    
    try {
      setSaving(true);
      
      // We will send all populated targets to the backend.
      // Wait, the backend `/default-targets` POST endpoint handles one at a time.
      // But we can just loop over them and update/create.
      
      // First, get the current targets for this exact business (to know which to update vs create)
      const defaultsForBiz = globalDefaultTargets.filter(
        t => (selectedBusiness.id === 'all' ? !t.business_id : t.business_id === selectedBusiness.id)
      );

      const promises = [];
      
      for (const col of columns) {
        const val = targetValues[col];
        const existing = defaultsForBiz.find(d => d.target_name === col);
        
        if (val !== '' && val !== null && val !== undefined) {
          const payload = {
            businessId: selectedBusiness.id === 'all' ? null : selectedBusiness.id,
            targetName: col,
            targetValue: Number(val)
          };
          
          if (existing) {
            if (Number(val) !== existing.target_value) {
              promises.push(axios.put(`/default-targets/${existing.id}`, payload));
            }
          } else {
            promises.push(axios.post('/default-targets', payload));
          }
        } else if (existing) {
          // If value is cleared but it exists in DB, delete it
          promises.push(axios.delete(`/default-targets/${existing.id}`));
        }
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
        toast.success('Default targets saved successfully');
        if (onUpdate) onUpdate();
      } else {
        toast('No changes to save');
      }
      
    } catch (err) {
      toast.error('Failed to save default targets');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedBusiness) {
    return <div className="p-4 text-xs text-content-muted text-center">Please select a business to configure defaults.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in pt-2">
      <div className="card p-5 border-dark-border/60 bg-dark-surface/40 shadow-sm backdrop-blur-md">
        
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-content-primary flex items-center gap-2">
              <Target size={14} className="text-brand-primary" />
              Configure {activityType} Defaults
            </h3>
            <p className="text-[10px] text-content-muted font-medium mt-1">
              Set standard targets for <strong className="text-content-secondary">{selectedBusiness.business_name}</strong>. These will automatically pre-fill in the Daily grid and assign nightly via the background job.
            </p>
          </div>
          <Button onClick={handleSaveAll} disabled={saving} className="h-9 px-6 shadow-lg shadow-brand-primary/20">
            {saving ? <Spinner size="sm" className="mr-2" /> : <Save size={14} className="mr-2" />}
            Save Defaults
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {columns.map(col => (
            <div key={col} className="bg-dark-bg/50 border border-dark-border/60 rounded-xl p-4 hover:border-brand-primary/40 transition-colors">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-content-muted mb-2 flex justify-between">
                <span>{col}</span>
                {targetValues[col] && (
                  <span className="flex items-center gap-2 text-brand-success">
                    Active
                    <button 
                      onClick={() => handleValueChange(col, '')}
                      className="text-content-muted hover:text-brand-danger transition-colors p-0.5"
                      title="Clear Target"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  placeholder={`Set target for ${col}...`}
                  value={targetValues[col] || ''}
                  onChange={(e) => handleValueChange(col, e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all font-bold placeholder:font-normal"
                />
              </div>
            </div>
          ))}
        </div>

        {columns.length === 0 && (
          <div className="py-10 text-center flex flex-col items-center">
            <ShieldAlert size={24} className="text-content-muted mb-2 opacity-50" />
            <p className="text-xs text-content-muted">No target metrics found for the selected activity type.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DefaultTargetsManager;
