import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import axios from '../../api/axiosInstance';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { MessageSquare } from 'lucide-react';

const SubmitReport = () => {
  const { user } = useAuthStore();
  const [businesses, setBusinesses] = useState([]);
  const [timings, setTimings] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [fields, setFields] = useState([]);
  
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedTiming, setSelectedTiming] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [question, setQuestion] = useState('');
  const [showQuestion, setShowQuestion] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await axios.get(`/admin/employees/${user.id}/businesses`);
        setBusinesses(res.data.data);
      } catch (err) {
        toast.error('Failed to load businesses');
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchBusinesses();
  }, [user]);

  useEffect(() => {
    if (!selectedBusiness) {
      setTimings([]); setActivityTypes([]); setFields([]); return;
    }
    const fetchBizData = async () => {
      try {
        const [timingsRes, activitiesRes] = await Promise.all([
          axios.get(`/businesses/${selectedBusiness}/timings`),
          axios.get(`/businesses/${selectedBusiness}/activity-types`)
        ]);
        setTimings(timingsRes.data.data);
        setActivityTypes(activitiesRes.data.data);
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
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-content-primary">Submit Daily Report</h1>
        <p className="text-content-secondary mt-1">Log your field activities and performance data.</p>
      </div>

      <div className="card p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-content-primary">Need help with this business?</h2>
            <p className="text-sm text-content-secondary">Send a query to admin for the selected business.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setShowQuestion((value) => !value)}>
            <MessageSquare className="mr-2 h-4 w-4" />
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
              <Button type="button" variant="secondary" onClick={() => setShowQuestion(false)}>Cancel</Button>
              <Button type="button" onClick={submitQuestion}>Send Query</Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Business</label>
              <select 
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
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
                <label className="block text-sm font-medium text-content-secondary mb-1">Timing</label>
                <select 
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                  value={selectedTiming}
                  onChange={(e) => setSelectedTiming(e.target.value)}
                  required
                >
                  <option value="">Select timing...</option>
                  {timings.map(t => (
                    <option key={t.id} value={t.id}>{t.timing_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedBusiness && (
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Activity Type</label>
              <select 
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
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
              <h3 className="text-lg font-medium text-content-primary mb-6">Activity Details</h3>
              <div className="space-y-6">
                {fields.map(field => (
                  <div key={field.id}>
                    {field.field_type === 'textarea' ? (
                      <div className="w-full">
                        <label className="block text-sm font-medium text-content-secondary mb-1">{field.field_name}</label>
                        <textarea
                          className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-content-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary min-h-[100px] transition-colors"
                          {...register(`field_${field.id}`, { required: true })}
                        />
                      </div>
                    ) : field.field_type === 'number' ? (
                      <Input
                        label={field.field_name}
                        type="number"
                        {...register(`field_${field.id}`, { required: true })}
                      />
                    ) : (
                      <Input
                        label={field.field_name}
                        type="text"
                        {...register(`field_${field.id}`, { required: true })}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Button type="submit" className="w-full" isLoading={submitting}>
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
