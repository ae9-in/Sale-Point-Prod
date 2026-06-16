import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { MessageSquare, Clock, AlertCircle } from 'lucide-react';

const SubmitReport = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [businesses, setBusinesses] = useState([]);
  const [timings, setTimings] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [fields, setFields] = useState([]);
  const [todaySubmissions, setTodaySubmissions] = useState([]);
  
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedTiming, setSelectedTiming] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [question, setQuestion] = useState('');
  const [showQuestion, setShowQuestion] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  // Smart Alert Logic
  const nextScheduledTiming = useMemo(() => {
    if (!selectedBusiness || !timings.length) return null;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parseTime = (t) => {
      const [time, ampm] = t.split(' ');
      let [h, m] = time.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    const activeTimings = timings.filter(t => !todaySubmissions.includes(t.id));
    if (!activeTimings.length) return null;

    const sorted = [...activeTimings].sort((a, b) => parseTime(a.timing_name) - parseTime(b.timing_name));
    return sorted.find(t => parseTime(t.timing_name) > currentMinutes) || sorted[0];
  }, [selectedBusiness, timings, todaySubmissions]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await axios.get(`/admin/employees/${user.id}/businesses`);
        const bizList = res.data.data;
        setBusinesses(bizList);

        // Handle URL pre-fill
        const params = new URLSearchParams(location.search);
        const preBiz = params.get('businessId');
        const preTime = params.get('timingId');
        
        if (preBiz) setSelectedBusiness(preBiz);
        if (preTime) setSelectedTiming(preTime);
        
      } catch (err) {
        toast.error('Failed to load businesses');
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchBusinesses();
  }, [user, location]);

  useEffect(() => {
    if (!selectedBusiness) {
      setTimings([]); setActivityTypes([]); setFields([]); setTodaySubmissions([]); return;
    }
    const fetchBizData = async () => {
      try {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const [timingsRes, activitiesRes, submissionsRes] = await Promise.all([
          axios.get(`/businesses/${selectedBusiness}/timings`),
          axios.get(`/businesses/${selectedBusiness}/activity-types`),
          axios.get(`/reports?businessId=${selectedBusiness}&date=${todayStr}`)
        ]);
        setTimings(timingsRes.data.data);
        setActivityTypes(activitiesRes.data.data);
        const submittedTimingIds = submissionsRes.data.data.map(r => r.timing_id);
        setTodaySubmissions(submittedTimingIds);
      } catch (err) {
        toast.error('Failed to load business details');
      }
    };
    fetchBizData();
  }, [selectedBusiness]);

  useEffect(() => {
    if (!selectedActivity || !selectedBusiness) {
      setFields([]); return;
    }
    const fetchFields = async () => {
      try {
        const res = await axios.get(`/businesses/${selectedBusiness}/activity-types/${selectedActivity}/fields`);
        setFields(res.data.data);
      } catch (err) {
        toast.error('Failed to load form fields');
      }
    };
    fetchFields();
  }, [selectedActivity, selectedBusiness]);

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      const answers = fields.map(f => ({
        fieldId: f.id,
        value: data[`field_${f.id}`]
      }));

      await axios.post('/reports', {
        businessId: selectedBusiness,
        timingId: selectedTiming,
        activityTypeId: selectedActivity,
        answers
      });

      toast.success('Report submitted successfully!');
      setTodaySubmissions(prev => [...prev, selectedTiming]);
      reset();
      setSelectedActivity('');
      setSelectedTiming('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const submitQuestion = async () => {
    if (!selectedBusiness) {
      toast.error('Select a business first');
      return;
    }
    if (!question.trim()) {
      toast.error('Enter your query');
      return;
    }
    try {
      await axios.post('/doubts', {
        businessId: selectedBusiness,
        question
      });
      toast.success('Query sent to admin');
      setQuestion('');
      setShowQuestion(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit query');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-content-secondary animate-pulse">Loading report form...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-10 px-1">
      {nextScheduledTiming && selectedTiming !== nextScheduledTiming.id && (
        <div className="mb-6 overflow-hidden rounded-2xl border-2 border-brand-primary bg-brand-primary/10 shadow-lg shadow-brand-primary/10 animate-in zoom-in-95 duration-300">
          <div className="flex flex-col sm:flex-row items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg shadow-brand-primary/30">
              <Clock size={24} strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-[12px] font-black uppercase tracking-widest text-brand-primary">Action Required</p>
              <h3 className="text-base font-bold text-content-primary mt-0.5">
                Next report is due at <span className="text-brand-primary underline underline-offset-4">{nextScheduledTiming.timing_name}</span>
              </h3>
              <p className="text-xs text-content-secondary mt-1 opacity-80 italic">Don't forget to submit on time!</p>
            </div>
            <Button 
              className="h-10 px-6 font-bold shadow-md active:scale-95 transition-transform w-full sm:w-auto bg-brand-primary text-white hover:opacity-90"
              onClick={() => setSelectedTiming(nextScheduledTiming.id)}
            >
              Start this report
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 px-1">
        <h1 className="text-xl md:text-2xl font-bold text-content-primary">Submit Daily Report</h1>
        <p className="text-content-secondary mt-1">Log your field activities and performance data.</p>
      </div>

      <div className="card p-5 md:p-8">
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-content-primary leading-tight">Need help with this business?</h2>
            <p className="text-xs text-content-secondary mt-1">Send a query to admin for the selected business.</p>
          </div>
          <Button type="button" variant="secondary" className="h-9 text-xs" onClick={() => setShowQuestion((value) => !value)}>
            <MessageSquare className="mr-2 h-3.5 w-3.5" />
            Doubt / Query
          </Button>
        </div>

        {showQuestion && (
          <div className="mb-6 rounded-xl border border-dark-border bg-dark-bg/50 p-4">
            <label className="mb-1 block text-sm font-medium text-content-secondary">Your Query</label>
            <textarea
              className="input-field min-h-[110px]"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Write your question for admin..."
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="secondary" className="h-9 text-xs" onClick={() => setShowQuestion(false)}>Cancel</Button>
              <Button type="button" className="h-9 text-xs" onClick={submitQuestion}>Send Query</Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-content-muted mb-1.5 ml-1">Business</label>
              <select 
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-sm text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                required
              >
                <option value="">Select a business...</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.business_name}</option>
                ))}
              </select>
            </div>

            {selectedBusiness && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-content-muted mb-1.5 ml-1">Timing</label>
                <select 
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-sm text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                  value={selectedTiming}
                  onChange={(e) => setSelectedTiming(e.target.value)}
                  required
                >
                  <option value="">Select timing...</option>
                  {timings.map(t => {
                    const isSubmitted = todaySubmissions.includes(t.id);
                    return (
                      <option key={t.id} value={t.id} disabled={isSubmitted}>
                        {t.timing_name} {isSubmitted ? '(Submitted)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {selectedBusiness && (
            <div className="rounded-xl border border-brand-warning/30 bg-brand-warning/5 p-4 flex items-start gap-3 text-brand-warning animate-fade-in">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-brand-warning" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">Reporting Period Reminder</p>
                <p className="text-xs text-content-secondary mt-1">
                  {selectedTiming ? (
                    (() => {
                      const parseTime = (timeStr) => {
                        try {
                          const [time, ampm] = timeStr.split(' ');
                          let [h, m] = time.split(':').map(Number);
                          if (ampm === 'PM' && h !== 12) h += 12;
                          if (ampm === 'AM' && h === 12) h = 0;
                          return h * 60 + m;
                        } catch (e) {
                          return 0;
                        }
                      };
                      const sortedTimings = [...timings].sort((a, b) => parseTime(a.timing_name) - parseTime(b.timing_name));
                      const selectedIndex = sortedTimings.findIndex(t => t.id === selectedTiming);
                      const selectedTimingObj = sortedTimings[selectedIndex];
                      if (selectedIndex > 0) {
                        const prevTimingObj = sortedTimings[selectedIndex - 1];
                        return `Please report only the callings and activities done between ${prevTimingObj.timing_name} and ${selectedTimingObj.timing_name}. Do NOT include any callings or activities done before ${prevTimingObj.timing_name}.`;
                      } else if (selectedIndex === 0) {
                        return `Please report only the callings and activities done today up to ${selectedTimingObj.timing_name}. Do NOT include any previous days' activities.`;
                      }
                      return 'Please report only the activities done within this scheduled time slot interval. Do not include activities from before this slot.';
                    })()
                  ) : (
                    'Please report only the activities performed between your previous time slot and the selected time slot. Do not include cumulative numbers.'
                  )}
                </p>
              </div>
            </div>
          )}

          {selectedBusiness && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-content-muted mb-1.5 ml-1">Activity Type</label>
              <select 
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-sm text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                value={selectedActivity}
                onChange={(e) => setSelectedActivity(e.target.value)}
                required
              >
                <option value="">Select activity...</option>
                {activityTypes.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {fields.length > 0 && (
            <div className="mt-8 pt-6 border-t border-dark-border animate-fade-in">
              <h3 className="text-base font-bold text-content-primary mb-6 flex items-center gap-2 uppercase tracking-widest border-l-2 border-brand-primary pl-3">
                Report Details
              </h3>
              <div className="grid grid-cols-1 gap-5">
                {fields.map(field => (
                  <div key={field.id} className="space-y-1">
                    {field.field_type === 'textarea' ? (
                      <div className="w-full">
                        <label className="block text-[13px] font-medium text-content-secondary mb-1">{field.field_name}</label>
                        <textarea
                          className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-sm text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary min-h-[100px] transition-colors"
                          {...register(`field_${field.id}`, { required: true })}
                        />
                      </div>
                    ) : field.field_type === 'number' ? (
                      <Input
                        label={field.field_name}
                        type="number"
                        className="h-10"
                        {...register(`field_${field.id}`, { required: true })}
                      />
                    ) : (
                      <Input
                        label={field.field_name}
                        type="text"
                        className="h-10"
                        {...register(`field_${field.id}`, { required: true })}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button type="submit" className="w-full h-11" isLoading={submitting}>
                  Submit Report
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SubmitReport;
