import { useState, useEffect } from 'react';
import axios from '../../api/axiosInstance';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { Check, X, Mail, Phone, Calendar } from 'lucide-react';

const Approvals = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await axios.get('/admin/users?status=PENDING');
      setPendingUsers(res.data.data);
    } catch (err) {
      if (!isSilent) toast.error('Failed to load pending registrations');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(() => {
      fetchPending(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id) => {
    try {
      await axios.patch(`/admin/users/${id}/approve`);
      toast.success('Registration approved');
      fetchPending();
    } catch (err) {
      toast.error('Failed to approve registration');
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject this registration?')) return;
    try {
      await axios.patch(`/admin/users/${id}/reject`);
      toast.success('Registration rejected');
      fetchPending();
    } catch (err) {
      toast.error('Failed to reject registration');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-content-primary">Pending Approvals</h1>
        <p className="text-content-secondary mt-1">Review and approve new employee registrations.</p>
      </div>

      <div className="card motion-card motion-sheen overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email & Phone</Th>
                <Th>Registration Date</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pendingUsers.map((user) => (
                <Tr key={user.id}>
                  <Td className="font-semibold text-content-primary">{user.name}</Td>
                  <Td>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-content-secondary">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{user.email}</span>
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-1.5 text-content-muted">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-content-muted" />
                      <span>{new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleReject(user.id)}
                        className="border-brand-danger/30 text-brand-danger hover:bg-brand-danger/10 hover:border-brand-danger"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleApprove(user.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
              {pendingUsers.length === 0 && (
                <Tr>
                  <Td colSpan={4} className="text-center text-content-muted py-8">
                    No pending registration requests.
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Approvals;



