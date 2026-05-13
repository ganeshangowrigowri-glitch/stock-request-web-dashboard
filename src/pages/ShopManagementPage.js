import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button,
  TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Switch, Tooltip, Divider, Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { getShops, addShop, updateShop, deleteShop, updateShopAccess } from '../api/index';

// ─── helpers ──────────────────────────────────────────────────────────────── 
const today = () => new Date().toISOString().split('T')[0];

/**
 * Returns the live access status of a shop based on DB fields.
 *  'active'   – enabled + inside date window (or no dates set)
 *  'expired'  – end_date passed
 *  'pending'  – start_date in the future
 *  'disabled' – access_enabled = false
 */
function getAccessStatus(shop) {
  if (!shop.access_enabled) return 'disabled';
  const now = today();
  if (shop.access_end_date && now > shop.access_end_date) return 'expired';
  if (shop.access_start_date && now < shop.access_start_date) return 'pending';
  return 'active';
}

const STATUS_META = {
  active:   { label: 'Active',   color: 'success' },
  expired:  { label: 'Expired',  color: 'error'   },
  pending:  { label: 'Pending',  color: 'warning' },
  disabled: { label: 'Disabled', color: 'default' },
};

// ─── component ───────────────────────────────────────────────────────────────
export default function ShopManagementPage() {
  const [shops, setShops]           = useState([]);
  const [openAdd, setOpenAdd]       = useState(false);
  const [openEdit, setOpenEdit]     = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openAccess, setOpenAccess] = useState(false);
  const [newName, setNewName]       = useState('');
  const [editName, setEditName]     = useState('');
  const [selectedShop, setSelectedShop] = useState(null);
  const [loading, setLoading]       = useState(false);

  // access-control form state
  const [accessEnabled, setAccessEnabled] = useState(true);
  const [accessStart, setAccessStart]     = useState('');
  const [accessEnd, setAccessEnd]         = useState('');

  useEffect(() => { fetchShops(); }, []);

  const fetchShops = async () => {
    try {
      const data = await getShops();
      setShops(data);
    } catch (error) {
      console.error(error);
    }
  };

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      setLoading(true);
      await addShop(newName.trim());
      setNewName('');
      setOpenAdd(false);
      fetchShops();
    } catch {
      alert('Failed to add shop');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editName.trim()) return;
    try {
      setLoading(true);
      await updateShop(selectedShop.id, editName.trim());
      setOpenEdit(false);
      fetchShops();
    } catch {
      alert('Failed to update shop');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteShop(selectedShop.id);
      setOpenDelete(false);
      fetchShops();
    } catch {
      alert('Failed to delete shop');
    } finally {
      setLoading(false);
    }
  };

  // ── Access control handler ─────────────────────────────────────────────────
  const openAccessDialog = (shop) => {
    setSelectedShop(shop);
    setAccessEnabled(shop.access_enabled ?? true);
    setAccessStart(shop.access_start_date ?? '');
    setAccessEnd(shop.access_end_date ?? '');
    setOpenAccess(true);
  };

  const handleSaveAccess = async () => {
    try {
      setLoading(true);
      await updateShopAccess(selectedShop.id, {
        access_enabled:    accessEnabled,
        access_start_date: accessStart || null,
        access_end_date:   accessEnd   || null,
      });
      setOpenAccess(false);
      fetchShops();
    } catch {
      alert('Failed to update access settings');
    } finally {
      setLoading(false);
    }
  };

  // ── Quick-toggle enable/disable directly from table ────────────────────────
  const handleQuickToggle = async (shop) => {
  try {
    await updateShopAccess(shop.id, {
      access_enabled: !shop.access_enabled,
      access_start_date: null,  // ← clear dates when toggling
      access_end_date: null,    // ← clear dates when toggling
    });
    fetchShops();
  } catch {
    alert('Failed to toggle shop access');
  }
};

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600} color="#1a3a5c">
          Shop Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenAdd(true)}
          sx={{ backgroundColor: '#1a3a5c', fontWeight: 600 }}
        >
          Add Shop
        </Button>
      </Box>

      {/* Table */}
      <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['#', 'Shop Name', 'Access Window', 'Status', 'Actions'].map((h, idx) => (
                    <TableCell
                      key={h}
                      align={idx >= 3 ? 'center' : 'left'}
                      sx={{ backgroundColor: '#1a3a5c', color: 'white', fontWeight: 600,
                            ...(idx === 0 && { width: 50 }),
                            ...(idx === 4 && { width: 160 }) }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {shops.map((shop, i) => {
                  const status = getAccessStatus(shop);
                  const meta   = STATUS_META[status];

                  return (
                    <TableRow key={shop.id} sx={{ backgroundColor: i % 2 === 0 ? 'white' : '#f9fafb' }}>

                      {/* # */}
                      <TableCell sx={{ fontSize: 13, color: '#888' }}>{i + 1}</TableCell>

                      {/* Shop Name */}
                      <TableCell sx={{ fontSize: 14, fontWeight: 500 }}>{shop.shop_name}</TableCell>

                      {/* Access Window */}
                      <TableCell sx={{ fontSize: 12, color: '#555' }}>
                        {shop.access_start_date || shop.access_end_date ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <CalendarMonthIcon sx={{ fontSize: 14, color: '#1a3a5c' }} />
                            <span>
                              {shop.access_start_date ?? '—'} → {shop.access_end_date ?? '∞'}
                            </span>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.disabled">No limit</Typography>
                        )}
                      </TableCell>

                      {/* Status chip */}
                      <TableCell align="center">
                        <Chip
                          label={meta.label}
                          color={meta.color}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: 11 }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center">
                        {/* Quick enable/disable toggle */}
                        <Tooltip title={shop.access_enabled ? 'Disable access' : 'Enable access'}>
                          <Switch
                            size="small"
                            checked={!!shop.access_enabled}
                            onChange={() => handleQuickToggle(shop)}
                            sx={{ mr: 0.5 }}
                          />
                        </Tooltip>

                        {/* Access control (dates) */}
                        <Tooltip title="Access Control">
                          <IconButton
                            size="small"
                            onClick={() => openAccessDialog(shop)}
                            sx={{ color: '#7b68ee' }}
                          >
                            {shop.access_enabled ? <LockOpenIcon fontSize="small" /> : <LockIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>

                        {/* Edit name */}
                        <Tooltip title="Edit Name">
                          <IconButton
                            size="small"
                            onClick={() => { setSelectedShop(shop); setEditName(shop.shop_name); setOpenEdit(true); }}
                            sx={{ color: '#1a3a5c' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Delete */}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => { setSelectedShop(shop); setOpenDelete(true); }}
                            sx={{ color: '#c0392b' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {shops.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#aaa' }}>
                      No shops found. Add one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* ── Add Dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#1a3a5c', fontWeight: 600 }}>Add New Shop</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Shop Name" size="small"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAdd(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={loading || !newName.trim()}
            sx={{ backgroundColor: '#1a3a5c' }}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#1a3a5c', fontWeight: 600 }}>Edit Shop Name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Shop Name" size="small"
            value={editName} onChange={(e) => setEditName(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEdit} disabled={loading || !editName.trim()}
            sx={{ backgroundColor: '#1a3a5c' }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#c0392b', fontWeight: 600 }}>Delete Shop</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedShop?.shop_name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleDelete} disabled={loading}
            sx={{ backgroundColor: '#c0392b' }}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ── Access Control Dialog ────────────────────────────────────────────── */}
      <Dialog open={openAccess} onClose={() => setOpenAccess(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: '#1a3a5c' }}>
          Access Control — {selectedShop?.shop_name}
        </DialogTitle>

        <DialogContent>
          {/* Master enable/disable */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                     p: 1.5, borderRadius: 1, backgroundColor: '#f0f4ff', mb: 2 }}>
            <Box>
              <Typography fontWeight={600} fontSize={14}>App Access</Typography>
              <Typography fontSize={12} color="text.secondary">
                Allow this shop to send requests from the mobile app
              </Typography>
            </Box>
            <Switch
              checked={accessEnabled}
              onChange={(e) => setAccessEnabled(e.target.checked)}
              color="primary"
            />
          </Box>

          <Divider sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Date Window (optional)</Typography>
          </Divider>

          <Stack spacing={2}>
            <TextField
              label="Access Start Date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={accessStart}
              onChange={(e) => setAccessStart(e.target.value)}
              disabled={!accessEnabled}
              helperText="Leave blank for no start restriction"
            />
            <TextField
              label="Access End Date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={accessEnd}
              onChange={(e) => setAccessEnd(e.target.value)}
              disabled={!accessEnabled}
              inputProps={{ min: accessStart || today() }}
              helperText="Leave blank for no expiry"
            />
          </Stack>

          {/* Live preview */}
          {accessEnabled && (accessStart || accessEnd) && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, backgroundColor: '#fff8e1',
                       border: '1px solid #ffe082' }}>
              <Typography fontSize={12} fontWeight={600} color="#e65100" mb={0.5}>
                Preview
              </Typography>
              <Typography fontSize={12} color="#795548">
                This shop can send requests
                {accessStart ? ` from ${accessStart}` : ''}
                {accessEnd   ? ` until ${accessEnd}`   : ''}.
                {accessEnd && accessEnd < today() && (
                  <strong> ⚠️ End date is already in the past — shop will be blocked.</strong>
                )}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAccess(false)}>Cancel</Button>
          <Button
            variant="contained" onClick={handleSaveAccess} disabled={loading}
            sx={{ backgroundColor: '#1a3a5c' }}
          >
            Save Access Settings
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
