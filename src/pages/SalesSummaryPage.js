import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, MenuItem,
  TextField, Button, CircularProgress, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Checkbox, ListItemText, OutlinedInput, InputLabel,
  FormControl, Select, Chip, Menu, ListItemIcon,
} from '@mui/material';
import { getSalesSummary, getCategories, getApprovedSummary, getPresentSummary } from '../api/index';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const QPN_COLS  = ['Q', 'P', 'N'];
const BEER_COLS = ['625ml Btl', '500ml Cane', '330ml Cane', '500ml Btl', '325ml Btl'];

// ── Brand order per category (key = category_name lowercased) ────────────────
const BRAND_ORDER = {
  'ug': [
    'UG EXTRA SPECIAL ARRACK','UG SPECIAL ARRACK','LEMONARK ARRACK','ORIGIN PREMIUM WHITE ARRACK',
    'GOLD STAR ARRACK','VAT 6 ARRACK','ISLAND STAGE WHISKY','POYN VODKA','MORPHO LONDON DRY GIN',
    'APPLEARK ARRACK','LEO ARRACK','POYN VODKA-GREEN APPLE','ROYAL BLACK ARRACK',
  ],
  'dcsl': [
    'EXTRA SPECIAL','SPECIAL ARRACK','WHITE LABEL ARRACK','BLUE LABEL ARRACK','COCONUT ARRACK',
    'OLD ARRACK','V.S.O.A. PREMIUM','D.D.A','SRI LANKA ARRACK','ARGENTE','NARIKELA','ECONOMY PLUS',
    'DOUBLE BARREL','BLACK OPAL ARRACK','TRIPLE BLUE ARRACK','PERICEYL APPLE ARRACK',
    'PERICEYL MANGO ARRACK','HOUSE OF TILBURY WHISKY','TILSIDER WHISKY','GALERIE BRANDY',
    'GALERIE PREMIUM BRANDY','FRANKLIN BRANDY','BALMORAL DARK RUM','BALMORAL WHITE RUM',
    'PETROF VODKA','EXCELLA TEQUILA','FLINTON LONDON GIN','FLINTON LEMON GIN',
  ],
  'idl': [
    'OLD RESERVE ARRACK','OLD ARRACK','BLACK LABEL','RED LABEL','GREEN LABEL','GOLD LABEL',
    'WHITE LABEL','WHITE DIAMOND','WHITE DIAMOND LEMON','WHITE DIAMOND APPLE','BLUE SAPPHIRE',
    'CLUB 07','OLD CASK','CAVELIER','ASCOT DRY GIN','ASCOT LEMON GIN','RITZ BRANDY',
    'CHERRY BRANDY','V & A WHISKEY','CALYPSO RED RUM','B. BACCARDI RUM','W. BACCARDI RUM',
    'ERISTOFF VODKA','CELEBRATION VODKA','VSA GOLD',
  ],
  'rockland': [
    'VAT 9','EXTRA OLD ARRACK','ROCKLAND OLD ARRACK','HALMILLA OLD ARRACK','DD ARRACK',
    'COCONUT ARRACK','GOVERNOR\'S CHOICE','NAVY SEAL','ENGLISH APPLE ARRACK','DRY GIN','LEMON GIN',
    'PREMIUM RED RUM','PREMIUM WHITE RUM','HANAPIER BRANDY','OLD KEG WHISKEY',
    'OLD KEG DOUBLE BLEND WHISKEY','KEROFF VODKA','ROSKA VODKA','NAPOLEON BRANDY','EX WHITE',
    'VAT 9 (WITH BOX)','VAT 9 (WITHOUT BOX)','HANAPIER BRANDY (WITH BOX)','HANAPIER BRANDY (WITHOUT BOX)',
  ],
  'lion brewery': [
    'LION LAGER','CARLSBERG INTERNATIONAL PREMIUM','LION STOUT','LION STRONG',
    'CARLSBERG PREMIUM SPECIAL BREW','RYDERS WILD APPLE','RYDERS GINGER','SOMERSBY APPLE',
    'SOMERSBY BLACK BERRY','CARLSBERG PREMIUM SMOOTH DRAUGHT','GRAND BLONDE','LION TRUEBORN',
    'ICE','GUINNESS ST',
  ],
  'dcsl beer': [
    'DCSL LAGER','DCSL STRONG','DCSL STOUT','TIGER BLACK','BISON STRONG','ALIYA STRONG',
    'ALIYA LAGER','BISON BREEZE','BISON STOUT','ANCHOR STRONG',
  ],
};

const sortBrands = (brands, categoryName) => {
  const key = (categoryName || '').toLowerCase();
  const order = Object.entries(BRAND_ORDER).find(([k]) => key.includes(k))?.[1];
  if (!order) return brands;
  const known = order.filter(b => brands.includes(b));
  const unknown = brands.filter(b => !order.includes(b));
  return [...known, ...unknown];
};

