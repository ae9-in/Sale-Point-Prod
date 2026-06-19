import axiosInstance from './axiosInstance';

export const startBreak = async (breakType, reason, estimatedDuration) => {
  const response = await axiosInstance.post('/breaks/start', { breakType, reason, estimatedDuration });
  return response.data;
};

export const requestEmergencyBreak = async (reason, estimatedDuration) => {
  const response = await axiosInstance.post('/breaks/emergency/request', { reason, estimatedDuration });
  return response.data;
};

export const startEmergencyBreak = async () => {
  const response = await axiosInstance.post('/breaks/emergency/start');
  return response.data;
};

export const endBreak = async () => {
  const response = await axiosInstance.post('/breaks/end');
  return response.data;
};

export const getActiveBreak = async () => {
  const response = await axiosInstance.get('/breaks/active');
  return response.data;
};

export const getTodayHistory = async () => {
  const response = await axiosInstance.get('/breaks/history/today');
  return response.data;
};

// Admin Endpoints
export const getAdminActiveBreaks = async () => {
  const response = await axiosInstance.get('/breaks/admin/active');
  return response.data;
};

export const getAdminPendingRequests = async () => {
  const response = await axiosInstance.get('/breaks/admin/requests');
  return response.data;
};

export const getAdminTodayHistory = async () => {
  const response = await axiosInstance.get('/breaks/admin/history');
  return response.data;
};

export const adminDecideEmergency = async (id, decision) => {
  const response = await axiosInstance.patch(`/breaks/admin/decide/${id}`, { decision });
  return response.data;
};

export const sendOverageAlert = async () => {
  const response = await axiosInstance.post('/breaks/overage-alert');
  return response.data;
};
