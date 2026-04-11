import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, MenuItem,
  TextField, Button, CircularProgress, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { getApprovedSummary, getCategories } from '../api/index';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const QPN_COLS  = ['Q', 'P', 'N'];
const BEER_COLS = ['625ml Btl', '500ml Cane', '330ml Cane', '500ml Btl', '325ml Btl'];

export default function ApprovedSummaryPage() {
  const [categories, setCategories]               = useState([]);
  const [selectedCategory, setSelectedCategory]   = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [selectedCategoryType, setSelectedCategoryType] = useState('qpn');
  const [filter, setFilter]                       = useState('monthly');
  const [summaryData, setSummaryData]             = useState([]);
  const [loading, setLoading]                     = useState(false);

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

  const fetchSummary = async () => {
    if (!selectedCategory) return;
    try {
      setLoading(true);
      const data = await getApprovedSummary(selectedCategory, filter);
      setSummaryData(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const columns = selectedCategoryType === 'beer' ? BEER_COLS : QPN_COLS;
  const shops   = [...new Set(summaryData.map(d => d.shop_name))];
  const brands  = [...new Set(summaryData.map(d => d.brand_name))];

  const getQty = (shop, brand, ci) => {
    const row = summaryData.find(d => d.shop_name === shop && d.brand_name === brand);
    if (!row) return 0;
    return parseInt(row[['qty_1','qty_2','qty_3','qty_4','qty_5'][ci]]) || 0;
  };

  const getShopTotal = (shop) =>
    summaryData.filter(d => d.shop_name === shop)
      .reduce((s, d) => s + (parseInt(d.total_approved) || 0), 0);

  const getNetTotal = () => shops.reduce((s, shop) => s + getShopTotal(shop), 0);

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [];
    wsData.push([`${selectedCategoryName} Approved Summary`]);
    wsData.push([`Filter: ${filter.charAt(0).toUpperCase() + filter.slice(1)}`]);
    wsData.push([]);

    const h1 = ['Bar Name'];
    brands.forEach(b => { h1.push(b); for(let i=1;i<columns.length;i++) h1.push(''); });
    h1.push('Shop Total');
    wsData.push(h1);

    const h2 = [''];
    brands.forEach(() => columns.forEach(c => h2.push(c)));
    h2.push('');
    wsData.push(h2);

    shops.forEach(shop => {
      const row = [shop];
      brands.forEach(brand => columns.forEach((c,ci) => row.push(getQty(shop,brand,ci)||0)));
      row.push(getShopTotal(shop));
      wsData.push(row);
    });

    const totalRow = ['TOTAL'];
    brands.forEach(brand =>
      columns.forEach((c,ci) =>
        totalRow.push(shops.reduce((s,shop) => s + getQty(shop,brand,ci), 0))
      )
    );
    totalRow.push(getNetTotal());
    wsData.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const merges = [];
    let cs = 1;
    brands.forEach(() => {
      merges.push({ s:{r:3,c:cs}, e:{r:3,c:cs+columns.length-1} });
      cs += columns.length;
    });
    ws['!merges'] = merges;
    ws['!cols'] = [{wch:20}, ...brands.flatMap(() => columns.map(() => ({wch:12}))), {wch:12}];
    XLSX.utils.book_append_sheet(wb, ws, selectedCategoryName);
    const buf = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    saveAs(new Blob([buf], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
      `${selectedCategoryName}_Approved_Summary_${filter}.xlsx`);
  };

  const handlePrint = () => {
    const pw = window.open('', '_blank');
    pw.document.write(`<!DOCTYPE html><html><head>
      <title>${selectedCategoryName} Approved Summary</title>
      <style>
        @page{size:landscape;margin:8mm}
        *{box-sizing:border-box}
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
      <h2>${selectedCategoryName} Approved Summary</h2>
      <p>Filter: ${filter.charAt(0).toUpperCase()+filter.slice(1)}</p>
      <table>
        <thead>
          <tr>
            <th rowspan="2">Bar Name</th>
            ${brands.map(b=>`<th colspan="${columns.length}" style="background:#1a5c3d;color:white;">${b}</th>`).join('')}
            <th rowspan="2">Shop Total</th>
          </tr>
          <tr>
            ${brands.map(()=>columns.map(c=>`<th style="background:#2d7a50;color:white;">${c}</th>`).join('')).join('')}
          </tr>
        </thead>
        <tbody>
          ${shops.map((shop,si)=>`
            <tr style="background:${si%2===0?'white':'#f9fafb'}">
              <td>${shop}</td>
              ${brands.map(brand=>columns.map((c,ci)=>`<td>${getQty(shop,brand,ci)||'-'}</td>`).join('')).join('')}
              <td style="font-weight:bold;color:#1a5c3d;">${getShopTotal(shop)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td>TOTAL</td>
            ${brands.map(brand=>columns.map((c,ci)=>`<td>${shops.reduce((s,shop)=>s+getQty(shop,brand,ci),0)||'-'}</td>`).join('')).join('')}
            <td>${getNetTotal()}</td>
          </tr>
        </tbody>
      </table>
      </body></html>`);
    pw.document.close();
    pw.focus();
    setTimeout(()=>{ pw.print(); pw.close(); }, 500);
  };

  return (
    <Box sx={{ p:3, backgroundColor:'#f5f6fa', minHeight:'100vh' }}>
      <Typography variant="h5" fontWeight={600} mb={3} color="#1a5c3d">
        Approved Summary
      </Typography>

      <Card sx={{ borderRadius:2, boxShadow:1, mb:2 }}>
        <CardContent>
          <Box sx={{ display:'flex', gap:2, flexWrap:'wrap', alignItems:'center' }}>
            <TextField select label="Category" size="small" value={selectedCategory}
              onChange={(e) => {
                const cat = categories.find(c => c.id === e.target.value);
                setSelectedCategory(e.target.value);
                setSelectedCategoryName(cat?.category_name || '');
                setSelectedCategoryType(cat?.category_type || 'qpn');
              }} sx={{ minWidth:180 }}>
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.category_name}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Filter" size="small" value={filter}
              onChange={(e) => setFilter(e.target.value)} sx={{ minWidth:140 }}>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>
            <Button variant="contained" onClick={fetchSummary}
              sx={{ backgroundColor:'#1a5c3d', fontWeight:600 }}>
              Generate Report
            </Button>
            {summaryData.length > 0 && (<>
              <Button variant="outlined" onClick={downloadExcel}
                sx={{ borderColor:'#1a5c3d', color:'#1a5c3d', fontWeight:600 }}>
                📥 Download Excel
              </Button>
              <Button variant="outlined" onClick={handlePrint}
                sx={{ borderColor:'#1a5c3d', color:'#1a5c3d', fontWeight:600 }}>
                🖨 Print
              </Button>
            </>)}
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ display:'flex', justifyContent:'center', p:8 }}>
          <CircularProgress sx={{ color:'#1a5c3d' }} />
        </Box>
      ) : summaryData.length > 0 ? (
        <Card sx={{ borderRadius:2, boxShadow:1 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} color="#1a5c3d" mb={1} textAlign="center">
              {selectedCategoryName} — Approved Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
              Filter: {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Typography>
            <TableContainer sx={{ overflowX:'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell rowSpan={2} sx={{ backgroundColor:'#1a5c3d', color:'white', fontWeight:600, minWidth:160, position:'sticky', left:0, zIndex:3 }}>
                      Bar Name
                    </TableCell>
                    {brands.map(brand => (
                      <TableCell key={brand} colSpan={columns.length} align="center"
                        sx={{ backgroundColor:'#2d7a50', color:'white', fontWeight:600, fontSize:11, borderLeft:'1px solid #1a5c3d' }}>
                        {brand}
                      </TableCell>
                    ))}
                    <TableCell rowSpan={2} align="center"
                      sx={{ backgroundColor:'#0e3d2a', color:'white', fontWeight:600, minWidth:80 }}>
                      Shop Total
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    {brands.map(brand => (
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
                  {shops.map((shop, si) => (
                    <TableRow key={shop} sx={{ backgroundColor: si%2===0?'white':'#f9fafb' }}>
                      <TableCell sx={{ fontWeight:500, fontSize:12, position:'sticky', left:0, backgroundColor:si%2===0?'white':'#f9fafb', zIndex:1, borderRight:'2px solid #1a5c3d' }}>
                        {shop}
                      </TableCell>
                      {brands.map(brand => (
                        <React.Fragment key={brand}>
                          {columns.map((col, ci) => (
                            <TableCell key={`${shop}-${brand}-${ci}`} align="center"
                              sx={{ fontSize:12, borderLeft:ci===0?'1px solid #e0e0e0':'none' }}>
                              {getQty(shop, brand, ci) || '-'}
                            </TableCell>
                          ))}
                        </React.Fragment>
                      ))}
                      <TableCell align="center" sx={{ fontWeight:600, fontSize:12, color:'#1a5c3d' }}>
                        {getShopTotal(shop)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ backgroundColor:'#d1e7dd' }}>
                    <TableCell sx={{ fontWeight:700, fontSize:12, color:'#1a5c3d', position:'sticky', left:0, backgroundColor:'#d1e7dd', zIndex:1, borderRight:'2px solid #1a5c3d' }}>
                      TOTAL
                    </TableCell>
                    {brands.map(brand => (
                      <React.Fragment key={brand}>
                        {columns.map((col, ci) => (
                          <TableCell key={`total-${brand}-${ci}`} align="center"
                            sx={{ fontWeight:600, fontSize:12, color:'#1a5c3d', borderLeft:ci===0?'1px solid #e0e0e0':'none' }}>
                            {shops.reduce((s,shop) => s+getQty(shop,brand,ci), 0) || '-'}
                          </TableCell>
                        ))}
                      </React.Fragment>
                    ))}
                    <TableCell align="center" sx={{ fontWeight:700, fontSize:12, color:'#1a5c3d', backgroundColor:'#b8dfc8' }}>
                      {getNetTotal()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius:2, boxShadow:1 }}>
          <CardContent sx={{ textAlign:'center', py:8 }}>
            <Typography color="text.secondary">
              Select a category and filter, then click Generate Report
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