export default function SalesSummaryPage() {
  const [activeTab, setActiveTab] = useState(0);

  const [categories, setCategories]                     = useState([]);
  const [selectedCategory, setSelectedCategory]         = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [selectedCategoryType, setSelectedCategoryType] = useState('qpn');
  const [filter, setFilter]                             = useState('monthly');

  // Shop filter — populated from ALL fetched data so new shops auto-appear
  const [selectedShops, setSelectedShops] = useState([]);

  const [summaryData, setSummaryData]         = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [approvedData, setApprovedData]       = useState([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [presentData, setPresentData]         = useState([]);
  const [presentLoading, setPresentLoading]   = useState(false);

  // Share menu
  const [shareAnchor, setShareAnchor] = useState(null);

  // Scroll refs
  const scrollRef1 = useRef(null);
  const scrollRef2 = useRef(null);
  const scrollRef3 = useRef(null);

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

  const fetchSummary = async () => {
    if (!selectedCategory) return;
    try { setLoading(true); const data = await getSalesSummary(selectedCategory, filter); setSummaryData(data); }
    catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchApproved = async () => {
    if (!selectedCategory) return;
    try { setApprovedLoading(true); const data = await getApprovedSummary(selectedCategory, filter); setApprovedData(data); }
    catch (error) { console.error(error); } finally { setApprovedLoading(false); }
  };

  const fetchPresent = async () => {
    if (!selectedCategory) return;
    try { setPresentLoading(true); const data = await getPresentSummary(selectedCategory, filter); setPresentData(data); }
    catch (error) { console.error(error); } finally { setPresentLoading(false); }
  };

  const handleGenerate = () => {
    if (activeTab === 0) fetchSummary();
    else if (activeTab === 1) fetchApproved();
    else fetchPresent();
  };

  // ── Tab helpers ─────────────────────────────────────────────────────────────

  // Tab 1
  const allShops1  = [...new Set(summaryData.map(d => d.shop_name))];
  const shops1     = selectedShops.length > 0 ? allShops1.filter(s => selectedShops.includes(s)) : allShops1;
  const allBrands1 = [...new Set(summaryData.map(d => d.brand_name))];
  const brands1    = sortBrands(allBrands1, selectedCategoryName);
  const getRow1    = (shop, brand) => summaryData.find(d => d.shop_name === shop && d.brand_name === brand);
  const getQty1    = (shop, brand, ci) => { const row = getRow1(shop,brand); if(!row) return 0; return parseInt(row[['qty_1','qty_2','qty_3','qty_4','qty_5'][ci]])||0; };
  const getBrandTotal1  = (shop, brand) => { const row = getRow1(shop,brand); return row ? parseInt(row.total_requested)||0 : 0; };
  const getShopTotal1   = (shop) => brands1.reduce((sum,brand) => sum+getBrandTotal1(shop,brand), 0);
  const getShopAmount1  = (shop) => summaryData.filter(d=>d.shop_name===shop).reduce((sum,d)=>sum+parseFloat(d.total_amount||0),0);
  const getColTotal1    = (ci) => shops1.reduce((s,shop)=>s+brands1.reduce((ss,brand)=>ss+getQty1(shop,brand,ci),0),0);
  const getNetTotal1    = () => shops1.reduce((s,shop)=>s+getShopTotal1(shop),0);
  const getNetAmount1   = () => shops1.reduce((s,shop)=>s+getShopAmount1(shop),0);
  // Per-brand column totals for grand total row
  const getBrandColTotal1 = (brand, ci) => shops1.reduce((s,shop)=>s+getQty1(shop,brand,ci),0);

  // Tab 2
  const allShops2  = [...new Set(approvedData.map(d => d.shop_name))];
  const shops2     = selectedShops.length > 0 ? allShops2.filter(s => selectedShops.includes(s)) : allShops2;
  const allBrands2 = [...new Set(approvedData.map(d => d.brand_name))];
  const brands2    = sortBrands(allBrands2, selectedCategoryName);
  const getRow2    = (shop, brand) => approvedData.find(d => d.shop_name === shop && d.brand_name === brand);
  const getQty2    = (shop, brand, ci) => { const row = getRow2(shop,brand); if(!row) return 0; return parseInt(row[['qty_1','qty_2','qty_3','qty_4','qty_5'][ci]])||0; };
  const getBrandTotal2  = (shop, brand) => { const row = getRow2(shop,brand); return row ? parseInt(row.total_approved)||0 : 0; };
  const getShopTotal2   = (shop) => brands2.reduce((sum,brand) => sum+getBrandTotal2(shop,brand), 0);
  const getShopAmount2  = (shop) => approvedData.filter(d=>d.shop_name===shop).reduce((sum,d)=>sum+parseFloat(d.total_amount||0),0);
  const getColTotal2    = (ci) => shops2.reduce((s,shop)=>s+brands2.reduce((ss,brand)=>ss+getQty2(shop,brand,ci),0),0);
  const getNetTotal2    = () => shops2.reduce((s,shop)=>s+getShopTotal2(shop),0);
  const getNetAmount2   = () => shops2.reduce((s,shop)=>s+getShopAmount2(shop),0);
  const getBrandColTotal2 = (brand, ci) => shops2.reduce((s,shop)=>s+getQty2(shop,brand,ci),0);

  // Tab 3
  const allShops3  = [...new Set(presentData.map(d => d.shop_name))];
  const shops3     = selectedShops.length > 0 ? allShops3.filter(s => selectedShops.includes(s)) : allShops3;
  const allBrands3 = [...new Set(presentData.map(d => d.brand_name))];
  const brands3    = sortBrands(allBrands3, selectedCategoryName);
  const getRow3    = (shop, brand) => presentData.find(d => d.shop_name === shop && d.brand_name === brand);
  const getQty3    = (shop, brand, ci) => { const row = getRow3(shop,brand); if(!row) return 0; return parseInt(row[['qty_1','qty_2','qty_3','qty_4','qty_5'][ci]])||0; };
  const getBrandTotal3  = (shop, brand) => { const row = getRow3(shop,brand); return row ? parseInt(row.total_present)||0 : 0; };
  const getShopTotal3   = (shop) => brands3.reduce((sum,brand) => sum+getBrandTotal3(shop,brand), 0);
  const getShopAmount3  = (shop) => presentData.filter(d=>d.shop_name===shop).reduce((sum,d)=>sum+parseFloat(d.total_amount||0),0);
  const getColTotal3    = (ci) => shops3.reduce((s,shop)=>s+brands3.reduce((ss,brand)=>ss+getQty3(shop,brand,ci),0),0);
  const getNetTotal3    = () => shops3.reduce((s,shop)=>s+getShopTotal3(shop),0);
  const getNetAmount3   = () => shops3.reduce((s,shop)=>s+getShopAmount3(shop),0);
  const getBrandColTotal3 = (brand, ci) => shops3.reduce((s,shop)=>s+getQty3(shop,brand,ci),0);

  // ── FIX 1: All shops across ALL data for shop filter — always up to date ────
  const allShopsForFilter = [...new Set([
    ...summaryData.map(d=>d.shop_name),
    ...approvedData.map(d=>d.shop_name),
    ...presentData.map(d=>d.shop_name),
  ])].sort();

  const isTab1HasData = summaryData.length > 0;
  const isTab2HasData = approvedData.length > 0;
  const isTab3HasData = presentData.length > 0;

  // ── FIX 6: Scroll helper — scrolls the table container (top arrows) ─────────
  const scroll = (ref, dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  // ── Share ────────────────────────────────────────────────────────────────────
  const getShareText = () => {
    const tab = activeTab === 0 ? 'Request Order' : activeTab === 1 ? 'Approved Order' : 'Present Stock';
    return `${selectedCategoryName} ${tab} Summary — Filter: ${filter}`;
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(getShareText());
    const body = encodeURIComponent(`Please find the ${getShareText()} attached.`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setShareAnchor(null);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`);
    setShareAnchor(null);
  };

  // ── Excel builders ───────────────────────────────────────────────────────────
  const buildExcel = (wb, sheetName, title, shops, brands, getQty, getShopTotal, getShopAmount, getColTotal, getNetTotal, getNetAmount) => {
    const wsData = [];
    wsData.push([title]);
    wsData.push([`Filter: ${filter.charAt(0).toUpperCase()+filter.slice(1)}`]);
    wsData.push([]);
    const h1 = ['Bar Name']; brands.forEach(b=>{h1.push(b);for(let i=1;i<columns.length;i++)h1.push('');}); h1.push('Shop Total'); h1.push('Amount (Rs.)'); wsData.push(h1);
    const h2 = ['']; brands.forEach(()=>columns.forEach(c=>h2.push(c))); h2.push(''); h2.push(''); wsData.push(h2);
    shops.forEach(shop=>{
      const row=[shop];
      brands.forEach(brand=>columns.forEach((_,ci)=>row.push(getQty(shop,brand,ci)||0)));
      row.push(getShopTotal(shop)); row.push(parseFloat(getShopAmount(shop)).toFixed(2));
      wsData.push(row);
    });
    // Grand total row
    const totRow=['TOTAL'];
    brands.forEach(brand=>columns.forEach((_,ci)=>totRow.push(shops.reduce((s,sh)=>s+getQty(sh,brand,ci),0))));
    totRow.push(getNetTotal()); totRow.push(parseFloat(getNetAmount()).toFixed(2));
    wsData.push(totRow);
    // NEW
    wsData.push([]);
    wsData.push([selectedCategoryType === 'beer' ? 'Bottle/Cane Summary (All Brands Combined)' : 'Q/P/N Summary (All Brands Combined)']);
    columns.forEach((col, ci) => wsData.push([`Total ${col}`, getColTotal(ci)]));
    const ws=XLSX.utils.aoa_to_sheet(wsData);
    const merges=[]; let cs=1;
    brands.forEach(()=>{merges.push({s:{r:3,c:cs},e:{r:3,c:cs+columns.length-1}});cs+=columns.length;});
    ws['!merges']=merges;
    ws['!cols']=[{wch:22},...brands.flatMap(()=>columns.map(()=>({wch:12}))),{wch:12},{wch:15}];
    XLSX.utils.book_append_sheet(wb,ws,sheetName);
  };

  const downloadExcel1 = () => {
    const wb=XLSX.utils.book_new();
    buildExcel(wb,'Request Summary',`${selectedCategoryName} Request Order Summary`,shops1,brands1,getQty1,getShopTotal1,getShopAmount1,getColTotal1,getNetTotal1,getNetAmount1);
    const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${selectedCategoryName}_Request_Summary_${filter}.xlsx`);
  };
  const downloadExcel2 = () => {
    const wb=XLSX.utils.book_new();
    buildExcel(wb,'Approved Summary',`${selectedCategoryName} Approved Order Summary`,shops2,brands2,getQty2,getShopTotal2,getShopAmount2,getColTotal2,getNetTotal2,getNetAmount2);
    const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${selectedCategoryName}_Approved_Summary_${filter}.xlsx`);
  };
  const downloadExcel3 = () => {
    const wb=XLSX.utils.book_new();
    buildExcel(wb,'Present Stock',`${selectedCategoryName} Present Stock Summary`,shops3,brands3,getQty3,getShopTotal3,getShopAmount3,getColTotal3,getNetTotal3,getNetAmount3);
    const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${selectedCategoryName}_Present_Stock_${filter}.xlsx`);
  };

  // ── FIX 5: Print builders — include column totals + Q/P/N rows ───────────────
  const buildPrintHtml = (title, color, subColor, bgColor, shops, brands, getQty, getShopTotal, getShopAmount, getColTotal, getNetTotal, getNetAmount) => {
    
    // Q/P/N summary below totals (only for qpn)
    const qpnSummaryRow = `
  <tr>
    <td style="text-align:left;font-weight:bold;color:${color};background:#e0f7f4;">TOTAL</td>
    ${brands.map(brand=>columns.map((_,ci)=>`<td style="color:#00695c;font-weight:700;background:#e0f7f4;">${shops.reduce((s,sh)=>s+getQty(sh,brand,ci),0)||'-'}</td>`).join('')).join('')}
    <td style="font-weight:bold;color:#00695c;background:#e0f7f4;">${getNetTotal()}</td>
    <td style="font-weight:bold;color:#1a5c3d;background:#e0f7f4;">${parseFloat(getNetAmount()).toLocaleString('en-LK',{minimumFractionDigits:2})}</td>
  </tr>
  <tr>
    <td style="text-align:left;font-weight:bold;color:#6a1b9a;background:#f3e5f5;">${selectedCategoryType === 'beer' ? 'BOTTLE/CANE TOTALS' : 'Q/P/N TOTALS'}</td>
    <td colspan="${brands.length * columns.length}" style="background:#f3e5f5;text-align:center;font-weight:bold;color:#6a1b9a;">
      ${columns.map((col,ci)=>`${col}: ${getColTotal(ci)}`).join('  |  ')}
    </td>
    <td style="background:#f3e5f5;"></td>
    <td style="background:#f3e5f5;"></td>
  </tr>`;

    return `<!DOCTYPE html><html><head>
      <title>${title}</title>
      <style>
        @page{size:landscape;margin:8mm}*{box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:9px}
        h2{text-align:center;color:${color};margin:0 0 4px 0;font-size:14px}
        p{text-align:center;color:#666;margin:0 0 8px 0;font-size:10px}
        table{width:100%;border-collapse:collapse}
        th{background:${color};color:white;padding:5px 3px;text-align:center;font-size:8px;border:1px solid #ccc}
        td{padding:4px 3px;text-align:center;border:1px solid #ddd;font-size:8px}
        td:first-child{text-align:left;font-weight:bold}
        tr:nth-child(even){background:#f9fafb}
        .total-row{background:${bgColor}!important;font-weight:bold}
        .col-total-row{background:#e8f4ff!important;font-weight:bold}
        .qpn-row td{text-align:left!important;background:#f0f0f0!important;}
      </style></head><body>
      <h2>${title}</h2>
      <p>Filter: ${filter.charAt(0).toUpperCase()+filter.slice(1)}</p>
      <table><thead>
        <tr>
          <th rowspan="2">Bar Name</th>
          ${brands.map(b=>`<th colspan="${columns.length}" style="background:${color};">${b}</th>`).join('')}
          <th rowspan="2">Total</th>
          <th rowspan="2">Amount (Rs.)</th>
        </tr>
        <tr>
          ${brands.map(()=>columns.map(c=>`<th style="background:${subColor};">${c}</th>`).join('')).join('')}
        </tr>
      </thead><tbody>
        ${shops.map((shop,si)=>`
          <tr style="background:${si%2===0?'white':'#f9fafb'}">
            <td>${shop}</td>
            ${brands.map(brand=>columns.map((_,ci)=>`<td>${getQty(shop,brand,ci)||'-'}</td>`).join('')).join('')}
            <td style="font-weight:bold;color:${color};">${getShopTotal(shop)}</td>
            <td style="font-weight:bold;color:#1a5c3d;">${parseFloat(getShopAmount(shop)).toLocaleString('en-LK',{minimumFractionDigits:2})}</td>
          </tr>`).join('')}
        ${qpnSummaryRow}
      </tbody></table></body></html>`;
  };

  const handlePrint1 = () => {
    const pw=window.open('','_blank');
    pw.document.write(buildPrintHtml(`${selectedCategoryName} — Request Order Summary`,'#1a3a5c','#2a5278','#d1dce8',shops1,brands1,getQty1,getShopTotal1,getShopAmount1,getColTotal1,getNetTotal1,getNetAmount1));
    pw.document.close(); pw.focus(); setTimeout(()=>{pw.print();pw.close();},500);
  };
  const handlePrint2 = () => {
    const pw=window.open('','_blank');
    pw.document.write(buildPrintHtml(`${selectedCategoryName} — Approved Order Summary`,'#1a5c3d','#2d7a50','#d1e7dd',shops2,brands2,getQty2,getShopTotal2,getShopAmount2,getColTotal2,getNetTotal2,getNetAmount2));
    pw.document.close(); pw.focus(); setTimeout(()=>{pw.print();pw.close();},500);
  };
  const handlePrint3 = () => {
    const pw=window.open('','_blank');
    pw.document.write(buildPrintHtml(`${selectedCategoryName} — Present Stock Summary`,'#7b3f00','#a0522d','#fde8d0',shops3,brands3,getQty3,getShopTotal3,getShopAmount3,getColTotal3,getNetTotal3,getNetAmount3));
    pw.document.close(); pw.focus(); setTimeout(()=>{pw.print();pw.close();},500);
  };

  // ── FIX 3+4: Q/P/N summary chips — kept above table as before ───────────────
  // NEW
const renderQPNSummary = (getColTotal, headerColor) => {
  return (
    <Box sx={{ display:'flex', gap:2, flexWrap:'wrap', mt:1.5, px:1, py:1, background:`${headerColor}10`, borderRadius:1, border:`1px solid ${headerColor}30` }}>
      <Typography variant="body2" fontWeight={700} color={headerColor} sx={{ mr:1, alignSelf:'center' }}>
        {selectedCategoryType === 'beer' ? 'Bottle/Cane Combined:' : 'All Brands Combined:'}
      </Typography>
      {columns.map((col, ci) => (
        <Chip key={col} label={`${col}: ${getColTotal(ci)}`}
          sx={{ fontWeight:700, fontSize:13, backgroundColor:`${headerColor}15`, color:headerColor, border:`1px solid ${headerColor}40` }} />
      ))}
    </Box>
  );
};
  // ── FIX 2+3+4+6: Table renderer ─────────────────────────────────────────────
  // showTotalRow: always true now (request also gets totals — FIX 2)
  // FIX 3: Q/P/N totals shown as extra colored row below TOTAL row
  // FIX 6: Scroll arrows moved to TOP of table
  const renderTable = (
    scrollRef, shops, brands, getQty, getBrandColTotal,
    getShopTotal, getShopAmount, getColTotal,
    getNetTotal, getNetAmount,
    headerColor, subColor
  ) => (
    <Box>
      {/* FIX 6: Scroll arrows at TOP */}
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:0.5, px:0.5 }}>
        <Button onClick={()=>scroll(scrollRef,-1)} variant="contained" size="small"
          sx={{ minWidth:32, width:32, height:28, p:0, borderRadius:1, backgroundColor:headerColor, '&:hover':{backgroundColor:headerColor,opacity:0.85}, boxShadow:2, fontSize:12 }}>
          ◀
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize:10 }}>scroll horizontally</Typography>
        <Button onClick={()=>scroll(scrollRef,1)} variant="contained" size="small"
          sx={{ minWidth:32, width:32, height:28, p:0, borderRadius:1, backgroundColor:headerColor, '&:hover':{backgroundColor:headerColor,opacity:0.85}, boxShadow:2, fontSize:12 }}>
          ▶
        </Button>
      </Box>
      
      <TableContainer ref={scrollRef} sx={{ overflowX:'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} sx={{ backgroundColor:headerColor, color:'white', fontWeight:600, minWidth:160, position:'sticky', left:0, zIndex:3 }}>
                Bar Name
              </TableCell>
              {brands.map(brand => (
                <TableCell key={brand} colSpan={columns.length} align="center"
                  sx={{ backgroundColor:subColor, color:'white', fontWeight:600, fontSize:11, borderLeft:`1px solid ${headerColor}` }}>
                  {brand}
                </TableCell>
              ))}
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor:headerColor, color:'white', fontWeight:600, minWidth:80 }}>Shop Total</TableCell>
              <TableCell rowSpan={2} align="center" sx={{ backgroundColor:headerColor, color:'white', fontWeight:600, minWidth:130 }}>Amount (Rs.)</TableCell>
            </TableRow>
            <TableRow>
              {brands.map(brand => (
                <React.Fragment key={brand}>
                  {columns.map((col, i) => (
                    <TableCell key={`${brand}-${col}`} align="center"
                      sx={{ backgroundColor:subColor, color:'white', fontSize:10, fontWeight:500, minWidth:55, borderLeft:i===0?`1px solid ${headerColor}`:'none' }}>
                      {col}
                    </TableCell>
                  ))}
                </React.Fragment>
              ))}
            
            </TableRow>
          </TableHead>
          <TableBody>
            {shops.map((shop, si) => (
              <TableRow key={shop} sx={{ backgroundColor:si%2===0?'white':'#f9fafb' }}>
                <TableCell sx={{ fontWeight:500, fontSize:12, position:'sticky', left:0, backgroundColor:si%2===0?'white':'#f9fafb', zIndex:1, borderRight:`2px solid ${headerColor}` }}>
                  {shop}
                </TableCell>
                {brands.map(brand => (
                  <React.Fragment key={brand}>
                    {columns.map((col, ci) => (
                      <TableCell key={`${shop}-${brand}-${ci}`} align="center" sx={{ fontSize:12, borderLeft:ci===0?'1px solid #e0e0e0':'none' }}>
                        {getQty(shop, brand, ci) || '-'}
                      </TableCell>
                    ))}
                  </React.Fragment>
                ))}
                <TableCell align="center" sx={{ fontWeight:600, fontSize:12, color:headerColor }}>{getShopTotal(shop)}</TableCell>
                <TableCell align="center" sx={{ fontWeight:600, fontSize:12, color:'#1a5c3d' }}>
                  {parseFloat(getShopAmount(shop)).toLocaleString('en-LK',{minimumFractionDigits:2})}
                </TableCell>
              </TableRow>
            ))}

           

            {/* TOTAL row */}
          <TableRow sx={{ backgroundColor:'#e0f7f4' }}>
            <TableCell sx={{ fontWeight:700, fontSize:11, color:'#00695c', position:'sticky', left:0, backgroundColor:'#e0f7f4', zIndex:1, borderRight:`2px solid #00695c`, whiteSpace:'nowrap' }}>
                 TOTAL
             </TableCell>
              {brands.map(brand => (
               <React.Fragment key={brand}>
           {columns.map((col, ci) => (
           <TableCell key={`coltotal-${brand}-${ci}`} align="center"
          sx={{ fontWeight:600, fontSize:12, color:'#00695c', backgroundColor:'#e0f7f4', borderLeft:ci===0?'1px solid #b2dfdb':'none' }}>
          {getBrandColTotal(brand, ci)||'-'}
          </TableCell>
         ))}
         </React.Fragment>
         ))}
        {/* FIX: show actual net total and amount instead of '-' */}
        <TableCell align="center" sx={{ fontWeight:700, fontSize:12, color:'#00695c', backgroundColor:'#e0f7f4' }}>
           {getNetTotal()}
         </TableCell>
        <TableCell align="center" sx={{ fontWeight:700, fontSize:12, color:'#1a5c3d', backgroundColor:'#e0f7f4' }}>
         {parseFloat(getNetAmount()).toLocaleString('en-LK',{minimumFractionDigits:2})}
         </TableCell>
          </TableRow>
            {/* Q/P/N totals for arrack OR bottle/cane totals for beer — row below TOTAL */}
<TableRow sx={{ backgroundColor:'#f3e5f5' }}>
  <TableCell sx={{ fontWeight:700, fontSize:11, color:'#6a1b9a', position:'sticky', left:0, backgroundColor:'#f3e5f5', zIndex:1, borderRight:`2px solid #6a1b9a`, whiteSpace:'nowrap' }}>
    {selectedCategoryType === 'beer' ? 'BOTTLE/CANE\nTOTALS' : 'Q/P/N TOTALS'}
  </TableCell>
  <TableCell
    colSpan={brands.length * columns.length}
    sx={{ backgroundColor:'#f3e5f5', py:0.75 }}
  >
    <Box sx={{ display:'flex', gap:2, flexWrap:'wrap', justifyContent:'center' }}>
      {columns.map((col, ci) => (
        <Chip
          key={col}
          label={`${col}: ${getColTotal(ci)}`}
          size="small"
          sx={{ fontWeight:700, fontSize:12, backgroundColor:'#ce93d8', color:'#4a0072', border:'1px solid #9c27b0' }}
        />
      ))}
    </Box>
  </TableCell>
  <TableCell sx={{ backgroundColor:'#f3e5f5' }} />
  <TableCell sx={{ backgroundColor:'#f3e5f5' }} />
</TableRow>
            
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ── Active data for share menu ───────────────────────────────────────────────
  const hasData = activeTab===0?isTab1HasData:activeTab===1?isTab2HasData:isTab3HasData;

  return (
    <Box sx={{ p:3, backgroundColor:'#f5f6fa', minHeight:'100vh' }}>
      <Typography variant="h5" fontWeight={600} mb={3} color="#1a3a5c">
        Order Summary
      </Typography>

      <Box sx={{ borderBottom:1, borderColor:'divider', mb:2 }}>
        <Tabs value={activeTab}
          onChange={(e,val)=>{ setActiveTab(val); setSummaryData([]); setApprovedData([]); setPresentData([]); }}
          sx={{ '& .MuiTab-root':{fontWeight:600,textTransform:'none',fontSize:14}, '& .Mui-selected':{color:'#1a3a5c'}, '& .MuiTabs-indicator':{backgroundColor:'#1a3a5c'} }}>
          <Tab label="Request Order Summary" />
          <Tab label="Approved Order Summary" />
          <Tab label="Present Stock Summary" />
        </Tabs>
      </Box>

      <Card sx={{ borderRadius:2, boxShadow:1, mb:2 }}>
        <CardContent>
          <Box sx={{ display:'flex', gap:2, flexWrap:'wrap', alignItems:'center' }}>
            {/* Category */}
            <TextField select label="Category" size="small" value={selectedCategory}
              onChange={(e)=>{
                const cat=categories.find(c=>c.id===e.target.value);
                setSelectedCategory(e.target.value);
                setSelectedCategoryName(cat?.category_name||'');
                setSelectedCategoryType(cat?.category_type||'qpn');
                setSummaryData([]); setApprovedData([]); setPresentData([]); setSelectedShops([]);
              }} sx={{ minWidth:180 }}>
              {categories.map(cat=><MenuItem key={cat.id} value={cat.id}>{cat.category_name}</MenuItem>)}
            </TextField>

            {/* Filter */}
            <TextField select label="Filter" size="small" value={filter}
              onChange={(e)=>{ setFilter(e.target.value); setSummaryData([]); setApprovedData([]); setPresentData([]); }}
              sx={{ minWidth:140 }}>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>

            {/* FIX 1: Shop Multi-Select — driven by allShopsForFilter which includes ALL loaded shops */}
            {allShopsForFilter.length > 0 && (
              <FormControl size="small" sx={{ minWidth:220, maxWidth:320 }}>
                <InputLabel>Shop Filter (All if none)</InputLabel>
                <Select
                  multiple
                  value={selectedShops}
                  onChange={(e)=>setSelectedShops(typeof e.target.value==='string'?e.target.value.split(','):e.target.value)}
                  input={<OutlinedInput label="Shop Filter (All if none)" />}
                  renderValue={(selected)=>
                    selected.length===0 ? 'All Shops' :
                    selected.length <= 2 ? selected.join(', ') :
                    `${selected.length} shops selected`
                  }
                  MenuProps={{ PaperProps:{ style:{ maxHeight:300 } } }}
                >
                  {allShopsForFilter.map(shop=>(
                    <MenuItem key={shop} value={shop}>
                      <Checkbox checked={selectedShops.includes(shop)} size="small" />
                      <ListItemText primary={shop} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {selectedShops.length > 0 && (
              <Button size="small" onClick={()=>setSelectedShops([])} sx={{ color:'#999', fontSize:11 }}>
                Clear Filter
              </Button>
            )}

            {/* Generate */}
            <Button variant="contained" onClick={handleGenerate}
              sx={{ backgroundColor:activeTab===2?'#7b3f00':activeTab===1?'#1a5c3d':'#1a3a5c', fontWeight:600 }}>
              Generate Report
            </Button>

            {/* Tab 1 actions */}
            {activeTab===0 && isTab1HasData && <>
              <Button variant="outlined" onClick={downloadExcel1} sx={{ borderColor:'#1a5c3d', color:'#1a5c3d', fontWeight:600 }}>📥 Excel</Button>
              <Button variant="outlined" onClick={handlePrint1}   sx={{ borderColor:'#1a3a5c', color:'#1a3a5c', fontWeight:600 }}>🖨 Print</Button>
            </>}

            {/* Tab 2 actions */}
            {activeTab===1 && isTab2HasData && <>
              <Button variant="outlined" onClick={downloadExcel2} sx={{ borderColor:'#1a5c3d', color:'#1a5c3d', fontWeight:600 }}>📥 Excel</Button>
              <Button variant="outlined" onClick={handlePrint2}   sx={{ borderColor:'#1a5c3d', color:'#1a5c3d', fontWeight:600 }}>🖨 Print</Button>
            </>}

            {/* Tab 3 actions */}
            {activeTab===2 && isTab3HasData && <>
              <Button variant="outlined" onClick={downloadExcel3} sx={{ borderColor:'#7b3f00', color:'#7b3f00', fontWeight:600 }}>📥 Excel</Button>
              <Button variant="outlined" onClick={handlePrint3}   sx={{ borderColor:'#7b3f00', color:'#7b3f00', fontWeight:600 }}>🖨 Print</Button>
            </>}

            {/* Share */}
            {hasData && (
              <>
                <Button variant="outlined" onClick={(e)=>setShareAnchor(e.currentTarget)}
                  sx={{ borderColor:'#555', color:'#555', fontWeight:600 }}>
                  🔗 Share
                </Button>
                <Menu anchorEl={shareAnchor} open={Boolean(shareAnchor)} onClose={()=>setShareAnchor(null)}>
                  <MenuItem onClick={handleShareEmail}>
                    <ListItemIcon>📧</ListItemIcon>
                    <ListItemText>Share via Email</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleShareWhatsApp}>
                    <ListItemIcon>💬</ListItemIcon>
                    <ListItemText>Share via WhatsApp</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* TAB 1 */}
      {activeTab===0 && (loading
        ? <Box sx={{display:'flex',justifyContent:'center',p:8}}><CircularProgress/></Box>
        : isTab1HasData
          ? <Card sx={{borderRadius:2,boxShadow:1}}><CardContent>
              <Typography variant="h6" fontWeight={600} color="#1a3a5c" mb={1} textAlign="center">{selectedCategoryName} — Request Order Summary</Typography>
              <Typography variant="body2" color="text.secondary" mb={1} textAlign="center">Filter: {filter.charAt(0).toUpperCase()+filter.slice(1)}</Typography>
              {renderQPNSummary(getColTotal1, '#1a3a5c')}
              <Box mt={1.5}>{renderTable(scrollRef1,shops1,brands1,getQty1,getBrandColTotal1,getShopTotal1,getShopAmount1,getColTotal1,getNetTotal1,getNetAmount1,'#1a3a5c','#2a5278')}</Box>
            </CardContent></Card>
          : <Card sx={{borderRadius:2,boxShadow:1}}><CardContent sx={{textAlign:'center',py:8}}><Typography color="text.secondary">Select a category and filter, then click Generate Report</Typography></CardContent></Card>
      )}

      {/* TAB 2 */}
      {activeTab===1 && (approvedLoading
        ? <Box sx={{display:'flex',justifyContent:'center',p:8}}><CircularProgress sx={{color:'#1a5c3d'}}/></Box>
        : isTab2HasData
          ? <Card sx={{borderRadius:2,boxShadow:1}}><CardContent>
              <Typography variant="h6" fontWeight={600} color="#1a5c3d" mb={1} textAlign="center">{selectedCategoryName} — Approved Order Summary</Typography>
              <Typography variant="body2" color="text.secondary" mb={1} textAlign="center">Filter: {filter.charAt(0).toUpperCase()+filter.slice(1)}</Typography>
              {renderQPNSummary(getColTotal2, '#1a5c3d')}
              <Box mt={1.5}>{renderTable(scrollRef2,shops2,brands2,getQty2,getBrandColTotal2,getShopTotal2,getShopAmount2,getColTotal2,getNetTotal2,getNetAmount2,'#1a5c3d','#2d7a50')}</Box>
            </CardContent></Card>
          : <Card sx={{borderRadius:2,boxShadow:1}}><CardContent sx={{textAlign:'center',py:8}}><Typography color="text.secondary">Select a category and filter, then click Generate Report</Typography></CardContent></Card>
      )}

      {/* TAB 3 */}
      {activeTab===2 && (presentLoading
        ? <Box sx={{display:'flex',justifyContent:'center',p:8}}><CircularProgress sx={{color:'#7b3f00'}}/></Box>
        : isTab3HasData
          ? <Card sx={{borderRadius:2,boxShadow:1}}><CardContent>
              <Typography variant="h6" fontWeight={600} color="#7b3f00" mb={1} textAlign="center">{selectedCategoryName} — Present Stock Summary</Typography>
              <Typography variant="body2" color="text.secondary" mb={1} textAlign="center">Filter: {filter.charAt(0).toUpperCase()+filter.slice(1)}</Typography>
              {renderQPNSummary(getColTotal3, '#7b3f00')}
              <Box mt={1.5}>{renderTable(scrollRef3,shops3,brands3,getQty3,getBrandColTotal3,getShopTotal3,getShopAmount3,getColTotal3,getNetTotal3,getNetAmount3,'#7b3f00','#a0522d')}</Box>
            </CardContent></Card>
          : <Card sx={{borderRadius:2,boxShadow:1}}><CardContent sx={{textAlign:'center',py:8}}><Typography color="text.secondary">Select a category and filter, then click Generate Report</Typography></CardContent></Card>
      )}
    </Box>
  );
}
