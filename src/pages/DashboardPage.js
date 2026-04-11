import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, CircularProgress, Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getAllRequests, deleteRequest, clearOldRequests } from '../api/index';

const STATUS_COLORS = {
  pending: { bg: '#fff3cd', color: '#856404', label: 'Pending' },
  approved: { bg: '#d1e7dd', color: '#0f5132', label: 'Approved' },
  rejected: { bg: '#f8d7da', color: '#842029', label: 'Rejected' },
  received: { bg: '#e8f0f7', color: '#1a3a5c', label: 'Received' },
};

export default function DashboardPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      const data = await getAllRequests();
      setRequests(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Delete this request?')) return;
    try {
      await deleteRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleClearOld = async () => {
    if (!window.confirm('Clear all requests older than 30 days?')) return;
    try {
      await clearOldRequests();
      fetchRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const today = new Date().toDateString();
const todayRequests = requests.filter(r => new Date(r.submitted_at).toDateString() === today);
const pending = todayRequests.filter(r => r.status === 'pending').length;
const approved = todayRequests.filter(r => r.status === 'approved').length;
const rejected = todayRequests.filter(r => r.status === 'rejected').length;

  const stats = [
    { label: 'Total Requests Today', value: todayRequests.length, color: '#1a3a5c', bg: '#e8f0f7' },
    { label: 'Pending Requests', value: pending, color: '#856404', bg: '#fff3cd' },
    { label: 'Approved Requests', value: approved, color: '#0f5132', bg: '#d1e7dd' },
    { label: 'Rejected Requests', value: rejected, color: '#842029', bg: '#f8d7da' },
  ];

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const recentRequests = requests.slice(0, 10);

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      <Typography variant="h5" fontWeight={600} mb={3} color="#1a3a5c">Dashboard</Typography>

      <Grid container spacing={2} mb={4}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
              <CardContent sx={{ backgroundColor: stat.bg }}>
                <Typography variant="h3" fontWeight={700} color={stat.color}>{stat.value}</Typography>
                <Typography variant="body2" color={stat.color} fontWeight={500}>{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600} color="#1a3a5c">Recent Requests</Typography>
            <Button
              variant="outlined" size="small" color="error"
              onClick={handleClearOld}
              sx={{ fontWeight: 600 }}
            >
              Clear Old Requests
            </Button>
          </Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#1a3a5c' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Bar Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentRequests.map((req) => {
                    const status = STATUS_COLORS[req.status] || STATUS_COLORS.pending;
                    return (
                      <TableRow key={req.id} hover>
                        <TableCell>{req.shop_name}</TableCell>
                        <TableCell>{req.category_name}</TableCell>
                        <TableCell>{formatDate(req.submitted_at)}</TableCell>
                        <TableCell>
                          <Chip label={status.label} size="small" sx={{ backgroundColor: status.bg, color: status.color, fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Typography
                              variant="body2" color="#1a3a5c" fontWeight={600}
                              sx={{ cursor: 'pointer' }}
                              onClick={() => navigate(`/requests/${req.id}`, { state: { request: req } })}
                            >
                              View
                            </Typography>
                            <Typography variant="body2" color="text.secondary">|</Typography>
                            <Typography
                              variant="body2" color="error" fontWeight={600}
                              sx={{ cursor: 'pointer' }}
                              onClick={() => handleDeleteRequest(req.id)}
                            >
                              Delete
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
