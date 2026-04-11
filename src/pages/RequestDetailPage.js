import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, TextField, CircularProgress, Alert,
} from '@mui/material';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getRequestById, approveRequest, rejectRequest } from '../api/index';

const STATUS_COLORS = {
  pending: { bg: '#fff3cd', color: '#856404', label: 'Pending' },
  approved: { bg: '#d1e7dd', color: '#0f5132', label: 'Approved' },
  rejected: { bg: '#f8d7da', color: '#842029', label: 'Rejected' },
  received: { bg: '#e8f0f7', color: '#1a3a5c', label: 'Received' },
};

export default function RequestDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvedValues, setApprovedValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const request = location.state?.request;

  useEffect(() => {
    fetchDetail();
  }, []);

  const fetchDetail = async () => {
    try {
      const data = await getRequestById(id);
      setDetail(data);
      const initial = {};
      data.items.forEach(item => {
        initial[item.id] = {
          approved_1: item.approved_1 || 0,
          approved_2: item.approved_2 || 0,
          approved_3: item.approved_3 || 0,
          approved_4: item.approved_4 || 0,
          approved_5: item.approved_5 || 0,
        };
      });
      setApprovedValues(initial);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      const items = Object.entries(approvedValues).map(([itemId, vals]) => ({
        id: parseInt(itemId), ...vals,
      }));
      await approveRequest(id, items);
      setMessage('Request approved successfully!');
      setTimeout(() => navigate('/requests'), 1500);
    } catch (error) {
      setMessage('Error approving request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    try {
      setSubmitting(true);
      await rejectRequest(id);
      setMessage('Request rejected!');
      setTimeout(() => navigate('/requests'), 1500);
    } catch (error) {
      setMessage('Error rejecting request');
    } finally {
      setSubmitting(false);
    }
  };

  const getColumns = (categoryType) => {
    if (categoryType === 'beer') return ['625ml Btl', '500ml Cane', '330ml Cane', '500ml Btl', '325ml Btl'];
    return ['Q', 'P', 'N'];
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
      <CircularProgress />
    </Box>
  );

  const req = detail?.request;
  const items = detail?.items || [];
  const columns = getColumns(req?.category_type);
  const status = STATUS_COLORS[req?.status] || STATUS_COLORS.pending;
  const colCount = columns.length;

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button variant="outlined" onClick={() => navigate('/requests')} sx={{ borderColor: '#1a3a5c', color: '#1a3a5c' }}>
          ← Back
        </Button>
        <Typography variant="h5" fontWeight={600} color="#1a3a5c">
          Request Detail
        </Typography>
      </Box>

      {message && <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mb: 2 }}>{message}</Alert>}

      <Card sx={{ borderRadius: 2, boxShadow: 1, mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box><Typography variant="body2" color="text.secondary">Bar Name</Typography>
              <Typography fontWeight={600}>{req?.shop_name}</Typography></Box>
            <Box><Typography variant="body2" color="text.secondary">Category</Typography>
              <Typography fontWeight={600}>{req?.category_name}</Typography></Box>
            <Box><Typography variant="body2" color="text.secondary">Date</Typography>
              <Typography fontWeight={600}>{formatDate(req?.submitted_at)}</Typography></Box>
            <Box><Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label={status.label} size="small" sx={{ backgroundColor: status.bg, color: status.color, fontWeight: 600 }} /></Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, boxShadow: 1, mb: 2 }}>
        <CardContent>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ backgroundColor: '#1a3a5c', color: 'white', fontWeight: 600, minWidth: 160 }}>Brand Name</TableCell>
                  <TableCell colSpan={colCount} align="center" sx={{ backgroundColor: '#2a5278', color: 'white', fontWeight: 600 }}>Present Stock</TableCell>
                  <TableCell colSpan={colCount} align="center" sx={{ backgroundColor: '#0e3d5c', color: 'white', fontWeight: 600 }}>Request Stock</TableCell>
                  <TableCell colSpan={colCount} align="center" sx={{ backgroundColor: '#1a5c3d', color: 'white', fontWeight: 600 }}>Approved Stock</TableCell>
                </TableRow>
                <TableRow>
                  {[...columns, ...columns, ...columns].map((col, i) => (
                    <TableCell key={i} align="center" sx={{
                      backgroundColor: i < colCount ? '#2a5278' : i < colCount * 2 ? '#0e3d5c' : '#1a5c3d',
                      color: 'white', fontSize: 11, fontWeight: 500,
                    }}>{col}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, bi) => (
                  <TableRow key={item.id} sx={{ backgroundColor: bi % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <TableCell sx={{ fontWeight: 500, fontSize: 12 }}>{item.brand_name}</TableCell>
                    {[item.present_1, item.present_2, item.present_3, item.present_4, item.present_5].slice(0, colCount).map((v, i) => (
                      <TableCell key={`p${i}`} align="center" sx={{ fontSize: 12 }}>{v}</TableCell>
                    ))}
                    {[item.request_1, item.request_2, item.request_3, item.request_4, item.request_5].slice(0, colCount).map((v, i) => (
                      <TableCell key={`r${i}`} align="center" sx={{ fontSize: 12, backgroundColor: 'rgba(26,58,92,0.04)' }}>{v}</TableCell>
                    ))}
                    {['approved_1', 'approved_2', 'approved_3', 'approved_4', 'approved_5'].slice(0, colCount).map((key, i) => (
                      <TableCell key={`a${i}`} align="center" sx={{ backgroundColor: 'rgba(46,125,50,0.06)' }}>
                        {req?.status === 'pending' ? (
                          <TextField
                            size="small" type="number"
                            value={approvedValues[item.id]?.[key] || 0}
                            onChange={(e) => setApprovedValues(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], [key]: parseInt(e.target.value) || 0 }
                            }))}
                            inputProps={{ min: 0, style: { textAlign: 'center', padding: '4px', width: '50px', fontSize: 12 } }}
                          />
                        ) : (
                          <Typography fontSize={12} color="success.main" fontWeight={600}>
                            {item[key]}
                          </Typography>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {req?.status === 'pending' && (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined" color="error" onClick={handleReject}
            disabled={submitting} sx={{ fontWeight: 600 }}
          >
            Reject Request
          </Button>
          <Button
            variant="contained" onClick={handleApprove}
            disabled={submitting}
            sx={{ backgroundColor: '#1a5c3d', fontWeight: 600 }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Approve Request'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
