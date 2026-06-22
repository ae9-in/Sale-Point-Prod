import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from '../../api/axiosInstance';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  Target, Save, Plus, Trash2, Building2, Users,
  CheckCircle2, Search, Calendar, RefreshCw, Copy, Sparkles, Filter, Settings, History
} from 'lucide-react';
import DefaultTargetsManager from './DefaultTargetsManager';
import TargetHistoryModal from '../../components/admin/TargetHistoryModal';

// ─── Preset metric columns ───────────────────────────────────────────
const PRESET_METRICS = ['Calls Made', 'Positive Leads', 'Conversions', 'Visits Made', 'Answered Calls'];

// ─── Small inline progress bar ───────────────────────────────────────
const MiniProgress = ({ progress, target }) => {
  if (!target || target === 0) return null;
  const pct = Math.min(Math.round((progress / target) * 100), 100);
  const color = pct >= 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#6366f1';
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between text-[9px] text-content-muted mb-0.5">
        <span>{progress}/{target}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-dark-border/60 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ─── Excel cell ───────────────────────────────────────────────────────
const Cell = ({ value, savedValue, progress, onChange, onDelete, disabled }) => {
  const isDirty = String(value ?? '') !== String(savedValue ?? '');
  const hasSaved = savedValue !== undefined && savedValue !== null && savedValue !== '';

  return (
    <div className={`relative flex flex-col p-2 border-r border-dark-border/40 min-w-[130px] transition-colors ${isDirty ? 'bg-amber-500/10' : ''}`}>
      <div className="flex items-center gap-1.5 w-full">
        {hasSaved && !isDirty && (
          <CheckCircle2 size={10} className="text-brand-success shrink-0" />
        )}
        <input
          type="number"
          min="0"
          disabled={disabled}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className={`w-full h-8 px-2.5 bg-dark-bg/60 border border-dark-border/60 hover:border-dark-border/90 focus:border-brand-primary rounded-lg text-xs font-mono text-content-primary outline-none focus:ring-1 focus:ring-brand-primary transition-all text-center placeholder:text-content-muted/30 ${
            isDirty ? 'font-bold border-amber-500/40' : ''
          }`}
        />
        {hasSaved && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-content-muted hover:text-brand-danger transition-all p-1 bg-dark-bg border border-dark-border rounded-md shrink-0"
            title="Clear target"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
      {hasSaved && !isDirty && (
        <div className="px-1">
          <MiniProgress progress={progress || 0} target={Number(savedValue)} />
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────
const Targets = () => {
  // --- States ---
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null); // { id: 'all' | UUID, business_name: '...' }
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [globalDefaultTargets, setGlobalDefaultTargets] = useState([]);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'default'

  // Filters
  const [activityType, setActivityType] = useState('Callings'); // 'Callings' or 'Fields'
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');

  // Grid Data
  const [employees, setEmployees] = useState([]);
  const [savedTargets, setSavedTargets] = useState([]);
  const [gridData, setGridData] = useState({});
  const [columns, setColumns] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState(new Set());
  
  // Custom metadata for 'All Businesses' mode
  const [employeeBusinessesMap, setEmployeeBusinessesMap] = useState({}); // { [empId]: Array of business objects }

  // Columns & custom column creation
  const [newColName, setNewColName] = useState('');
  const [addingCol, setAddingCol] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bulk Fill State
  const [bulkFillMetric, setBulkFillMetric] = useState('');
  const [bulkFillValue, setBulkFillValue] = useState('');

  // History Modal State
  const [historyEmployee, setHistoryEmployee] = useState(null);

  // 1. Fetch businesses and default targets on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoadingBiz(true);
      const [bizRes, defTargetsRes] = await Promise.all([
        axios.get('/businesses'),
        axios.get('/default-targets')
      ]);
      const bizList = bizRes.data.data || [];
      setBusinesses(bizList);
      setGlobalDefaultTargets(defTargetsRes.data.data || []);
      
      if (bizList.length > 0) {
        setSelectedBusiness(bizList[0]); // pre-select first business
      }
    } catch {
      toast.error('Failed to load initial data');
    } finally {
      setLoadingBiz(false);
    }
  };

  // Helper to re-fetch default targets if modified in the config tab
  const reloadDefaultTargets = async () => {
    try {
      const res = await axios.get('/default-targets');
      setGlobalDefaultTargets(res.data.data || []);
    } catch {}
  };

  // 2. Set default columns when Activity Type changes
  useEffect(() => {
    if (activityType === 'Callings') {
      setColumns(['Calls Made', 'Positive Leads', 'Conversions', 'Answered Calls']);
      setBulkFillMetric('Calls Made');
    } else {
      setColumns(['Visits Made', 'Positive Leads', 'Conversions']);
      setBulkFillMetric('Visits Made');
    }
  }, [activityType]);

  // 3. Fetch targets & employees based on selected business
  const fetchGridData = useCallback(async () => {
    if (!selectedBusiness?.id || !startDate || !endDate) return;
    
    const isAll = selectedBusiness.id === 'all';

    try {
      setLoadingGrid(true);
      
      if (!isAll) {
        // Specific Business
        const res = await axios.get(`/targets/business/${selectedBusiness.id}`, {
          params: { startDate, endDate }
        });
        const { employees: emps, targets } = res.data.data;
        setEmployees(emps);
        setSavedTargets(targets);

        const grid = {};
        for (const emp of emps) {
          grid[emp.id] = {};
          // Pre-fill with default targets
          for (const dt of globalDefaultTargets) {
            if (!dt.business_id || dt.business_id === selectedBusiness.id) {
              grid[emp.id][dt.target_name] = String(dt.target_value);
            }
          }
        }
        // Override with saved targets
        for (const t of targets) {
          if (grid[t.employee_id] !== undefined) {
            grid[t.employee_id][t.target_name] = String(t.target_value);
          }
        }
        setGridData(grid);
        setSelectedEmpIds(new Set(emps.map(e => e.id)));

      } else {
        // "All Businesses" view
        // 1. Fetch all approved users
        const usersRes = await axios.get('/admin/users?status=APPROVED');
        const emps = usersRes.data.data || [];
        setEmployees(emps);

        // 2. Fetch businesses and target summaries in parallel for each employee
        const detailsPromises = emps.map(async (emp) => {
          try {
            const bizRes = await axios.get(`/admin/employees/${emp.id}/businesses`);
            const summaryRes = await axios.get(`/targets/employee/${emp.id}/summary`);
            return {
              empId: emp.id,
              businesses: bizRes.data.data || [],
              targets: summaryRes.data.data || []
            };
          } catch {
            return { empId: emp.id, businesses: [], targets: [] };
          }
        });

        const details = await Promise.all(detailsPromises);

        // Build business mappings and collect matching targets
        const bizMap = {};
        const consolidatedSavedTargets = [];
        const grid = {};

        for (const d of details) {
          bizMap[d.empId] = d.businesses;
          grid[d.empId] = {};

          // Pre-fill with default targets
          for (const dt of globalDefaultTargets) {
            const appliesToEmp = !dt.business_id || d.businesses.some(b => b.id === dt.business_id);
            if (appliesToEmp) {
              grid[d.empId][dt.target_name] = String(dt.target_value);
            }
          }

          // Filter summary targets by selected start date & end date (string date comparison)
          const matched = d.targets.filter(t => {
            const sd = t.start_date ? t.start_date.slice(0, 10) : '';
            const ed = t.end_date ? t.end_date.slice(0, 10) : '';
            return sd === startDate && ed === endDate;
          });

          // Consolidate values for the grid (group by target name)
          // If targets exist across multiple businesses, we sum progress, but show the target value
          const tempTargets = {}; // { [target_name]: targetObject }
          for (const t of matched) {
            if (!tempTargets[t.target_name]) {
              tempTargets[t.target_name] = { ...t, progress: 0 };
            }
            tempTargets[t.target_name].progress += Number(t.progress || 0);
          }

          const consolidatedList = Object.values(tempTargets);
          consolidatedSavedTargets.push(...consolidatedList);

          for (const t of consolidatedList) {
            grid[d.empId][t.target_name] = String(t.target_value);
          }
        }

        setEmployeeBusinessesMap(bizMap);
        setSavedTargets(consolidatedSavedTargets);
        setGridData(grid);
        setSelectedEmpIds(new Set(emps.map(e => e.id)));
      }
    } catch {
      toast.error('Failed to fetch targets grid data');
    } finally {
      setLoadingGrid(false);
    }
  }, [selectedBusiness, startDate, endDate, globalDefaultTargets]);

  useEffect(() => {
    fetchGridData();
  }, [fetchGridData]);

  // Helper selectors
  const getSavedValue = (employeeId, metric) => {
    const t = savedTargets.find(t => t.employee_id === employeeId && t.target_name === metric);
    return t ? String(t.target_value) : undefined;
  };

  const getProgress = (employeeId, metric) => {
    const t = savedTargets.find(t => t.employee_id === employeeId && t.target_name === metric);
    return t ? t.progress : 0;
  };

  // Cell change handler
  const handleCellChange = (empId, metric, value) => {
    setGridData(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [metric]: value }
    }));
  };

  // Delete target from DB
  const handleDeleteTarget = async (empId, metric) => {
    // In 'all' mode, we might delete from multiple businesses, so we gather matches
    const isAll = selectedBusiness?.id === 'all';
    const matches = savedTargets.filter(t => t.employee_id === empId && t.target_name === metric);

    if (matches.length === 0) {
      setGridData(prev => ({
        ...prev,
        [empId]: { ...(prev[empId] || {}), [metric]: '' }
      }));
      return;
    }

    try {
      if (!isAll) {
        await axios.delete(`/targets/${matches[0].id}`);
      } else {
        // Delete all matches across businesses in parallel
        await Promise.all(matches.map(m => axios.delete(`/targets/${m.id}`)));
      }
      toast.success('Target removed');
      fetchGridData();
    } catch {
      toast.error('Failed to remove target');
    }
  };

  // Copy row values to all other checked rows
  const handleCopyRowToAll = (sourceEmpId) => {
    const sourceRow = gridData[sourceEmpId] || {};
    setGridData(prev => {
      const next = { ...prev };
      for (const empId of selectedEmpIds) {
        if (empId !== sourceEmpId) {
          next[empId] = { ...(prev[empId] || {}), ...sourceRow };
        }
      }
      return next;
    });
    toast.success('Values copied to all selected employees');
  };

  // Bulk fill metric column
  const handleBulkFill = () => {
    if (!bulkFillMetric) {
      toast.error('Please select a metric to fill');
      return;
    }
    if (bulkFillValue === '') {
      toast.error('Please enter a target value');
      return;
    }
    setGridData(prev => {
      const next = { ...prev };
      for (const empId of selectedEmpIds) {
        if (!next[empId]) next[empId] = {};
        next[empId][bulkFillMetric] = bulkFillValue;
      }
      return next;
    });
    toast.success(`Filled '${bulkFillMetric}' with ${bulkFillValue} for all selected employees`);
  };

  // Save the targets grid
  const handleSaveGrid = async () => {
    if (!selectedBusiness || !startDate || !endDate) {
      toast.error('Please configure a business and date range');
      return;
    }
    if (startDate > endDate) {
      toast.error('Start date must be before end date');
      return;
    }

    const isAll = selectedBusiness.id === 'all';
    const entries = [];

    for (const empId of selectedEmpIds) {
      const row = gridData[empId] || {};
      
      if (!isAll) {
        // Specific Business
        for (const metric of columns) {
          const val = row[metric];
          if (val !== undefined && val !== null && val !== '') {
            entries.push({
              employeeId: empId,
              businessId: selectedBusiness.id,
              targetName: metric,
              targetValue: val,
              startDate,
              endDate
            });
          }
        }
      } else {
        // "All Businesses" mode: save targets for each business assigned to this employee
        const assignedBizs = employeeBusinessesMap[empId] || [];
        if (assignedBizs.length === 0) continue;

        for (const biz of assignedBizs) {
          for (const metric of columns) {
            const val = row[metric];
            if (val !== undefined && val !== null && val !== '') {
              entries.push({
                employeeId: empId,
                businessId: biz.id,
                targetName: metric,
                targetValue: val,
                startDate,
                endDate
              });
            }
          }
        }
      }
    }

    if (entries.length === 0) {
      toast.error('No target values entered');
      return;
    }

    try {
      setSaving(true);
      await axios.post('/targets/bulk', { entries });
      toast.success(`Saved ${entries.length} targets successfully`);
      fetchGridData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save targets');
    } finally {
      setSaving(false);
    }
  };

  // Column helpers
  const addColumn = () => {
    const name = newColName.trim();
    if (!name) return;
    if (columns.includes(name)) {
      toast.error('Column already exists');
      return;
    }
    setColumns(prev => [...prev, name]);
    setNewColName('');
    setAddingCol(false);
    if (!bulkFillMetric) setBulkFillMetric(name);
  };

  const removeColumn = (col) => {
    setColumns(prev => prev.filter(c => c !== col));
    if (bulkFillMetric === col) setBulkFillMetric(columns[0] || '');
  };

  // Checkbox handlers
  const toggleEmployee = (empId) => {
    setSelectedEmpIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId); else next.add(empId);
      return next;
    });
  };

  const toggleAllEmployees = () => {
    if (selectedEmpIds.size === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedEmpIds(new Set());
    } else {
      setSelectedEmpIds(new Set(filteredEmployees.map(e => e.id)));
    }
  };

  // Real-time Search filter
  const filteredEmployees = useMemo(() =>
    employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.email.toLowerCase().includes(searchTerm.toLowerCase())),
    [employees, searchTerm]
  );

  // Check if grid has unsaved edits
  const isDirtyGrid = useMemo(() => {
    for (const empId of selectedEmpIds) {
      const row = gridData[empId] || {};
      for (const metric of columns) {
        const current = String(row[metric] ?? '');
        const saved = getSavedValue(empId, metric) ?? '';
        if (current !== saved && current !== '') return true;
      }
    }
    return false;
  }, [gridData, savedTargets, selectedEmpIds, columns]);

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      
      {/* ─── Page Title Header ─── */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-content-primary tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-brand-primary animate-pulse" />
            Performance Targets
          </h1>
          <p className="mt-1 text-[10px] text-content-secondary uppercase tracking-[0.15em] font-bold">
            Set and track performance targets in an editable Excel grid or configure defaults.
          </p>
        </div>
      </div>

      {/* ─── Dashboard-Style Top Filter Bar (Always Visible) ─── */}
      <div className="card border-dark-border/40 bg-dark-surface/40 p-4 shadow-md backdrop-blur-md">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-4 items-end">
          
          {/* Business Select */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1 flex items-center gap-1">
              <Building2 size={10} className="text-brand-primary" />
              Market Unit / Business
            </label>
            {loadingBiz && businesses.length === 0 ? (
              <div className="h-10 bg-dark-bg border border-dark-border rounded-lg flex items-center justify-center"><Spinner size="sm" /></div>
            ) : (
              <select
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10 font-bold cursor-pointer"
                value={selectedBusiness?.id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    setSelectedBusiness({ id: 'all', business_name: 'All Businesses' });
                  } else {
                    const found = businesses.find(b => String(b.id) === String(val));
                    if (found) setSelectedBusiness(found);
                  }
                }}
              >
                <option value="all">All Businesses</option>
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>{biz.business_name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Activity Type Dropdown */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-content-muted mb-1.5 block ml-1 flex items-center gap-1">
              <Filter size={10} className="text-brand-primary" />
              Activity Type
            </label>
            <select
              className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-primary transition-colors h-10 font-bold cursor-pointer"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
            >
              <option value="Callings">Callings</option>
              <option value="Fields">Field Visits</option>
            </select>
          </div>

          <div className="min-w-fit">
            <Button
              className={`h-10 text-[10px] font-black uppercase tracking-wider px-4 shrink-0 ${isDirtyGrid ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-dark-bg' : ''}`}
              onClick={handleSaveGrid}
              disabled={saving || loadingGrid}
            >
              {saving ? <Spinner size="sm" className="mr-1.5" /> : <Save size={12} className="mr-1.5" />}
              {saving ? 'Saving...' : 'Save & Send Targets'}
            </Button>
          </div>

        </div>
        
        {isDirtyGrid && (
          <p className="text-[10px] text-amber-400 font-semibold mt-3.5 flex items-center gap-1.5 animate-fade-in pl-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
            Unsaved modifications in grid — click "Save & Send Targets" to apply
          </p>
        )}
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-1 border-b border-dark-border/40 pb-0 pt-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'daily' 
              ? 'text-brand-primary border-brand-primary' 
              : 'text-content-muted border-transparent hover:text-content-primary hover:border-dark-border'
          }`}
        >
          <Calendar size={14} />
          Daily Targets Grid
        </button>
        <button
          onClick={() => setActiveTab('default')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'default' 
              ? 'text-brand-primary border-brand-primary' 
              : 'text-content-muted border-transparent hover:text-content-primary hover:border-dark-border'
          }`}
        >
          <Settings size={14} />
          Default Targets Config
        </button>
      </div>

      {activeTab === 'default' && (
        <DefaultTargetsManager 
          businesses={businesses} 
          selectedBusiness={selectedBusiness}
          columns={columns}
          activityType={activityType}
          onUpdate={reloadDefaultTargets}
          globalDefaultTargets={globalDefaultTargets}
        />
      )}

      {activeTab === 'daily' && (
        <>
          {/* ─── Excel Bulk Fill Helper panel ─── */}
      {employees.length > 0 && (
        <div className="card border-dark-border/40 bg-dark-surface/40 p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 backdrop-blur-md">
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-content-primary flex items-center gap-1.5">
              <Sparkles size={11} className="text-brand-primary" />
              Excel Bulk Fill Helper
            </h4>
            <p className="text-[9px] text-content-muted">
              Quickly copy a common target value to all checked employee rows below.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={bulkFillMetric}
              onChange={e => setBulkFillMetric(e.target.value)}
              className="bg-dark-bg border border-dark-border rounded px-2.5 py-1 text-[10px] text-content-primary outline-none font-bold cursor-pointer h-7"
            >
              <option value="" disabled>Select Metric</option>
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>

            <input
              type="number"
              min="0"
              placeholder="Value..."
              value={bulkFillValue}
              onChange={e => setBulkFillValue(e.target.value)}
              className="bg-dark-bg border border-dark-border rounded px-2.5 py-1 text-[10px] text-content-primary outline-none max-w-[80px] h-7"
            />

            <Button
              variant="secondary"
              onClick={handleBulkFill}
              className="h-7 text-[9px] font-black uppercase tracking-wider px-3.5 hover:bg-brand-primary hover:text-dark-bg hover:border-brand-primary"
            >
              Apply to Checked
            </Button>
          </div>
        </div>
      )}

      {/* ─── Excel Grid Table ─── */}
      <div className="card overflow-hidden px-0 py-0 border-dark-border/60 bg-dark-surface/40 shadow-md">
        {loadingGrid ? (
          <div className="flex h-48 items-center justify-center gap-3">
            <Spinner />
            <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted animate-pulse">Loading Excel boxes...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-16 text-center text-[10px] font-bold uppercase tracking-widest text-content-muted flex flex-col items-center gap-3">
            <Users size={28} className="text-content-muted/40" />
            No active employees found matching filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              
              {/* Table head */}
              <thead>
                <tr className="bg-dark-bg/60 border-b border-dark-border">
                  
                  {/* Master Checkbox */}
                  <th className="w-8 px-2 py-2.5 border-r border-dark-border/40 sticky left-0 bg-dark-bg/80 z-10">
                    <input
                      type="checkbox"
                      checked={selectedEmpIds.size === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={toggleAllEmployees}
                      className="w-3.5 h-3.5 accent-brand-primary cursor-pointer rounded"
                    />
                  </th>
                  
                  {/* Employee col */}
                  <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider font-extrabold text-content-muted border-r border-dark-border/60 sticky left-8 bg-dark-bg/80 z-10 min-w-[170px]">
                    <div className="flex items-center gap-1.5">
                      <Users size={10} />
                      Employee ({selectedEmpIds.size}/{filteredEmployees.length})
                    </div>
                  </th>

                  {/* Metric columns */}
                  {columns.map(col => (
                    <th key={col} className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider font-extrabold text-content-muted border-r border-dark-border/40 min-w-[130px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="truncate max-w-[100px]">{col}</span>
                        <button
                          onClick={() => removeColumn(col)}
                          className="text-content-muted/40 hover:text-brand-danger transition-colors shrink-0 p-0.5"
                          title="Delete column"
                        >
                          <Trash2 size={9} />
                        </button>
                      </div>
                    </th>
                  ))}

                  {/* Add column */}
                  <th className="px-3 py-2.5 min-w-[180px]">
                    {addingCol ? (
                      <div className="flex items-center gap-1 animate-fade-in">
                        <input
                          type="text"
                          autoFocus
                          value={newColName}
                          onChange={e => setNewColName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addColumn(); if (e.key === 'Escape') setAddingCol(false); }}
                          placeholder="Metric name..."
                          className="flex-1 bg-dark-bg border border-brand-primary rounded px-2 py-1 text-[10px] text-content-primary outline-none min-w-0"
                        />
                        <button onClick={addColumn} className="text-brand-success hover:text-brand-success/80 p-0.5"><CheckCircle2 size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAddingCol(true)}
                          className="flex items-center gap-1 text-[9px] text-content-muted hover:text-brand-primary transition-colors font-bold uppercase tracking-wider whitespace-nowrap"
                        >
                          <Plus size={10} /> Add Metric
                        </button>
                        <span className="text-dark-border">/</span>
                        <select
                          value=""
                          onChange={e => {
                            const val = e.target.value;
                            if (val && !columns.includes(val)) {
                              setColumns(prev => [...prev, val]);
                            }
                          }}
                          className="bg-dark-bg border border-dark-border rounded px-1.5 py-0.5 text-[9px] text-content-muted outline-none cursor-pointer max-w-[85px] font-bold"
                        >
                          <option value="">Preset</option>
                          {PRESET_METRICS.filter(m => !columns.includes(m)).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </th>
                </tr>
              </thead>

              {/* Table body */}
              <tbody>
                {filteredEmployees.map((emp, idx) => {
                  const isChecked = selectedEmpIds.has(emp.id);
                  return (
                    <tr
                      key={emp.id}
                      className={`group border-b border-dark-border/30 transition-colors ${
                        !isChecked 
                          ? 'opacity-40 bg-dark-bg/10' 
                          : idx % 2 === 0 ? 'bg-dark-surface/25' : 'bg-dark-bg/15'
                      } hover:bg-brand-primary/[0.03]`}
                    >
                      {/* Checkbox */}
                      <td className="px-2 py-1.5 border-r border-dark-border/30 sticky left-0 bg-inherit z-10">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEmployee(emp.id)}
                          className="w-3.5 h-3.5 accent-brand-primary cursor-pointer rounded"
                        />
                      </td>

                      {/* Employee Identity */}
                      <td className="px-3 py-1.5 border-r border-dark-border/40 sticky left-8 bg-dark-surface z-10">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col ml-1 w-full truncate">
                            <span className="font-bold text-content-primary truncate" title={emp.name}>{emp.name}</span>
                            <span className="text-[8px] text-content-muted font-normal truncate" title={emp.email}>{emp.email}</span>
                          </div>
                          <button 
                            onClick={() => setHistoryEmployee(emp)}
                            className="ml-auto p-1 text-content-muted hover:text-brand-primary transition-colors flex-shrink-0 bg-dark-bg/50 border border-dark-border rounded hover:bg-dark-surface"
                            title="View Target History"
                          >
                            <History size={12} />
                          </button>
                          <button
                            onClick={() => handleCopyRowToAll(emp.id)}
                            disabled={!isChecked}
                            title="Copy row values to all other checked employee rows"
                            className="opacity-0 group-hover:opacity-100 disabled:opacity-0 text-content-muted hover:text-brand-primary transition-all p-1 shrink-0 bg-dark-bg border border-dark-border rounded-md"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                      </td>

                      {/* Metric cells */}
                      {columns.map(metric => (
                        <td key={metric} className="p-0">
                          <Cell
                            value={gridData[emp.id]?.[metric] ?? ''}
                            savedValue={getSavedValue(emp.id, metric)}
                            progress={getProgress(emp.id, metric)}
                            disabled={!isChecked}
                            onChange={val => handleCellChange(emp.id, metric, val)}
                            onDelete={() => handleDeleteTarget(emp.id, metric)}
                          />
                        </td>
                      ))}

                      {/* Spacer cell */}
                      <td className="px-3 py-1.5" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        {filteredEmployees.length > 0 && (
          <div className="px-4 py-3 border-t border-dark-border/40 bg-dark-bg/30 flex flex-wrap items-center gap-5 text-[9px] text-content-muted font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-400/40 inline-block" />
              Unsaved grid box
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={10} className="text-brand-success" />
              Saved target
            </span>
            <span className="flex items-center gap-1.5">
              <span className="p-0.5 rounded border border-dark-border bg-dark-bg inline-flex"><Copy size={8} /></span>
              Hover row to copy employee targets to all
            </span>
          </div>
        )}
      </div>
      </>
      )}

      {/* Modals */}
      {historyEmployee && (
        <TargetHistoryModal
          employee={historyEmployee}
          onClose={() => setHistoryEmployee(null)}
        />
      )}
    </div>
  );
};

export default Targets;
