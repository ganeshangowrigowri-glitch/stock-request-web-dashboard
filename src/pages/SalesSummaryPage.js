import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, MenuItem,
  TextField, Button, CircularProgress, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Chip, Checkbox, ListItemText, OutlinedInput,
  Select, FormControl, InputLabel, Tooltip, IconButton,
  Popover, List, ListItem, ListItemButton, ListItemIcon, Divider,
} from '@mui/material';
import { getSalesSummary, getCategories, getApprovedSummary, getPresentSummary } from '../api/index';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const QPN_COLS  = ['Q', 'P', 'N'];
const BEER_COLS = ['625ml Btl', '500ml Cane', '330ml Cane', '500ml Btl', '325ml Btl'];

// ── Icons (inline SVG to avoid extra deps) ───────────────────────────────────
const IconScrollTop = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/>
  </svg>
);
const IconShare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const IconScrollLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconScrollRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export default function SalesSummaryPage() {
  const [activeTab, setActiveTab] = useState(0);

  const [categories, setCategories]                     = useState([]);
  const [selectedCategory, setSelectedCategory]         = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [selectedCategoryType, setSelectedCategoryType] = useState('qpn');
  const [filter, setFilter]                             = useState('monthly');

  // ── NEW: Date filter ────────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // ── NEW: Shop filter ────────────────────────────────────────────────────────
  const [selectedShops, setSelectedShops] = useState([]); // [] = all shops

  const [summaryData, setSummaryData]         = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [approvedData, setApprovedData]       = useState([]);
  const [approvedLoading, setApprovedLoading] = useState(false);
  const [presentData, setPresentData]         = useState([]);
  const [presentLoading, setPresentLoading]   = useState(false);

  // ── NEW: Scroll refs ────────────────────────────────────────────────────────
  const tableContainerRef = useRef(null);
  const pageTopRef        = useRef(null);

  // ── NEW: Share popover ──────────────────────────────────────────────────────
  const [shareAnchor, setShareAnchor] = useState(null);

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

  // ── Build filter params (include date if both set) ──────────────────────────
  const buildParams = useCallback(() => {
    const params = { filter };
    if (dateFrom && dateTo) { params.date_from = dateFrom; params.date_to = dateTo; }
    return params;
  }, [filter, dateFrom, dateTo]);

  const fetchSummary = async () => {
    if (!selectedCategory) return;
    try { setLoading(true); const data = await getSalesSummary(selectedCategory, buildParams()); setSummaryData(data); }
    catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchApproved = async () => {
    if (!selectedCategory) return;
    try { setApprovedLoading(true); const data = await getApprovedSummary(selectedCategory, buildParams()); setApprovedData(data); }
    catch (error) { console.error(error); } finally { setApprovedLoading(false); }
  };

  const fetchPresent = async () => {
    if (!selectedCategory) return;
    try { setPresentLoading(true); const data = await getPresentSummary(selectedCategory, buildParams()); setPresentData(data); }
    catch (error) { console.error(error); } finally { setPresentLoading(false); }
  };

  const handleGenerate = () => {
    setSelectedShops([]); // reset shop filter on new generate
    if (activeTab === 0) fetchSummary();
    else if (activeTab === 1) fetchApproved();
    else fetchPresent();
  };

  // ── Scroll helpers ──────────────────────────────────────────────────────────
  const scrollTableLeft  = () => { if (tableContainerRef.current) tableContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' }); };
  const scrollTableRight = () => { if (tableContainerRef.current) tableContainerRef.current.scrollBy({ left:  300, behavior: 'smooth' }); };
  const scrollToTop      = () => { if (pageTopRef.current) pageTopRef.current.scrollIntoView({ behavior: 'smooth' }); };

  // ────────────────────────────────────────────────────────────────────────────
  // Brand order: preserve insertion order from raw data (NOT sorted alphabetically)
  // Use a helper that returns brands in the order they first appear in the data array
  const getBrandsOrdered = (data) => {
    const seen = new Set();
    const ordered = [];
    data.forEach(d => { if (!seen.has(d.brand_name)) { seen.add(d.brand_name); ordered.push(d.brand_name); } });
    return ordered;
  };

  // ── Tab 1 ───────────────────────────────────────────────────────────────────
  const allShops1  = [...new Set(summaryData.map(d => d.shop_name))];
  const brands1    = getBrandsOrdered(summaryData);
  const shops1     = selectedShops.length > 0 ? allShops1.filter(s => selectedShops.includes(s)) : allShops1;
  const getRow1    = (shop, brand) => summaryData.find(d => d.shop_name === shop && d.brand_name === brand);
  const getQty1    = (shop, brand, ci) => { const row = getRow1(shop,brand); if(!row) return 0; return parseInt(row[['qty_1','qty_2','qty_3','qty_4','qty_5'][ci]])||0; };
  const getBrandTotal1  = (shop, brand) => { const row = getRow1(shop,brand); return row ? parseInt(row.total_requested)||0 : 0; };
  const getShopTotal1   = (shop) => brands1.reduce((sum,brand) => sum+getBrandTotal1(shop,brand), 0);
  const getShopAmount1  = (shop) => summaryData.filter(d=>d.shop_name===shop).reduce((sum,d)=>sum+parseFloat(d.total_amount||0),0);

  // ── Tab 2 ───────────────────────────────────────────────────────────────────
  const allShops2  = [...new Set(approvedData.map(d => d.shop_name))];
  const brands2    = getBrandsOrdered(approvedData);
  const shops2     = selectedShops.length > 0 ? allShops2.filter(s => selectedShops.includes(s)) : allShops2;
  const getRow2    = (shop, brand) => approvedData.find(d => d.shop_name === shop && d.brand_name === brand);
  const getQty2    = (shop, brand, ci) => { const row = getRow2(shop,brand); if(!row) return 0; return parseInt(row[['qty_1','qty_2','qty_3','qty_4','qty_5'][ci]])||0; };
  const getBrandTotal2  = (shop, brand) => { const row = getRow2(shop,brand); return row ? parseInt(row.total_approved)||0 : 0; };
  const getShopTotal2   = (shop) => brands2.reduce((sum,brand) => sum+getBrandTotal2(shop,brand), 0);
  const getShopAmount2  = (shop) => approvedData.filter(d=>d.shop_name===shop).reduce((sum,d)=>sum+parseFloat(d.total_amount||0),0);
  const getNetTotal2    = () => shops2.reduce((s,shop) => s+getShopTotal2(shop), 0);
  const getNetAmount2   = () => shops2.reduce((s,shop) => s+getShopAmount2(shop), 0);

  // ── Tab 3 ───────────────────────────────────────────────────────────────────
  const allShops3  = [...new Set(presentData.map(d => d.shop_name))];
  const brands3    = getBrandsOrdered(presentData);
  const shops3     = selectedShops.length > 0 ? allShops3.filter(s => selectedShops.includes(s)) : allShops3;
  const getRow3    = (shop, brand) => presentData.find(d => d.shop_name === shop && d.brand_name === brand);
  const getQty3    = (shop, brand, ci) => { const row = getRow3(shop,brand); if(!row) return 0; return parseInt(row[['qty_1','qty_2','qty_3','qty_4','qty_5'][ci]])||0; };
  const getBrandTotal3  = (shop, brand) => { const row = getRow3(shop,brand); return row ? parseInt(row.total_present)||0 : 0; };
  const getShopTotal3   = (shop) => brands3.reduce((sum,brand) => sum+getBrandTotal3(shop,brand), 0);
  const getNetTotal3    = () => shops3.reduce((s,shop) => s+getShopTotal3(shop), 0);
  const getShopAmount3  = (shop) => presentData.filter(d=>d.shop_name===shop).reduce((sum,d)=>sum+parseFloat(d.total_amount||0),0);
  const getNetAmount3   = () => shops3.reduce((s,shop) => s+getShopAmount3(shop), 0);

  // ── Current active data helpers ─────────────────────────────────────────────
  const activeShopsAll   = activeTab===0 ? allShops1 : activeTab===1 ? allShops2 : allShops3;
  const isAnyData        = activeTab===0 ? summaryData.length>0 : activeTab===1 ? approvedData.length>0 : presentData.length>0;

  // ── Share helpers ───────────────────────────────────────────────────────────
  const getShareText = () => {
    const tabLabel = activeTab===0?'Request Order':activeTab===1?'Approved Order':'Present Stock';
    const fl = dateFrom&&dateTo ? `${dateFrom} to ${dateTo}` : filter;
    const activeShops = activeTab===0?shops1:activeTab===1?shops2:shops3;
    const activeBrands = activeTab===0?brands1:activeTab===1?brands2:brands3;
    const getShopTotalFn = activeTab===0?getShopTotal1:activeTab===1?getShopTotal2:getShopTotal3;
    const getShopAmountFn = activeTab===0?getShopAmount1:activeTab===1?getShopAmount2:getShopAmount3;
    const getNetTotalFn = activeTab===0?()=>0:activeTab===1?getNetTotal2:getNetTotal3;
    const getNetAmountFn = activeTab===0?()=>0:activeTab===1?getNetAmount2:getNetAmount3;

    let lines = [];
    lines.push(`📊 *${selectedCategoryName} — ${tabLabel} Summary*`);
    lines.push(`🗓 Filter: ${fl}`);
    if (selectedShops.length > 0) lines.push(`🏪 Shops: ${selectedShops.join(', ')}`);
    lines.push('');
    lines.push(`*Brands:* ${activeBrands.join(' | ')}`);
    lines.push('');
    activeShops.forEach(shop => {
      lines.push(`▸ ${shop}: ${getShopTotalFn(shop)} units | Rs. ${parseFloat(getShopAmountFn(shop)).toLocaleString('en-LK',{minimumFractionDigits:2})}`);
    });
    if (activeShops.length > 1) {
      lines.push('');
      lines.push(`*TOTAL: ${getNetTotalFn()} units | Rs. ${parseFloat(getNetAmountFn()).toLocaleString('en-LK',{minimumFractionDigits:2})}*`);
    }
    lines.push('');
    lines.push('_Generated from Order Summary System_');
    return lines.join('\n');
  };

  const handleShareWhatsApp = () => {
    const text = getShareText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    setShareAnchor(null);
  };

  const handleShareEmail = () => {
    const tabLabel = activeTab===0?'Request Order':activeTab===1?'Approved Order':'Present Stock';
    const subject = encodeURIComponent(`${selectedCategoryName} — ${tabLabel} Summary`);
    // Plain text version for email body
    const body = encodeURIComponent(getShareText().replace(/[*_]/g, ''));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
    setShareAnchor(null);
  };

  const handleCopyText = async () => {
    const text = getShareText().replace(/[*_]/g, '');
    try {
      await navigator.clipboard.writeText(text);
      alert('Report summary copied to clipboard!');
    } catch {
      prompt('Copy this text:', text);
    }
    setShareAnchor(null);
  };

  const handleShareDownloadAndShare = () => {
    if (activeTab===0) downloadExcel1();
    else if (activeTab===1) downloadExcel2();
    else downloadExcel3();
    setShareAnchor(null);
  };

  // ── Filter label for display/export ────────────────────────────────────────
  const filterLabel = dateFrom && dateTo
    ? `${dateFrom} → ${dateTo}`
    : filter.charAt(0).toUpperCase() + filter.slice(1);

  // ── Excel helpers ───────────────────────────────────────────────────────────
  const buildExcel = (title, sheetName, fileName, shops, brands, getQty, getShopTotal, getShopAmount, getNetTotal, getNetAmount, showTotalRow) => {
    const wb = XLSX.utils.book_new();
    const wsData = [];
    wsData.push([title]);
    wsData.push([`Filter: ${filterLabel}`]);
    if (selectedShops.length > 0) wsData.push([`Shops: ${selectedShops.join(', ')}`]);
    wsData.push([]);
    const h1 = ['Bar Name'];
    brands.forEach(b => { h1.push(b); for(let i=1;i<columns.length;i++) h1.push(''); });
    h1.push('Shop Total'); h1.push('Amount (Rs.)');
    wsData.push(h1);
    const h2 = [''];
    brands.forEach(() => columns.forEach(c => h2.push(c)));
    h2.push(''); h2.push('');
    wsData.push(h2);
    shops.forEach(shop => {
      const row = [shop];
      brands.forEach(brand => columns.forEach((c,ci) => row.push(getQty(shop,brand,ci)||0)));
      row.push(getShopTotal(shop));
      row.push(parseFloat(getShopAmount(shop)).toFixed(2));
      wsData.push(row);
    });
    if (showTotalRow) {
      const totalRow = ['TOTAL'];
      brands.forEach(brand => columns.forEach((c,ci) =>
        totalRow.push(shops.reduce((s,shop)=>s+getQty(shop,brand,ci),0))
      ));
      totalRow.push(getNetTotal());
      totalRow.push(parseFloat(getNetAmount()).toFixed(2));
      wsData.push(totalRow);
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const merges = []; let cs = 1;
    const headerRow = selectedShops.length > 0 ? 4 : 3;
    brands.forEach(() => { merges.push({s:{r:headerRow,c:cs},e:{r:headerRow,c:cs+columns.length-1}}); cs+=columns.length; });
    ws['!merges'] = merges;
    ws['!cols'] = [{wch:20},...brands.flatMap(()=>columns.map(()=>({wch:12}))),{wch:12},{wch:15}];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buf = XLSX.write(wb, {bookType:'xlsx',type:'array'});
    saveAs(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), fileName);
  };

  const downloadExcel1 = () => buildExcel(
    `${selectedCategoryName} Request Order Summary`, 'Request Summary',
    `${selectedCategoryName}_Request_Summary_${filter}.xlsx`,
    shops1, brands1, getQty1, getShopTotal1, getShopAmount1, ()=>0, ()=>0, false
  );
  const downloadExcel2 = () => buildExcel(
    `${selectedCategoryName} Approved Order Summary`, 'Approved Summary',
    `${selectedCategoryName}_Approved_Summary_${filter}.xlsx`,
    shops2, brands2, getQty2, getShopTotal2, getShopAmount2, getNetTotal2, getNetAmount2, true
  );
  const downloadExcel3 = () => buildExcel(
    `${selectedCategoryName} Present Stock Summary`, 'Present Stock',
    `${selectedCategoryName}_Present_Stock_${filter}.xlsx`,
    shops3, brands3, getQty3, getShopTotal3, getShopAmount3, getNetTotal3, getNetAmount3, true
  );

  // ── Print HTML builder (shared by print + PDF share) ───────────────────────
  const buildPrintHTML = (title, color, subColor, shops, brands, getQty, getShopTotal, getShopAmount, getNetTotal, getNetAmount, showTotalRow) =>
    `<!DOCTYPE html><html><head>
      <title>${title}</title>
      <style>
        @page{size:landscape;margin:8mm}*{box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:9px}
        h2{text-align:center;color:${color};margin:0 0 2px 0;font-size:14px}
        p{text-align:center;color:#666;margin:0 0 6px 0;font-size:9px}
        table{width:100%;border-collapse:collapse}
        th{background:${color};color:white;padding:4px 3px;text-align:center;font-size:8px;border:1px solid #ccc}
        td{padding:3px;text-align:center;border:1px solid #ddd;font-size:8px}
        td:first-child{text-align:left;font-weight:bold}
        tr:nth-child(even){background:#f9fafb}
        .total-row{background:#fde8d0!important;font-weight:bold}
      </style></head><body>
      <h2>${title}</h2>
      <p>Filter: ${filterLabel}${selectedShops.length>0?' | Shops: '+selectedShops.join(', '):''}</p>
      <table><thead>
        <tr>
          <th rowspan="2">Bar Name</th>
          ${brands.map(b=>`<th colspan="${columns.length}" style="background:${color};">${b}</th>`).join('')}
          <th rowspan="2">Shop Total</th>
          <th rowspan="2">Amount (Rs.)</th>
        </tr>
        <tr>
          ${brands.map(()=>columns.map(c=>`<th style="background:${subColor};">${c}</th>`).join('')).join('')}
        </tr>
      </thead><tbody>
        ${shops.map((shop,si)=>`
          <tr style="background:${si%2===0?'white':'#f9fafb'}">
            <td>${shop}</td>
            ${brands.map(brand=>columns.map((c,ci)=>`<td>${getQty(shop,brand,ci)||'-'}</td>`).join('')).join('')}
            <td style="font-weight:bold;color:${color};">${getShopTotal(shop)}</td>
            <td style="font-weight:bold;color:#1a5c3d;">${parseFloat(getShopAmount(shop)).toLocaleString('en-LK',{minimumFractionDigits:2})}</td>
          </tr>`).join('')}
        ${showTotalRow?`<tr class="total-row">
          <td>TOTAL</td>
          ${brands.map(brand=>columns.map((c,ci)=>`<td>${shops.reduce((s,shop)=>s+getQty(shop,brand,ci),0)||'-'}</td>`).join('')).join('')}
          <td>${getNetTotal()}</td>
          <td>${parseFloat(getNetAmount()).toLocaleString('en-LK',{minimumFractionDigits:2})}</td>
        </tr>`:''}
      </tbody></table></body></html>`;

  const buildPrint = (title, color, subColor, shops, brands, getQty, getShopTotal, getShopAmount, getNetTotal, getNetAmount, showTotalRow) => {
    const html = buildPrintHTML(title, color, subColor, shops, brands, getQty, getShopTotal, getShopAmount, getNetTotal, getNetAmount, showTotalRow);
    const pw = window.open('', '_blank');
    pw.document.write(html);
    pw.document.close(); pw.focus();
    setTimeout(()=>{pw.print();pw.close();},500);
  };

  // ── Get current tab args for print/pdf ─────────────────────────────────────
  const getCurrentPrintArgs = () => {
    if (activeTab===0) return [`${selectedCategoryName} — Request Order Summary`,  '#1a3a5c','#2a5278', shops1,brands1,getQty1,getShopTotal1,getShopAmount1,()=>0,()=>0,false];
    if (activeTab===1) return [`${selectedCategoryName} — Approved Order Summary`, '#1a5c3d','#2d7a50', shops2,brands2,getQty2,getShopTotal2,getShopAmount2,getNetTotal2,getNetAmount2,true];
    return                    [`${selectedCategoryName} — Present Stock Summary`,  '#7b3f00','#a0522d', shops3,brands3,getQty3,getShopTotal3,getShopAmount3,getNetTotal3,getNetAmount3,true];
  };

  // ── PDF Blob via hidden iframe print-to-blob (Web Share API with file) ──────
  // Strategy:
  //   1. Build HTML → open in hidden iframe → use window.print() won't give us blob.
  //   Instead we use: HTML Blob → open in new tab → user prints to PDF from there.
  //   For Web Share API (Android/iOS): share HTML file directly as .html which opens in browser.
  //   For desktop: open print window so user saves as PDF, then we open WA/Email separately.

  const getPDFFileName = () => {
    const tabLabel = activeTab===0?'Request_Order':activeTab===1?'Approved_Order':'Present_Stock';
    return `${selectedCategoryName}_${tabLabel}_${filter}.pdf`;
  };

  const getHTMLFileName = () => {
    const tabLabel = activeTab===0?'Request_Order':activeTab===1?'Approved_Order':'Present_Stock';
    return `${selectedCategoryName}_${tabLabel}_${filter}.html`;
  };

  // Share PDF via Web Share API (works on Android Chrome, iOS Safari)
  // Falls back gracefully on desktop
  const handleSharePDFWhatsApp = async () => {
    setShareAnchor(null);
    const args = getCurrentPrintArgs();
    const html = buildPrintHTML(...args);
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const htmlFile = new File([htmlBlob], getHTMLFileName(), { type: 'text/html' });

    // Try Web Share API with file (Android/iOS)
    if (navigator.canShare && navigator.canShare({ files: [htmlFile] })) {
      try {
        await navigator.share({
          files: [htmlFile],
          title: args[0],
          text: getShareText().replace(/[*_]/g,''),
        });
        return;
      } catch(e) { /* cancelled or failed, fall through */ }
    }

    // Desktop fallback: open print window (save as PDF) + open WhatsApp with text
    const pw = window.open('', '_blank');
    pw.document.write(html);
    pw.document.close();
    pw.focus();
    // Small delay so print dialog opens first, then WhatsApp in background
    setTimeout(() => {
      pw.print();
      // After a moment open WhatsApp with summary text
      setTimeout(() => {
        const text = getShareText();
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }, 1000);
    }, 400);
  };

  const handleSharePDFEmail = async () => {
    setShareAnchor(null);
    const args = getCurrentPrintArgs();
    const html = buildPrintHTML(...args);
    const htmlBlob = new Blob([html], { type: 'text/html' });
    const htmlFile = new File([htmlBlob], getHTMLFileName(), { type: 'text/html' });

    // Try Web Share API with file (Android/iOS)
    if (navigator.canShare && navigator.canShare({ files: [htmlFile] })) {
      try {
        await navigator.share({
          files: [htmlFile],
          title: args[0],
          text: getShareText().replace(/[*_]/g,''),
        });
        return;
      } catch(e) { /* cancelled or failed, fall through */ }
    }

    // Desktop fallback: open print window (save as PDF) + open mailto
    const pw = window.open('', '_blank');
    pw.document.write(html);
    pw.document.close();
    pw.focus();
    setTimeout(() => {
      pw.print();
      const tabLabel = activeTab===0?'Request Order':activeTab===1?'Approved Order':'Present Stock';
      const subject = encodeURIComponent(`${selectedCategoryName} — ${tabLabel} Summary`);
      const body = encodeURIComponent(
        getShareText().replace(/[*_]/g,'') +
        '\n\n(Please attach the PDF you just saved from the print dialog)'
      );
      setTimeout(() => {
        window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
      }, 1000);
    }, 400);
  };

  const handlePrint1 = () => buildPrint(`${selectedCategoryName} — Request Order Summary`,  '#1a3a5c','#2a5278', shops1,brands1,getQty1,getShopTotal1,getShopAmount1,()=>0,()=>0,false);
  const handlePrint2 = () => buildPrint(`${selectedCategoryName} — Approved Order Summary`, '#1a5c3d','#2d7a50', shops2,brands2,getQty2,getShopTotal2,getShopAmount2,getNetTotal2,getNetAmount2,true);
  const handlePrint3 = () => buildPrint(`${selectedCategoryName} — Present Stock Summary`,  '#7b3f00','#a0522d', shops3,brands3,getQty3,getShopTotal3,getShopAmount3,getNetTotal3,getNetAmount3,true);

  const isTab1HasData = summaryData.length > 0;
  const isTab2HasData = approvedData.length > 0;
  const isTab3HasData = presentData.length > 0;

  // ── Reusable Table ──────────────────────────────────────────────────────────
  const renderTable = (shops, brands, getQty, getShopTotal, getShopAmount, getNetTotal, getNetAmount, headerColor, subColor, showAmount, showTotalRow) => (
    <Box sx={{ position: 'relative' }}>
      {/* Scroll Navigation Bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 1, py: 0.5, mb: 0.5,
        backgroundColor: '#f0f0f0', borderRadius: 1,
        border: '1px solid #e0e0e0',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Scroll table left">
            <IconButton size="small" onClick={scrollTableLeft}
              sx={{ backgroundColor: headerColor, color: 'white', width: 26, height: 26,
                '&:hover': { backgroundColor: headerColor, opacity: 0.85 } }}>
              <IconScrollLeft />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5, fontSize: 10 }}>
            ← Scroll →
          </Typography>
          <Tooltip title="Scroll table right">
            <IconButton size="small" onClick={scrollTableRight}
              sx={{ backgroundColor: headerColor, color: 'white', width: 26, height: 26,
                '&:hover': { backgroundColor: headerColor, opacity: 0.85 } }}>
              <IconScrollRight />
            </IconButton>
          </Tooltip>
        </Box>
        <Tooltip title="Back to top">
          <IconButton size="small" onClick={scrollToTop}
            sx={{ backgroundColor: '#555', color: 'white', width: 26, height: 26,
              '&:hover': { backgroundColor: '#333' } }}>
            <IconScrollTop />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Table */}
      <TableContainer ref={tableContainerRef} sx={{ overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} sx={{ backgroundColor: headerColor, color:'white', fontWeight:600, minWidth:160, position:'sticky', left:0, zIndex:4 }}>
                Bar Name
              </TableCell>
              {brands.map(brand => (
                <TableCell key={brand} colSpan={columns.length} align="center"
                  sx={{ backgroundColor: subColor, color:'white', fontWeight:600, fontSize:11, borderLeft:`1px solid ${headerColor}`, zIndex:3 }}>
                  {brand}
                </TableCell>
              ))}
              <TableCell rowSpan={2} align="center"
                sx={{ backgroundColor: headerColor, color:'white', fontWeight:600, minWidth:80, zIndex:3 }}>
                Shop Total
              </TableCell>
              {showAmount && (
                <TableCell rowSpan={2} align="center"
                  sx={{ backgroundColor: headerColor, color:'white', fontWeight:600, minWidth:130, zIndex:3 }}>
                  Amount (Rs.)
                </TableCell>
              )}
            </TableRow>
            <TableRow>
              {brands.map(brand => (
                <React.Fragment key={brand}>
                  {columns.map((col, i) => (
                    <TableCell key={`${brand}-${col}`} align="center"
                      sx={{ backgroundColor: subColor, color:'white', fontSize:10, fontWeight:500, minWidth:55,
                        borderLeft:i===0?`1px solid ${headerColor}`:'none', top: 37, zIndex:3 }}>
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
                <TableCell sx={{ fontWeight:500, fontSize:12, position:'sticky', left:0,
                  backgroundColor:si%2===0?'white':'#f9fafb', zIndex:1, borderRight:`2px solid ${headerColor}` }}>
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
                <TableCell align="center" sx={{ fontWeight:600, fontSize:12, color: headerColor }}>
                  {getShopTotal(shop)}
                </TableCell>
                {showAmount && (
                  <TableCell align="center" sx={{ fontWeight:600, fontSize:12, color:'#1a5c3d' }}>
                    {parseFloat(getShopAmount(shop)).toLocaleString('en-LK', { minimumFractionDigits:2 })}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {showTotalRow && (
              <TableRow sx={{ backgroundColor: '#fde8d0' }}>
                <TableCell sx={{ fontWeight:700, fontSize:12, color: headerColor, position:'sticky', left:0,
                  backgroundColor:'#fde8d0', zIndex:1, borderRight:`2px solid ${headerColor}` }}>
                  TOTAL
                </TableCell>
                {brands.map(brand => (
                  <React.Fragment key={brand}>
                    {columns.map((col, ci) => (
                      <TableCell key={`total-${brand}-${ci}`} align="center"
                        sx={{ fontWeight:600, fontSize:12, color: headerColor, borderLeft:ci===0?'1px solid #e0e0e0':'none' }}>
                        {shops.reduce((s,shop)=>s+getQty(shop,brand,ci),0)||'-'}
                      </TableCell>
                    ))}
                  </React.Fragment>
                ))}
                <TableCell align="center" sx={{ fontWeight:700, fontSize:12, color: headerColor }}>
                  {getNetTotal()}
                </TableCell>
                {showAmount && (
                  <TableCell align="center" sx={{ fontWeight:700, fontSize:12, color:'#1a5c3d' }}>
                    {parseFloat(getNetAmount()).toLocaleString('en-LK', { minimumFractionDigits:2 })}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const accentColor = activeTab===2?'#7b3f00':activeTab===1?'#1a5c3d':'#1a3a5c';

  return (
    <Box ref={pageTopRef} sx={{ p:3, backgroundColor:'#f5f6fa', minHeight:'100vh' }}>
      <Typography variant="h5" fontWeight={600} mb={3} color="#1a3a5c">
        Order Summary
      </Typography>

      <Box sx={{ borderBottom:1, borderColor:'divider', mb:2 }}>
        <Tabs value={activeTab}
          onChange={(e,val) => { setActiveTab(val); setSummaryData([]); setApprovedData([]); setPresentData([]); setSelectedShops([]); }}
          sx={{ '& .MuiTab-root':{fontWeight:600,textTransform:'none',fontSize:14},
            '& .Mui-selected':{color:'#1a3a5c'}, '& .MuiTabs-indicator':{backgroundColor:'#1a3a5c'} }}
        >
          <Tab label="Request Order Summary" />
          <Tab label="Approved Order Summary" />
          <Tab label="Present Stock Summary" />
        </Tabs>
      </Box>

      {/* ── Controls Card ─────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius:2, boxShadow:1, mb:2 }}>
        <CardContent>
          {/* Row 1: Category, Filter type, Date range, Generate */}
          <Box sx={{ display:'flex', gap:2, flexWrap:'wrap', alignItems:'center', mb: 1.5 }}>
            <TextField select label="Category" size="small" value={selectedCategory}
              onChange={(e) => {
                const cat = categories.find(c => c.id === e.target.value);
                setSelectedCategory(e.target.value);
                setSelectedCategoryName(cat?.category_name||'');
                setSelectedCategoryType(cat?.category_type||'qpn');
                setSummaryData([]); setApprovedData([]); setPresentData([]); setSelectedShops([]);
              }} sx={{ minWidth:180 }}>
              {categories.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.category_name}</MenuItem>)}
            </TextField>

            <TextField select label="Filter" size="small" value={filter}
              onChange={(e) => { setFilter(e.target.value); setSummaryData([]); setApprovedData([]); setPresentData([]); setSelectedShops([]); }}
              sx={{ minWidth:140 }}>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </TextField>

            {/* ── NEW: Date range ── */}
            <TextField
              label="From Date" type="date" size="small"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setSummaryData([]); setApprovedData([]); setPresentData([]); setSelectedShops([]); }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 155 }}
            />
            <TextField
              label="To Date" type="date" size="small"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setSummaryData([]); setApprovedData([]); setPresentData([]); setSelectedShops([]); }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: dateFrom || undefined }}
              sx={{ minWidth: 155 }}
            />
            {(dateFrom || dateTo) && (
              <Tooltip title="Clear date filter">
                <Button size="small" variant="text" onClick={() => { setDateFrom(''); setDateTo(''); }}
                  sx={{ color:'#888', minWidth: 0, px:1, fontSize:11 }}>
                  ✕ Clear dates
                </Button>
              </Tooltip>
            )}

            <Button variant="contained" onClick={handleGenerate}
              sx={{ backgroundColor: accentColor, fontWeight:600, '&:hover':{ backgroundColor: accentColor, opacity:0.9 } }}>
              Generate Report
            </Button>
          </Box>

          {/* Row 2: Action buttons + Shop filter (only after data loaded) */}
          {isAnyData && (
            <Box sx={{ display:'flex', gap:1.5, flexWrap:'wrap', alignItems:'center' }}>

              {/* ── NEW: Shop filter multi-select ── */}
              <FormControl size="small" sx={{ minWidth: 220, maxWidth: 340 }}>
                <InputLabel id="shop-filter-label">Filter Shops</InputLabel>
                <Select
                  labelId="shop-filter-label"
                  multiple
                  value={selectedShops}
                  onChange={(e) => setSelectedShops(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  input={<OutlinedInput label="Filter Shops" />}
                  renderValue={(selected) =>
                    selected.length === 0
                      ? 'All shops'
                      : selected.length === 1
                      ? selected[0]
                      : `${selected.length} shops selected`
                  }
                  MenuProps={{ PaperProps: { style: { maxHeight: 320 } } }}
                >
                  {activeShopsAll.map(shop => (
                    <MenuItem key={shop} value={shop} dense>
                      <Checkbox checked={selectedShops.includes(shop)} size="small" sx={{ py:0 }}/>
                      <ListItemText primary={shop} primaryTypographyProps={{ fontSize:13 }} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedShops.length > 0 && (
                <Chip
                  label={`${selectedShops.length} shop${selectedShops.length>1?'s':''} selected`}
                  size="small"
                  onDelete={() => setSelectedShops([])}
                  sx={{ backgroundColor: accentColor, color:'white', '& .MuiChip-deleteIcon':{ color:'rgba(255,255,255,0.7)' } }}
                />
              )}

              <Box sx={{ flex:1 }} />

              {/* Download / Print / Share */}
              {activeTab===0 && <>
                <Button variant="outlined" onClick={downloadExcel1} size="small"
                  sx={{ borderColor:'#1a5c3d', color:'#1a5c3d', fontWeight:600 }}>📥 Download Excel</Button>
                <Button variant="outlined" onClick={handlePrint1} size="small"
                  sx={{ borderColor:'#1a3a5c', color:'#1a3a5c', fontWeight:600 }}>🖨 Print</Button>
              </>}
              {activeTab===1 && <>
                <Button variant="outlined" onClick={downloadExcel2} size="small"
                  sx={{ borderColor:'#1a5c3d', color:'#1a5c3d', fontWeight:600 }}>📥 Download Excel</Button>
                <Button variant="outlined" onClick={handlePrint2} size="small"
                  sx={{ borderColor:'#1a5c3d', color:'#1a5c3d', fontWeight:600 }}>🖨 Print</Button>
              </>}
              {activeTab===2 && <>
                <Button variant="outlined" onClick={downloadExcel3} size="small"
                  sx={{ borderColor:'#7b3f00', color:'#7b3f00', fontWeight:600 }}>📥 Download Excel</Button>
                <Button variant="outlined" onClick={handlePrint3} size="small"
                  sx={{ borderColor:'#7b3f00', color:'#7b3f00', fontWeight:600 }}>🖨 Print</Button>
              </>}

              {/* ── NEW: Share button ── */}
              <Button variant="outlined" size="small"
                onClick={(e) => setShareAnchor(e.currentTarget)}
                sx={{ borderColor: accentColor, color: accentColor, fontWeight:600, display:'flex', gap:0.5, alignItems:'center' }}>
                <IconShare /> Share
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Share Popover ─────────────────────────────────────────────────── */}
      <Popover
        open={Boolean(shareAnchor)}
        anchorEl={shareAnchor}
        onClose={() => setShareAnchor(null)}
        anchorOrigin={{ vertical:'bottom', horizontal:'right' }}
        transformOrigin={{ vertical:'top', horizontal:'right' }}
        PaperProps={{ sx:{ borderRadius:2, boxShadow:6, minWidth:240 } }}
      >
        <Box sx={{ p:1 }}>
          <Typography variant="caption" sx={{ px:1.5, py:0.5, display:'block', fontWeight:700, color:'#333', fontSize:12 }}>
            Share Report
          </Typography>
          <Divider sx={{ mb:0.5 }} />
          <List dense disablePadding>

            {/* ── WhatsApp section ── */}
            <ListItemButton onClick={handleShareWhatsApp}
              sx={{ borderRadius:1, '&:hover':{ backgroundColor:'#e7f9ee' }, py:0.8 }}>
              <ListItemIcon sx={{ minWidth:36 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </ListItemIcon>
              <ListItemText
                primary="WhatsApp — Send summary text"
                secondary="Share report details as message"
                primaryTypographyProps={{ fontSize:12, fontWeight:600, color:'#128C7E' }}
                secondaryTypographyProps={{ fontSize:10 }}
              />
            </ListItemButton>

            <ListItemButton onClick={handleSharePDFWhatsApp}
              sx={{ borderRadius:1, '&:hover':{ backgroundColor:'#e7f9ee' }, py:0.8, pl:3 }}>
              <ListItemIcon sx={{ minWidth:36 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </ListItemIcon>
              <ListItemText
                primary="WhatsApp — Share as PDF"
                secondary={navigator.canShare ? "📱 Direct file share (mobile) or save PDF → attach" : "💻 Save PDF from print dialog → attach to WhatsApp"}
                primaryTypographyProps={{ fontSize:12, fontWeight:600, color:'#128C7E' }}
                secondaryTypographyProps={{ fontSize:10 }}
              />
            </ListItemButton>

            <Divider sx={{ my:0.5 }} />

            {/* ── Email section ── */}
            <ListItemButton onClick={handleShareEmail}
              sx={{ borderRadius:1, '&:hover':{ backgroundColor:'#fff3e0' }, py:0.8 }}>
              <ListItemIcon sx={{ minWidth:36 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EA4335" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </ListItemIcon>
              <ListItemText
                primary="Email — Send summary text"
                secondary="Open mail app with report details"
                primaryTypographyProps={{ fontSize:12, fontWeight:600, color:'#EA4335' }}
                secondaryTypographyProps={{ fontSize:10 }}
              />
            </ListItemButton>

            <ListItemButton onClick={handleSharePDFEmail}
              sx={{ borderRadius:1, '&:hover':{ backgroundColor:'#fff3e0' }, py:0.8, pl:3 }}>
              <ListItemIcon sx={{ minWidth:36 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EA4335" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </ListItemIcon>
              <ListItemText
                primary="Email — Share as PDF"
                secondary={navigator.canShare ? "📱 Direct file share (mobile) or save PDF → attach" : "💻 Save PDF from print dialog → attach to email"}
                primaryTypographyProps={{ fontSize:12, fontWeight:600, color:'#EA4335' }}
                secondaryTypographyProps={{ fontSize:10 }}
              />
            </ListItemButton>

            <Divider sx={{ my:0.5 }} />

            {/* Copy text */}
            <ListItemButton onClick={handleCopyText}
              sx={{ borderRadius:1, '&:hover':{ backgroundColor:'#f5f5f5' }, py:0.8 }}>
              <ListItemIcon sx={{ minWidth:36 }}>
                <Box sx={{ fontSize:18, lineHeight:1 }}>📋</Box>
              </ListItemIcon>
              <ListItemText
                primary="Copy summary text"
                secondary="Copy to clipboard"
                primaryTypographyProps={{ fontSize:12, fontWeight:600 }}
                secondaryTypographyProps={{ fontSize:10 }}
              />
            </ListItemButton>

            {/* Download Excel */}
            <ListItemButton onClick={handleShareDownloadAndShare}
              sx={{ borderRadius:1, '&:hover':{ backgroundColor:'#f5f5f5' }, py:0.8 }}>
              <ListItemIcon sx={{ minWidth:36 }}>
                <Box sx={{ fontSize:18, lineHeight:1 }}>📊</Box>
              </ListItemIcon>
              <ListItemText
                primary="Download Excel"
                secondary="Save & share .xlsx file"
                primaryTypographyProps={{ fontSize:12, fontWeight:600 }}
                secondaryTypographyProps={{ fontSize:10 }}
              />
            </ListItemButton>

            {/* Print / PDF */}
            <ListItemButton
              onClick={() => { if(activeTab===0) handlePrint1(); else if(activeTab===1) handlePrint2(); else handlePrint3(); setShareAnchor(null); }}
              sx={{ borderRadius:1, '&:hover':{ backgroundColor:'#f5f5f5' }, py:0.8 }}>
              <ListItemIcon sx={{ minWidth:36 }}>
                <Box sx={{ fontSize:18, lineHeight:1 }}>🖨</Box>
              </ListItemIcon>
              <ListItemText
                primary="Print / Save as PDF"
                secondary="Export to PDF & share"
                primaryTypographyProps={{ fontSize:12, fontWeight:600 }}
                secondaryTypographyProps={{ fontSize:10 }}
              />
            </ListItemButton>

          </List>
        </Box>
      </Popover>

      {/* ── TAB 1 ─────────────────────────────────────────────────────────── */}
      {activeTab===0 && (
        loading
          ? <Box sx={{display:'flex',justifyContent:'center',p:8}}><CircularProgress/></Box>
          : isTab1HasData
            ? <Card sx={{borderRadius:2,boxShadow:1}}><CardContent>
                <Typography variant="h6" fontWeight={600} color="#1a3a5c" mb={0.5} textAlign="center">
                  {selectedCategoryName} — Request Order Summary
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
                  Filter: {filterLabel}{selectedShops.length>0?` · ${selectedShops.length} shops`:` · ${shops1.length} shops`}
                </Typography>
                {renderTable(shops1,brands1,getQty1,getShopTotal1,getShopAmount1,()=>0,()=>0,'#1a3a5c','#2a5278',true,false)}
              </CardContent></Card>
            : <Card sx={{borderRadius:2,boxShadow:1}}><CardContent sx={{textAlign:'center',py:8}}>
                <Typography color="text.secondary">Select a category and filter, then click Generate Report</Typography>
              </CardContent></Card>
      )}

      {/* ── TAB 2 ─────────────────────────────────────────────────────────── */}
      {activeTab===1 && (
        approvedLoading
          ? <Box sx={{display:'flex',justifyContent:'center',p:8}}><CircularProgress sx={{color:'#1a5c3d'}}/></Box>
          : isTab2HasData
            ? <Card sx={{borderRadius:2,boxShadow:1}}><CardContent>
                <Typography variant="h6" fontWeight={600} color="#1a5c3d" mb={0.5} textAlign="center">
                  {selectedCategoryName} — Approved Order Summary
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
                  Filter: {filterLabel}{selectedShops.length>0?` · ${selectedShops.length} shops`:` · ${shops2.length} shops`}
                </Typography>
                {renderTable(shops2,brands2,getQty2,getShopTotal2,getShopAmount2,getNetTotal2,getNetAmount2,'#1a5c3d','#2d7a50',true,true)}
              </CardContent></Card>
            : <Card sx={{borderRadius:2,boxShadow:1}}><CardContent sx={{textAlign:'center',py:8}}>
                <Typography color="text.secondary">Select a category and filter, then click Generate Report</Typography>
              </CardContent></Card>
      )}

      {/* ── TAB 3 ─────────────────────────────────────────────────────────── */}
      {activeTab===2 && (
        presentLoading
          ? <Box sx={{display:'flex',justifyContent:'center',p:8}}><CircularProgress sx={{color:'#7b3f00'}}/></Box>
          : isTab3HasData
            ? <Card sx={{borderRadius:2,boxShadow:1}}><CardContent>
                <Typography variant="h6" fontWeight={600} color="#7b3f00" mb={0.5} textAlign="center">
                  {selectedCategoryName} — Present Stock Summary
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
                  Filter: {filterLabel}{selectedShops.length>0?` · ${selectedShops.length} shops`:` · ${shops3.length} shops`}
                </Typography>
                {renderTable(shops3,brands3,getQty3,getShopTotal3,getShopAmount3,getNetTotal3,getNetAmount3,'#7b3f00','#a0522d',true,true)}
              </CardContent></Card>
            : <Card sx={{borderRadius:2,boxShadow:1}}><CardContent sx={{textAlign:'center',py:8}}>
                <Typography color="text.secondary">Select a category and filter, then click Generate Report</Typography>
              </CardContent></Card>
      )}
    </Box>
  );
}
