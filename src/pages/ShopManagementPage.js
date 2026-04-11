import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button,
  TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getShops, addShop, updateShop, deleteShop } from '../api/index';

export default function ShopManagementPage() {
  const [shops, setShops]           = useState([]);
  const [openAdd, setOpenAdd]       = useState(false);
  const [openEdit, setOpenEdit]     = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [newName, setNewName]       = useState('');
  const [editName, setEditName]     = useState('');
  const [selectedShop, setSelectedShop] = useState(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => { fetchShops(); }, []);

  const fetchShops = async () => {
    try {
      const data = await getShops();
      setShops(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      setLoading(true);
      await addShop(newName.trim());
      setNewName('');
      setOpenAdd(false);
      fetchShops();
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      alert('Failed to delete shop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
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

      <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
        <CardContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: '#1a3a5c', color: 'white', fontWeight: 600, width: 60 }}>#</TableCell>
                  <TableCell sx={{ backgroundColor: '#1a3a5c', color: 'white', fontWeight: 600 }}>Shop Name</TableCell>
                  <TableCell sx={{ backgroundColor: '#1a3a5c', color: 'white', fontWeight: 600, width: 120 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shops.map((shop, i) => (
                  <TableRow key={shop.id} sx={{ backgroundColor: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <TableCell sx={{ fontSize: 13, color: '#888' }}>{i + 1}</TableCell>
                    <TableCell sx={{ fontSize: 14, fontWeight: 500 }}>{shop.shop_name}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => { setSelectedShop(shop); setEditName(shop.shop_name); setOpenEdit(true); }}
                        sx={{ color: '#1a3a5c' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => { setSelectedShop(shop); setOpenDelete(true); }}
                        sx={{ color: '#c0392b' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add Dialog */}
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
          <Button
            variant="contained" onClick={handleAdd} disabled={loading || !newName.trim()}
            sx={{ backgroundColor: '#1a3a5c' }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
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
          <Button
            variant="contained" onClick={handleEdit} disabled={loading || !editName.trim()}
            sx={{ backgroundColor: '#1a3a5c' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#c0392b', fontWeight: 600 }}>Delete Shop</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedShop?.shop_name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDelete(false)}>Cancel</Button>
          <Button
            variant="contained" onClick={handleDelete} disabled={loading}
            sx={{ backgroundColor: '#c0392b' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
