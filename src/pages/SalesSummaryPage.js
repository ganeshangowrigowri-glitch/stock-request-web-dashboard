import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, MenuItem,
  TextField, Button, CircularProgress, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab,
} from '@mui/material';
import { getSalesSummary, getCategories, getApprovedSummary } from '../api/index';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const QPN_COLS  = ['Q', 'P', 'N'];
const BEER_COLS = ['625ml Btl', '500ml Cane', '330ml Cane', '500ml Btl', '325ml Btl'];

export default function SalesSummaryPage() {
  const [activeTab, setActiveTab] = useState(0);

  // Shared filters
  const [categories, setCategories]                     = useState([]);
  const [selectedCategory, setSelectedCategory]         = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [selectedCategoryType, setSelectedCategoryType] = useState('qpn');
  const [filter, setFilter]                             = useState('monthly');

  // Tab 1 — Request
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading]         = useState(false);

  // Tab 2 — Approved
  const [approvedData, setApprovedData]   = useState([]);
  const [approvedLoading, setApprovedLoading] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].id);
        setSelectedCategoryName(data[0].category_name);
        setSelectedCategoryType(data[0].category_type);
      }
    } catch (error) { console.error(error); }
  };

  const columns = selectedCategoryType === 'beer' ? BEER_COLS : QPN_COLS;

  // ─── Tab 1 logic (unchanged) ────────────────────────────────────────────────
  const fetchSummary = async () => {
    if (!selectedCategory) return;
    try {
      setLoading(true);
      const data = await getSalesSummary(selectedCategory, filter);
      setSummaryData(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const shops1  = [...new Set(summaryData.map(d => d.shop_name))];
  const brands1 = [...new Set(summaryData.map(d => d.brand_name))];

  const getRow1 = (shop, brand) =>
    summaryData.find(d => d.shop_name === shop && d.brand_name === brand);

  const getQty1 = (shop, brand, ci) => {
    const row = getRow1(shop, brand);
    if (!row) return 0;
    return parseInt(row[['qty_1','qty_2','qty_3','qty_4','qty_5'][ci]]) || 0;
  };

  const getBrandTotal1 = (shop, brand) => {
    const row = getRow1(shop, brand);
    return row ? parseInt(row.total_requested) || 0 : 0;
  };

  const getShopTotal1 = (shop) =>
    brands1.reduce((sum, brand) => sum + getBrandTotal1(shop, brand), 0);

  const getShopAmount1 = (shop) =>
    summaryData.filter(d => d.shop_name === shop)
      .reduce((sum, d) => sum + parseFloat(d.total_amount || 0), 0);

  // ─── Tab 2 logic ────────────────────────────────────────────────────────────
  const fetchApproved = async () => {
    if (!selectedCategory) return;
    try {
      setApprovedLoading(true);
      const data = await getApprovedSummary(selectedCategory, filter);
      setApprovedData(data);
    } catch (error) { console.error(error); }
    finally { setApprovedLoading(false); }
  };

  const shops2  = [...new Set(approvedData.map(d => d.shop_name))];
  const brands2 = [...new Set(approvedData.map(d => d.brand_name))];

  const getRow2 = (shop, brand) =>
    approvedData.find(d => d.shop_name === shop && d.brand_name === brand);

  const getQty2 = (shop, brand, ci) => {
    const row = getRow2(shop, brand);
    if (!row) return 0;
    return parseInt(row[['qty_1','qty_2','qty_3','qty_4','qty_5'][ci]]) || 0;
  };

  const getBrandTotal2 = (shop, brand) => {
    const row = getRow2(shop, brand);
    return row ? parseInt(row.total_approved) || 0 : 0;
  };

  const getShopTotal2 = (shop) =>
    brands2.reduce((sum, brand) => sum + getBrandTotal2(shop, brand), 0);

  const getShopAmount2 = (shop) =>
    approvedData.filter(d => d.shop_name === shop)
      .reduce((sum, d) => sum + parseFloat(d.total_amount || 0), 0);

  const getNetTotal2  = () => shops2.reduce((s, shop) => s + getShopTotal2(shop), 0);
  const getNetAmount2 = () => shops2.reduce((s, shop) => s + getShopAmount2(shop), 0);

  // ─── Generate Report button ──────────────────────────────────────────────────
  const handleGenerate = () => {
    if (activeTab === 0) fetchSummary();
    else fetchApproved();
  };

  // ─── Tab 1 Excel ────────────────────────────────────────────────────────────
  const downloadExcel1 = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [];
    wsData.push([`${selectedCategoryName} Request Order Summary`]);
    wsData.push([`Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`]);
    wsData.push([]);
    const h1 = ['Bar Name'];
    brands1.forEach(b => { h1.push(b); for(let i=1;i<columns.length;i++) h1.push(''); });
    h1.push('Shop Total'); h1.push('Amount (Rs.)');
    wsData.push(h1);
    const h2 = [''];
    brands1.forEach(() => columns.forEach(c => h2.push(c)));
    h2.push(''); h2.push('');
    wsData.push(h2);
    shops1.forEach(shop => {
      const row = [shop];
      brands1.forEach(brand => columns.forEach((c,ci) => row.push(getQty1(shop,brand,ci)||0)));
      row.push(getShopTotal1(shop));
      row.push(parseFloat(getShopAmount1(shop)).toFixed(2));
      wsData.push(row);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const merges = []; let cs = 1;
    brands1.forEach(() => {
      merges.push({ s:{r:3,c:cs}, e:{r:3,c:cs+columns.length-1} });
      cs += columns.length;
    });
    ws['!merges'] = merges;
    ws['!cols'] = [{wch:20},...brands1.flatMap(()=>columns.map(()=>({wch:12}))),{wch:12},{wch:15}];
    XLSX.utils.book_append_sheet(wb, ws, 'Request Summary');
    const buf = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
      `${selectedCategoryName}_Request_Summary_${filter}.xlsx`);
  };

  // ─── Tab 2 Excel ────────────────────────────────────────────────────────────
  const downloadExcel2 = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [];
    wsData.push([`${selectedCategoryName} Approved Order Summary`]);
    wsData.push([`Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`]);
    wsData.push([]);
    const h1 = ['Bar Name'];
    brands2.forEach(b => { h1.push(b); for(let i=1;i<columns.length;i++) h1.push(''); });
    h1.push('Shop Total'); h1.push('Amount (Rs.)');
    wsData.push(h1);
    const h2 = [''];
    brands2.forEach(() => columns.forEach(c => h2.push(c)));
    h2.push(''); h2.push('');
    wsData.push(h2);
    shops2.forEach(shop => {
      const row = [shop];
      brands2.forEach(brand => columns.forEach((c,ci) => row.push(getQty2(shop,brand,ci)||0)));
      row.push(getShopTotal2(shop));
      row.push(parseFloat(getShopAmount2(shop)).toFixed(2));
      wsData.push(row);
    });
    const totalRow = ['TOTAL'];
    brands2.forEach(brand => columns.forEach((c,ci) =>
      totalRow.push(shops2.reduce((s,shop)=>s+getQty2(shop,brand,ci),0))
    ));
    totalRow.push(getNetTotal2());
    totalRow.push(parseFloat(getNetAmount2()).toFixed(2));
    wsData.push(totalRow);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const merges = []; let cs = 1;
    brands2.forEach(() => {
      merges.push({ s:{r:3,c:cs}, e:{r:3,c:cs+columns.length-1} });
      cs += columns.length;
    });
    ws['!merges'] = merges;
    ws['!cols'] = [{wch:20},...brands2.flatMap(()=>columns.map(()=>({wch:12}))),{wch:12},{wch:15}];
    XLSX.utils.book_append_sheet(wb, ws, 'Approved Summary');
    const buf = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
      `${selectedCategoryName}_Approved_Summary_${filter}.xlsx`);
  };

  // ─── Tab 1 Print ────────────────────────────────────────────────────────────
  const handlePrint1 = () => {
    const pw = window.open('', '_blank');
    pw.document.write(`<!DOCTYPE html><html><head>
      <title>${selectedCategoryName} Request Order Summary</title>
      <style>
        @page{size:landscape;margin:8mm}*{box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:9px}
        h2{text-align:center;color:#1a3a5c;margin:0 0 4px 0;font-size:14px}
        p{text-align:center;color:#666;margin:0 0 8px 0;font-size:10px}
        table{width:100%;border-collapse:collapse}
        th{background:#1a3a5c;color:white;padding:5px 3px;text-align:center;font-size:8px;border:1px solid #ccc}
        td{padding:4px 3px;text-align:center;border:1px solid #ddd;font-size:8px}
        td:first-child{text-align:left;font-weight:bold}
        tr:nth-child(even){background:#f9fafb}
      </style></head><body>
      <h2>${selectedCategoryName} — Request Order Summary</h2>
      <p>Filter: ${filter.charAt(0).toUpperCase()+filter.slice(1)}</p>
      <table><thead>
        <tr>
          <th rowspan="2">Bar Name</th>
          ${brands1.map(b=>`<th colspan="${columns.length}" style="background:#1a3a5c;color:white;">${b}</th>`).join('')}
          <th rowspan="2">Shop Total</th>
          <th rowspan="2">Amount (Rs.)</th>
        </tr>
        <tr>
          ${brands1.map(()=>columns.map(c=>`<th style="background:#2a5278;color:white;">${c}</th>`).join('')).join('')}
        </tr>
      </thead><tbody>
        ${shops1.map((shop,si)=>`
          <tr style="background:${si%2===0?'white':'#f9fafb'}">
            <td>${shop}</td>
            ${brands1.map(brand=>columns.map((c,ci)=>`<td>${getQty1(shop,brand,ci)||'-'}</td>`).join('')).join('')}
            <td style="font-weight:bold;color:#1a3a5c;">${getShopTotal1(shop)}</td>
            <td style="font-weight:bold;color:#1a5c3d;">${parseFloat(getShopAmount1(shop)).toLocaleString('en-LK',{minimumFractionDigits:2})}</td>
          </tr>`).join('')}
      </tbody></table></body></html>`);
    pw.document.close(); pw.focus();
    setTimeout(()=>{pw.print();pw.close();},500);
  };

  // ─── Tab 2 Print ────────────────────────────────────────────────────────────
  const handlePrint2 = () => {
    const pw = window.open('', '_blank');
    pw.document.write(`<!DOCTYPE html><html><head>
      <title>${selectedCategoryName} Approved Order Summary</title>
      <style>
        @page{size:landscape;margin:8mm}*{box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:9px}
        h2{text-align:center;color:#1a5c3d;margin:0 0 4px 0;font-size:14px}
        p{text-align:center;color:#666;margin:0 0 8px 0;font-size:10px}
        table{width:100%;border-collapse:collapse}
        th{background:#1a5c3d;color:white;padding:5px 3px;text-align:center;font-size:8px;border:1px solid #ccc}
        td{padding:4px 3px;text-align:center;border:1px solid #ddd;font-size:8px}
        td:first-child{text-align:left;font-weight:bold}
        tr:nth-child(even){background:#f9fafb}
        .total-row{background:#d1e7dd!important;font-weight:bold}
      </style></head><body>
      <h2>${selectedCategoryName} — Approved Order Summary</h2>
      <p>Filter: ${filter.charAt(0).toUpperCase()+filter.slice(1)}</p>
      <table><thead>
        <tr>
          <th rowspan="2">Bar Name</th>
          ${brands2.map(b=>`<th colspan="${columns.length}" style="background:#1a5c3d;color:white;">${b}</th>`).join('')}
          <th rowspan="2">Shop Total</th>
          <th rowspan="2">Amount (Rs.)</th>
        </tr>
        <tr>
          ${brands2.map(()=>columns.map(c=>`<th style="background:#2d7a50;color:white;">${c}</th>`).join('')).join('')}
        </tr>
      </thead><tbody>
        ${shops2.map((shop,si)=>`
          <tr style="background:${si%2===0?'white':'#f9fafb'}">
            <td>${shop}</td>
            ${brands2.map(brand=>columns.map((c,ci)=>`<td>${getQty2(shop,brand,ci)||'-'}</td>`).join('')).join('')}
            <td style="font-weight:bold;color:#1a5c3d;">${getShopTotal2(shop)}</td>
            <td style="font-weight:bold;color:#1a5c3d;">${parseFloat(getShopAmount2(shop)).toLocaleString('en-LK',{minimumFractionDigits:2})}</td>
          </tr>`).join('')}
        <tr class="total-row">
          <td>TOTAL</td>
          ${brands2.map(brand=>columns.map((c,ci)=>`<td style="color:#1a5c3d;">${shops2.reduce((s,shop)=>s+getQty2(shop,brand,ci),0)||'-'}</td>`).join('')).join('')}
          <td style="color:#1a5c3d;">${getNetTotal2()}</td>
          <td style="color:#1a5c3d;">${parseFloat(getNetAmount2()).toLocaleString('en-LK',{minimumFractionDigits:2})}</td>
        </tr>
      </tbody></table></body></html>`);
    pw.document.close(); pw.focus();
    setTimeout(()=>{pw.print();pw.close();},500);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  const isTab1HasData = summaryData.length > 0;
  const isTab2HasData = approvedData.length > 0;

  return (
    <Box sx={{ p: 3, backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      <Typography variant="h5" fontWeight={600} mb={3} color="#1a3a5c">
        Order Summary
      </Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => { setActiveTab(val); setSummaryData([]); setApprovedData([]); }}
          sx={{
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: 14 },
            '& .Mui-selected': { color: '#1a3a5c' },
            '& .MuiTabs-indicator': { backgroundColor: '#1a3a5c' },
          }}
        >
          <Tab label="Request Order Summary" />
          <Tab label="Approved Order Summary" />
        </Tabs>
      </Box>

      {/* Filters — shared */}
      <Card sx={{ borderRadius: 2, boxShadow: 1, mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select label="Category" size="small" value={selectedCategory}
              onChange={(e) => {
                const cat = categories.find(c => c.id === e.target.value);
                setSelectedCategory(e.target.value);
                setSelectedCategoryName(cat?.category_name || '');
                setSelectedCategoryType(cat?.category_type || 'qpn');
                setSummaryData([]); setApprovedData([]);
              }}
              sx={{ minWidth: 180 }}
            >
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.category_name}</MenuItem>
              ))}
            </TextField>

            <TextField
              select label="Filter" size="small" value={filter}
              onChange={(e) => { setFilter(e.target.value); setSummaryData([]); setApprovedData([]); }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>

            <Button
              variant="contained" onClick={handleGenerate}
              sx={{ backgroundColor: activeTab === 0 ? '#1a3a5c' : '#1a5c3d', fontWeight: 600 }}
            >
              Generate Report
            </Button>

            {/* Tab 1 action buttons */}
            {activeTab === 0 && isTab1HasData && (
              <>
                <Button variant="outlined" onClick={downloadExcel1}
                  sx={{ borderColor: '#1a5c3d', color: '#1a5c3d', fontWeight: 600 }}>
                  📥 Download Excel
                </Button>
                <Button variant="outlined" onClick={handlePrint1}
                  sx={{ borderColor: '#1a3a5c', color: '#1a3a5c', fontWeight: 600 }}>
                  🖨 Print
                </Button>
              </>
            )}

            {/* Tab 2 action buttons */}
            {activeTab === 1 && isTab2HasData && (
              <>
                <Button variant="outlined" onClick={downloadExcel2}
                  sx={{ borderColor: '#1a5c3d', color: '#1a5c3d', fontWeight: 600 }}>
                  📥 Download Excel
                </Button>
                <Button variant="outlined" onClick={handlePrint2}
                  sx={{ borderColor: '#1a5c3d', color: '#1a5c3d', fontWeight: 600 }}>
                  🖨 Print
                </Button>
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* ── TAB 1: Request Order Summary ── */}
      {activeTab === 0 && (
        loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        ) : isTab1HasData ? (
          <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} color="#1a3a5c" mb={1} textAlign="center">
                {selectedCategoryName} — Request Order Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
                Filter: {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Typography>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell rowSpan={2} sx={{ backgroundColor:'#1a3a5c', color:'white', fontWeight:600, minWidth:160, position:'sticky', left:0, zIndex:3 }}>
                        Bar Name
                      </TableCell>
                      {brands1.map(brand => (
                        <TableCell key={brand} colSpan={columns.length} align="center"
                          sx={{ backgroundColor:'#2a5278', color:'white', fontWeight:600, fontSize:11, borderLeft:'1px solid #1a3a5c' }}>
                          {brand}
                        </TableCell>
                      ))}
                      <TableCell rowSpan={2} align="center"
                        sx={{ backgroundColor:'#0e3d5c', color:'white', fontWeight:600, minWidth:80 }}>
                        Shop Total
                      </TableCell>
                      <TableCell rowSpan={2} align="center"
                        sx={{ backgroundColor:'#0e3d5c', color:'white', fontWeight:600, minWidth:130 }}>
                        Amount (Rs.)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      {brands1.map(brand => (
                        <React.Fragment key={brand}>
                          {columns.map((col, i) => (
                            <TableCell key={`${brand}-${col}`} align="center"
                              sx={{ backgroundColor:'#2a5278', color:'white', fontSize:10, fontWeight:500, minWidth:55, borderLeft:i===0?'1px solid #1a3a5c':'none' }}>
                              {col}
                            </TableCell>
                          ))}
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shops1.map((shop, si) => (
                      <TableRow key={shop} sx={{ backgroundColor: si%2===0?'white':'#f9fafb' }}>
                        <TableCell sx={{ fontWeight:500, fontSize:12, position:'sticky', left:0, backgroundColor:si%2===0?'white':'#f9fafb', zIndex:1, borderRight:'2px solid #1a3a5c' }}>
                          {shop}
                        </TableCell>
                        {brands1.map(brand => (
                          <React.Fragment key={brand}>
                            {columns.map((col, ci) => (
                              <TableCell key={`${shop}-${brand}-${ci}`} align="center"
                                sx={{ fontSize:12, borderLeft:ci===0?'1px solid #e0e0e0':'none' }}>
                                {getQty1(shop, brand, ci) || '-'}
                              </TableCell>
                            ))}
                          </React.Fragment>
                        ))}
                        <TableCell align="center" sx={{ fontWeight:600, fontSize:12, color:'#1a3a5c' }}>
                          {getShopTotal1(shop)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight:600, fontSize:12, color:'#1a5c3d' }}>
                          {parseFloat(getShopAmount1(shop)).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">
                Select a category and filter, then click Generate Report
              </Typography>
            </CardContent>
          </Card>
        )
      )}

      {/* ── TAB 2: Approved Order Summary ── */}
      {activeTab === 1 && (
        approvedLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress sx={{ color: '#1a5c3d' }} />
          </Box>
        ) : isTab2HasData ? (
          <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} color="#1a5c3d" mb={1} textAlign="center">
                {selectedCategoryName} — Approved Order Summary
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
                Filter: {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Typography>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell rowSpan={2} sx={{ backgroundColor:'#1a5c3d', color:'white', fontWeight:600, minWidth:160, position:'sticky', left:0, zIndex:3 }}>
                        Bar Name
                      </TableCell>
                      {brands2.map(brand => (
                        <TableCell key={brand} colSpan={columns.length} align="center"
                          sx={{ backgroundColor:'#2d7a50', color:'white', fontWeight:600, fontSize:11, borderLeft:'1px solid #1a5c3d' }}>
                          {brand}
                        </TableCell>
                      ))}
                      <TableCell rowSpan={2} align="center"
                        sx={{ backgroundColor:'#0e3d2a', color:'white', fontWeight:600, minWidth:80 }}>
                        Shop Total
                      </TableCell>
                      <TableCell rowSpan={2} align="center"
                        sx={{ backgroundColor:'#0e3d2a', color:'white', fontWeight:600, minWidth:130 }}>
                        Amount (Rs.)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      {brands2.map(brand => (
                        <React.Fragment key={brand}>
                          {columns.map((col, i) => (
                            <TableCell key={`${brand}-${col}`} align="center"
                              sx={{ backgroundColor:'#2d7a50', color:'white', fontSize:10, fontWeight:500, minWidth:55, borderLeft:i===0?'1px solid #1a5c3d':'none' }}>
                              {col}
                            </TableCell>
                          ))}
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {shops2.map((shop, si) => (
                      <TableRow key={shop} sx={{ backgroundColor: si%2===0?'white':'#f9fafb' }}>
                        <TableCell sx={{ fontWeight:500, fontSize:12, position:'sticky', left:0, backgroundColor:si%2===0?'white':'#f9fafb', zIndex:1, borderRight:'2px solid #1a5c3d' }}>
                          {shop}
                        </TableCell>
                        {brands2.map(brand => (
                          <React.Fragment key={brand}>
                            {columns.map((col, ci) => (
                              <TableCell key={`${shop}-${brand}-${ci}`} align="center"
                                sx={{ fontSize:12, borderLeft:ci===0?'1px solid #e0e0e0':'none' }}>
                                {getQty2(shop, brand, ci) || '-'}
                              </TableCell>
                            ))}
                          </React.Fragment>
                        ))}
                        <TableCell align="center" sx={{ fontWeight:600, fontSize:12, color:'#1a5c3d' }}>
                          {getShopTotal2(shop)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight:600, fontSize:12, color:'#1a5c3d' }}>
                          {parseFloat(getShopAmount2(shop)).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* TOTAL row — only in approved tab */}
                    <TableRow sx={{ backgroundColor: '#d1e7dd' }}>
                      <TableCell sx={{ fontWeight:700, fontSize:12, color:'#1a5c3d', position:'sticky', left:0, backgroundColor:'#d1e7dd', zIndex:1, borderRight:'2px solid #1a5c3d' }}>
                        TOTAL
                      </TableCell>
                      {brands2.map(brand => (
                        <React.Fragment key={brand}>
                          {columns.map((col, ci) => (
                            <TableCell key={`total-${brand}-${ci}`} align="center"
                              sx={{ fontWeight:600, fontSize:12, color:'#1a5c3d', borderLeft:ci===0?'1px solid #e0e0e0':'none' }}>
                              {shops2.reduce((s,shop)=>s+getQty2(shop,brand,ci),0)||'-'}
                            </TableCell>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableCell align="center" sx={{ fontWeight:700, fontSize:12, color:'#1a5c3d', backgroundColor:'#b8dfc8' }}>
                        {getNetTotal2()}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight:700, fontSize:12, color:'#1a5c3d', backgroundColor:'#b8dfc8' }}>
                        {parseFloat(getNetAmount2()).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">
                Select a category and filter, then click Generate Report
              </Typography>
            </CardContent>
          </Card>
        )
      )}
    </Box>
  );
}
