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
  const [filterStatus, setFilterStatus]     = useState(() => sessionStorage.getItem('req_filterStatus') || 'all');
  const [filterCategory, setFilterCategory] = useState(() => sessionStorage.getItem('req_filterCategory') || 'all');
  const [filterTime, setFilterTime]         = useState(() => sessionStorage.getItem('req_filterTime') || 'all');
  const [search, setSearch]                 = useState(() => sessionStorage.getItem('req_search') || '');
  const [selected, setSelected]             = useState([]);
  const [deletedRequests, setDeletedRequests] = useState([]);
  const [undoTimer, setUndoTimer]           = useState(null);
  const [showUndo, setShowUndo]             = useState(false);

  // ── NEW: multi-date filter ──────────────────────────────────────────────────
  const [filterDates, setFilterDates] = useState(() => JSON.parse(sessionStorage.getItem('req_filterDates') || '[]'));// array of 'YYYY-MM-DD' strings
  const [dateInput, setDateInput]     = useState(''); // controlled input value
useEffect(() => {
  sessionStorage.setItem('req_filterStatus', filterStatus);
  sessionStorage.setItem('req_filterCategory', filterCategory);
  sessionStorage.setItem('req_filterTime', filterTime);
  sessionStorage.setItem('req_search', search);
  sessionStorage.setItem('req_filterDates', JSON.stringify(filterDates));
}, [filterStatus, filterCategory, filterTime, search, filterDates]);


  const handleAddDate = () => {
    const val = dateInput.trim();
    if (!val) return;
    if (!filterDates.includes(val)) {
      setFilterDates(prev => [...prev, val]);
    }
    setDateInput('');
  };

  const handleRemoveDate = (date) => {
    setFilterDates(prev => prev.filter(d => d !== date));
  };

  const handleDateKeyDown = (e) => {
    if (e.key === 'Enter') handleAddDate();
  };
  // ───────────────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (filterStatus === 'no-order') {
      fetchNoOrderShops();
    }
  }, [filterStatus, fetchNoOrderShops]);

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

    // ── NEW: date filter ──────────────────────────────────────────────────────
    const matchDate = filterDates.length === 0 ||
      filterDates.includes(new Date(r.submitted_at).toISOString().slice(0, 10));
    // ─────────────────────────────────────────────────────────────────────────

    return matchStatus && matchCategory && matchSearch && matchDate;
  });

  const categories = [...new Set(requests.map(r => r.category_name))];

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  // Helper: format 'YYYY-MM-DD' → '2 Jun 2026' for chip labels
  const formatChipDate = (iso) => {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const isNoOrder = filterStatus === 'no-order';

  const handleRowClick = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} selected request(s)?`)) return;
    const toDelete = requests.filter(r => selected.includes(r.id));
    setDeletedRequests(toDelete);
    setRequests(prev => prev.filter(r => !selected.includes(r.id)));
    setSelected([]);
    setShowUndo(true);
    if (undoTimer) clearTimeout(undoTimer);
    const timer = setTimeout(async () => {
      try {
        await Promise.all(toDelete.map(r => deleteRequest(r.id)));
      } catch (error) {
        console.error(error);
      }
      setShowUndo(false);
      setDeletedRequests([]);
    }, 30000);
    setUndoTimer(timer);
  };

  const handleUndo = () => {
    if (undoTimer) clearTimeout(undoTimer);
    setRequests(prev => [...deletedRequests, ...prev]);
    setDeletedRequests([]);
    setShowUndo(false);
    setUndoTimer(null);
  };

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

            {/* ── NEW: Date filter (only shown outside no-order view) ─────── */}
            {!isNoOrder && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <TextField
                  label="Filter by date" type="date" size="small"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  onKeyDown={handleDateKeyDown}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />
                <Button
                  variant="outlined" size="small"
                  onClick={handleAddDate}
                  disabled={!dateInput}
                  sx={{ fontWeight: 600, borderColor: '#1a3a5c', color: '#1a3a5c',
                        '&:hover': { borderColor: '#1a3a5c', backgroundColor: '#e8f0f7' } }}
                >
                  Add
                </Button>

                {/* Chips for each selected date */}
                {filterDates.map(date => (
                  <Chip
                    key={date}
                    label={formatChipDate(date)}
                    size="small"
                    onDelete={() => handleRemoveDate(date)}
                    sx={{ backgroundColor: '#e8f0f7', color: '#1a3a5c', fontWeight: 600 }}
                  />
                ))}

                {filterDates.length > 0 && (
                  <Button
                    size="small" variant="text"
                    onClick={() => setFilterDates([])}
                    sx={{ fontSize: 11, color: '#842029', textTransform: 'none', p: 0 }}
                  >
                    Clear dates
                  </Button>
                )}
              </Box>
            )}
            {/* ─────────────────────────────────────────────────────────────── */}

            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
              {selected.length > 0 && (
                <Button
                  variant="contained" color="error" size="small"
                  onClick={handleDeleteSelected} sx={{ fontWeight: 600 }}
                >
                  Delete Selected ({selected.length})
                </Button>
              )}
              <Button
                variant="outlined" color="error" size="small"
                onClick={handleClearOld} sx={{ fontWeight: 600 }}
              >
                Clear Old Requests
              </Button>
            </Box>
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
                            label="No Order" size="small"
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
                      <TableRow
                        key={req.id} hover
                        onClick={() => handleRowClick(req.id)}
                        sx={{
                          cursor: 'pointer',
                          backgroundColor: selected.includes(req.id) ? '#eef2ff' : 'inherit',
                          outline: selected.includes(req.id) ? '2px solid #1a3a5c' : 'none',
                          outlineOffset: '-2px',
                        }}
                      >
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{req.shop_name}</TableCell>
                        <TableCell>{req.category_name}</TableCell>
                        <TableCell>{formatDate(req.submitted_at)}</TableCell>
                        <TableCell>
                          <Chip label={status.label} size="small"
                            sx={{ backgroundColor: status.bg, color: status.color, fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2" color="#1a3a5c" fontWeight={600}
                            sx={{ cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); navigate(`/requests/${req.id}`, { state: { request: req } }); }}
                          >
                            View
                          </Typography>
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

      {showUndo && (
        <Box sx={{
          position: 'fixed', bottom: 24, left: 24,
          backgroundColor: '#1a3a5c', color: 'white', borderRadius: 1.5,
          px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5,
          boxShadow: 3, zIndex: 9999,
        }}>
          <Typography fontSize={12}>
            {deletedRequests.length} deleted.
          </Typography>
          <Button
            size="small" variant="contained"
            onClick={handleUndo}
            sx={{ backgroundColor: '#fff', color: '#1a3a5c', fontWeight: 700,
                  fontSize: 11, py: 0.3, px: 1.2, minWidth: 'unset',
                  '&:hover': { backgroundColor: '#e8f0f7' } }}
          >
            UNDO
          </Button>
          <Typography fontSize={11} sx={{ opacity: 0.6 }}>(30s)</Typography>
        </Box>
      )}
    </Box>
  );
}
