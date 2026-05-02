import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Chip, TextField, MenuItem, CircularProgress, Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getAllRequests, deleteRequest, clearOldRequests } from '../api/index';

const STATUS_COLORS = {
  pending:  { bg: '#fff3cd', color: '#856404', label: 'Pending' },
  approved: { bg: '#d1e7dd', color: '#0f5132', label: 'Approved' },
  rejected: { bg: '#f8d7da', color: '#842029', label: 'Rejected' },
  received: { bg: '#e8f0f7', color: '#1a3a5c', label: 'Received' },
};

async function getNoOrderShops(filter, category_name) {
  const params = new URLSearchParams();
  if (filter && filter !== 'all')               params.append('filter', filter);
  if (category_name && category_name !== 'all') params.append('category_name', category_name);
  const res = await fetch(
    `https://stock-request-system-backend-production.up.railway.app/api/requests/no-order?${params.toString()}`
  );
  if (!res.ok) throw new Error('Failed to fetch no-order shops');
  return res.json();
}

export default function RequestsPage() {
  const [requests, setRequests]             = useState([]);
  const [noOrderShops, setNoOrderShops]     = useState([]);
  const [loading, setLoading]               = useState(true);
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTime, setFilterTime]         = useState('all');
  const [search, setSearch]                 = useState('');
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

  // ✅ defined BEFORE the useEffect that uses it
  const fetchNoOrderShops = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNoOrderShops(filterTime, filterCategory);
      setNoOrderShops(data);
    } catch (error) {
      console.error('No order fetch error:', error);
      setNoOrderShops([]);
    } finally {
      setLoading(false);
    }
  }, [filterTime, filterCategory]);

  // ✅ placed AFTER fetchNoOrderShops definition
  useEffect(() => {
    if (filterStatus === 'no-order') {
      fetchNoOrderShops();
    }
  }, [filterStatus, fetchNoOrderShops]);

  const handleDelete = async (id) => {
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

  const filtered = requests.filter(r => {
    const matchStatus   = filterStatus === 'all' || r.status === filterStatus;
    const matchCategory = filterCategory === 'all' || r.category_name === filterCategory;
    const matchSearch   = r.shop_name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchCategory && matchSearch;
  });

  const categories = [...new Set(requests.map(r => r.category_name))];

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const isNoOrder = filterStatus === 'no-order';

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      <Typography variant="h5" fontWeight={600} mb={3} color="#1a3a5c">
        Request Management
      </Typography>

      <Card sx={{ borderRadius: 2, boxShadow: 1, mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>

            {!isNoOrder && (
              <TextField
                label="Search by shop name" size="small" value={search}
                onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }}
              />
            )}

            <TextField
              select label="Status" size="small" value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)} sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="received">Received</MenuItem>
              <MenuItem value="no-order">No Order</MenuItem>
            </TextField>

            <TextField
              select label="Category" size="small" value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)} sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>

            {isNoOrder && (
              <TextField
                select label="Time Period" size="small" value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)} sx={{ minWidth: 140 }}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </TextField>
            )}

            <Button
              variant="outlined" color="error" size="small"
              onClick={handleClearOld} sx={{ fontWeight: 600, ml: 'auto' }}
            >
              Clear Old Requests
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>

          ) : isNoOrder ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#1a3a5c' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Bar Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {noOrderShops.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                        All shops have placed orders for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    noOrderShops.map((shop, index) => (
                      <TableRow key={shop.shop_id} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{shop.shop_name}</TableCell>
                        <TableCell>
                          <Chip
                            label="No Order"
                            size="small"
                            sx={{ backgroundColor: '#f0f0f0', color: '#555', fontWeight: 600 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#1a3a5c' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Bar Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((req, index) => {
                    const status = STATUS_COLORS[req.status] || STATUS_COLORS.pending;
                    return (
                      <TableRow key={req.id} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{req.shop_name}</TableCell>
                        <TableCell>{req.category_name}</TableCell>
                        <TableCell>{formatDate(req.submitted_at)}</TableCell>
                        <TableCell>
                          <Chip label={status.label} size="small"
                            sx={{ backgroundColor: status.bg, color: status.color, fontWeight: 600 }} />
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
                              onClick={() => handleDelete(req.id)}
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