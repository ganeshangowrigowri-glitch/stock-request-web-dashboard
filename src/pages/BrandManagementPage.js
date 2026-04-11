import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Button,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, CircularProgress, Alert,
} from '@mui/material';
import { getAllBrands, updateBrand, addBrand, deleteBrand, getAllPrices, updatePrice, getCategories } from '../api/index';

export default function BrandManagementPage() {
  const [brands, setBrands] = useState([]);
  const [prices, setPrices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [editBrand, setEditBrand] = useState(null);
  const [editPrices, setEditPrices] = useState([]);
  const [addDialog, setAddDialog] = useState(false);
  const [newBrand, setNewBrand] = useState({ brand_name: '', category_id: '' });
  const [newPrices, setNewPrices] = useState([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [brandsData, pricesData, catsData] = await Promise.all([
        getAllBrands(), getAllPrices(), getCategories(),
      ]);
      setBrands(brandsData);
      setPrices(pricesData);
      setCategories(catsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getBrandPrices = (brandId) => prices.filter(p => p.brand_id === brandId);

  const getCategoryType = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.category_type || 'qpn';
  };

  const getSizeTypes = (categoryId) => {
    const type = getCategoryType(parseInt(categoryId));
    return type === 'beer'
      ? ['625ml Btl', '500ml Cane', '330ml Cane', '500ml Btl', '325ml Btl']
      : ['Q', 'P', 'N'];
  };

  const openEdit = (brand) => {
    setEditBrand({ ...brand });
    setEditPrices(getBrandPrices(brand.id));
    setMessage('');
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      await updateBrand(editBrand.id, {
        brand_name: editBrand.brand_name,
        category_id: editBrand.category_id,
      });
      for (const p of editPrices) {
        await updatePrice(p.id, p.price);
      }
      setMessage('Brand updated successfully!');
      setEditBrand(null);
      fetchAll();
    } catch (error) {
      setMessage('Error updating brand');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete brand "${name}"? This cannot be undone.`)) return;
    try {
      await deleteBrand(id);
      fetchAll();
    } catch (error) {
      console.error(error);
    }
  };

  const openAdd = () => {
    setNewBrand({ brand_name: '', category_id: categories[0]?.id || '' });
    setNewPrices(getSizeTypes(categories[0]?.id).map(s => ({ size_type: s, price: 0 })));
    setAddDialog(true);
    setMessage('');
  };

  const handleAddBrand = async () => {
    try {
      setSubmitting(true);
      await addBrand({
        brand_name: newBrand.brand_name,
        category_id: newBrand.category_id,
        prices: newPrices,
      });
      setAddDialog(false);
      fetchAll();
    } catch (error) {
      setMessage('Error adding brand');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = brands.filter(b => {
    const matchCat = filterCategory === 'all' || b.category_name === filterCategory;
    const matchSearch = b.brand_name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600} color="#1a3a5c">Brand Management</Typography>
        <Button
          variant="contained" onClick={openAdd}
          sx={{ backgroundColor: '#1a3a5c', fontWeight: 600 }}
        >
          + Add New Brand
        </Button>
      </Box>

      {message && <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mb: 2 }}>{message}</Alert>}

      <Card sx={{ borderRadius: 2, boxShadow: 1, mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Search brand" size="small" value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }}
            />
            <TextField
              select label="Category" size="small" value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)} sx={{ minWidth: 180 }}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.category_name}>{cat.category_name}</MenuItem>
              ))}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#1a3a5c' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Brand Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Prices</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((brand, index) => {
                    const brandPrices = getBrandPrices(brand.id);
                    return (
                      <TableRow key={brand.id} hover sx={{ backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 500, fontSize: 12 }}>{brand.brand_name}</TableCell>
                        <TableCell>
                          <Chip label={brand.category_name} size="small"
                            sx={{ backgroundColor: '#e8f0f7', color: '#1a3a5c', fontSize: 11 }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>
                          {brandPrices.filter(p => p.price > 0).map(p => (
                            <span key={p.id} style={{ marginRight: 8 }}>
                              {p.size_type}: Rs.{parseFloat(p.price).toLocaleString()}
                            </span>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small" variant="outlined"
                              onClick={() => openEdit(brand)}
                              sx={{ borderColor: '#1a3a5c', color: '#1a3a5c', fontSize: 11 }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small" variant="outlined" color="error"
                              onClick={() => handleDelete(brand.id, brand.brand_name)}
                              sx={{ fontSize: 11 }}
                            >
                              Delete
                            </Button>
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

      {/* Edit Dialog */}
      <Dialog open={!!editBrand} onClose={() => setEditBrand(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#1a3a5c', color: 'white', fontWeight: 600 }}>
          Edit Brand
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {message && <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mb: 2 }}>{message}</Alert>}
          <TextField
            fullWidth label="Brand Name" size="small"
            value={editBrand?.brand_name || ''}
            onChange={(e) => setEditBrand(prev => ({ ...prev, brand_name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth select label="Category" size="small"
            value={editBrand?.category_id || ''}
            onChange={(e) => setEditBrand(prev => ({ ...prev, category_id: e.target.value }))}
            sx={{ mb: 3 }}
          >
            {categories.map(cat => (
              <MenuItem key={cat.id} value={cat.id}>{cat.category_name}</MenuItem>
            ))}
          </TextField>
          <Typography variant="subtitle2" fontWeight={600} color="#1a3a5c" mb={1}>
            Update Prices (Rs.)
          </Typography>
          {editPrices.map((p, i) => (
            <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 100 }}>{p.size_type}</Typography>
              <TextField
                size="small" type="number" value={p.price}
                onChange={(e) => {
                  const updated = [...editPrices];
                  updated[i] = { ...updated[i], price: parseFloat(e.target.value) || 0 };
                  setEditPrices(updated);
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditBrand(null)}>Cancel</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={submitting}
            sx={{ backgroundColor: '#1a3a5c', fontWeight: 600 }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Brand Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#1a3a5c', color: 'white', fontWeight: 600 }}>
          Add New Brand
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {message && <Alert severity="error" sx={{ mb: 2 }}>{message}</Alert>}
          <TextField
            fullWidth label="Brand Name" size="small"
            value={newBrand.brand_name}
            onChange={(e) => setNewBrand(prev => ({ ...prev, brand_name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth select label="Category" size="small"
            value={newBrand.category_id}
            onChange={(e) => {
              setNewBrand(prev => ({ ...prev, category_id: e.target.value }));
              setNewPrices(getSizeTypes(e.target.value).map(s => ({ size_type: s, price: 0 })));
            }}
            sx={{ mb: 3 }}
          >
            {categories.map(cat => (
              <MenuItem key={cat.id} value={cat.id}>{cat.category_name}</MenuItem>
            ))}
          </TextField>
          <Typography variant="subtitle2" fontWeight={600} color="#1a3a5c" mb={1}>
            Prices (Rs.)
          </Typography>
          {newPrices.map((p, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 100 }}>{p.size_type}</Typography>
              <TextField
                size="small" type="number" value={p.price}
                onChange={(e) => {
                  const updated = [...newPrices];
                  updated[i] = { ...updated[i], price: parseFloat(e.target.value) || 0 };
                  setNewPrices(updated);
                }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button
            variant="contained" onClick={handleAddBrand} disabled={submitting}
            sx={{ backgroundColor: '#1a3a5c', fontWeight: 600 }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Add Brand'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
