import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { FileText, Eye, X, Calendar, Clock, Building2 } from 'lucide-react';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchMyReports();
    const interval = setInterval(() => {
      fetchMyReports(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyReports = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await axios.get('/reports');
      setReports(res.data.data);
    } catch (err) {
      if (!isSilent) toast.error('Failed to load your reports');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      setLoadingDetails(true);
      const res = await axios.get(`/reports/${reportId}`);
      setSelectedReport(res.data.data);
    } catch (err) {
      toast.error('Failed to load report details');
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm font-medium text-content-secondary animate-pulse">Loading your report history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">My Submitted Reports</h1>
        <p className="text-content-secondary mt-1">Review the history of your submitted daily performance logs.</p>
      </div>

      <div className="card overflow-hidden">
        {reports.length === 0 ? (
          <div className="p-12 text-center text-content-muted">
            You haven't submitted any performance reports yet. Go to "Submit Report" to log your activity.
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Business Name</Th>
                <Th>Timing Window</Th>
                <Th>Activity Category</Th>
                <Th>Submission Date</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {reports.map((rep) => (
                <Tr key={rep.id}>
                  <Td className="font-semibold text-content-primary">{rep.business_name}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-content-secondary">
                      <Clock className="w-4 h-4 text-brand-secondary" />
                      <span>{rep.timing_name}</span>
                    </div>
                  </Td>
                  <Td className="text-content-secondary">{rep.activity_name}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-content-secondary">
                      <Calendar className="w-4 h-4 text-content-muted" />
                      <span>{new Date(rep.report_date).toLocaleDateString()}</span>
                    </div>
                  </Td>
                  <Td className="text-right">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => handleViewReport(rep.id)}
                    >
                      <Eye className="w-4 h-4 mr-1.5" />
                      View Details
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-6 bg-dark-surface border border-dark-border shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute right-4 top-4 text-content-muted hover:text-content-primary p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-content-primary mb-6 flex items-center gap-2 border-b border-dark-border pb-3">
              <FileText className="w-5.5 h-5.5 text-brand-primary" />
              Report Submission Details
            </h3>

            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-12">
                <Spinner size="lg" />
                <p className="text-sm text-content-secondary animate-pulse">Loading report details...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-dark-bg p-4 rounded-lg border border-dark-border text-xs">
                  <div className="space-y-1">
                    <div className="text-content-muted uppercase tracking-wider font-semibold">Business</div>
                    <div className="text-content-primary font-medium flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                      {selectedReport.business_name}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-content-muted uppercase tracking-wider font-semibold">Timing Window</div>
                    <div className="text-content-primary font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-brand-secondary" />
                      {selectedReport.timing_name}
                    </div>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="text-content-muted uppercase tracking-wider font-semibold">Activity Sub-Type</div>
                    <div className="text-content-primary font-medium flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-brand-primary" />
                      {selectedReport.activity_name}
                    </div>
                  </div>
                  <div className="space-y-1 mt-2">
                    <div className="text-content-muted uppercase tracking-wider font-semibold">Date Submitted</div>
                    <div className="text-content-primary font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-content-muted" />
                      {new Date(selectedReport.report_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-content-primary uppercase tracking-wider border-b border-dark-border pb-1">Your Answers</h4>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {selectedReport.answers?.map((ans, idx) => (
                      <div key={idx} className="bg-dark-bg/40 p-3 rounded-lg border border-dark-border/50">
                        <div className="text-xs text-content-muted font-medium mb-1">{ans.field_name}</div>
                        <div className="text-sm text-content-primary font-semibold">
                          {ans.field_type === 'textarea' ? (
                            <p className="whitespace-pre-wrap font-normal text-content-secondary leading-relaxed">{ans.value || 'N/A'}</p>
                          ) : (
                            ans.value || 'N/A'
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-dark-border">
                  <Button variant="secondary" onClick={() => setSelectedReport(null)}>Close</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
