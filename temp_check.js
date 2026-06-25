
/* ═══════════════════════════════════════════ */
/*  STATE                                      */
/* ═══════════════════════════════════════════ */
let styles = [];
let activeIdx = -1;
let uploadedFiles = [];  // {file, serverName, previewUrl}
let validGatiSizes = []; // loaded from backend Gati DB

// Zoom & Pan state for image viewer
let validGatiSizes = []; // loaded from backend Gati DB

// Zoom & Pan state for image viewer
let zoomScale = 1.0;
let panX = 0;
let panY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

function updateTransform() {
  const wrapper = document.getElementById('viewer-wrapper');
  if (!wrapper) return;
  wrapper.style.transition = isPanning ? 'none' : 'transform 0.15s ease-out';
  wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
}

function adjustZoom(amount) {
  const container = document.getElementById('image-viewer-container');
  const wrapper = document.getElementById('viewer-wrapper');
  if (!container || !wrapper) return;
  
  zoomScale = Math.max(1.0, Math.min(5.0, zoomScale + amount));
  
  if (zoomScale === 1.0) {
    panX = 0;
    panY = 0;
    wrapper.style.cursor = 'zoom-in';
  } else {
    wrapper.style.cursor = 'grab';
    const rect = container.getBoundingClientRect();
    const limitX = Math.max(0, (rect.width * zoomScale - rect.width) / 2);
    const limitY = Math.max(0, (rect.height * zoomScale - rect.height) / 2);
    panX = Math.max(-limitX, Math.min(limitX, panX));
    panY = Math.max(-limitY, Math.min(limitY, panY));
  }
  updateTransform();
}

function resetZoom() {
  zoomScale = 1.0;
  panX = 0;
  panY = 0;
  const wrapper = document.getElementById('viewer-wrapper');
  if (wrapper) wrapper.style.cursor = 'zoom-in';
  updateTransform();
}

function initPanZoom() {
  const container = document.getElementById('image-viewer-container');
  const wrapper = document.getElementById('viewer-wrapper');
  if (!container || !wrapper) return;
  
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || zoomScale <= 1.0) return;
    e.preventDefault();
    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    wrapper.style.cursor = 'grabbing';
  });
  
  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const rect = container.getBoundingClientRect();
    const limitX = Math.max(0, (rect.width * zoomScale - rect.width) / 2);
    const limitY = Math.max(0, (rect.height * zoomScale - rect.height) / 2);
    
    panX = Math.max(-limitX, Math.min(limitX, e.clientX - startX));
    panY = Math.max(-limitY, Math.min(limitY, e.clientY - startY));
    updateTransform();
  });
  
  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      wrapper.style.cursor = zoomScale > 1.0 ? 'grab' : 'zoom-in';
    }
  });
  
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    adjustZoom(delta);
  }, { passive: false });
  
  container.addEventListener('dblclick', (e) => {
    if (zoomScale > 1.0) {
      resetZoom();
    } else {
      zoomScale = 2.0;
      wrapper.style.cursor = 'grab';
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left - rect.width / 2;
      const clickY = e.clientY - rect.top - rect.height / 2;
      
      panX = -clickX;
      panY = -clickY;
      
      const limitX = Math.max(0, (rect.width * zoomScale - rect.width) / 2);
      const limitY = Math.max(0, (rect.height * zoomScale - rect.height) / 2);
      panX = Math.max(-limitX, Math.min(limitX, panX));
      panY = Math.max(-limitY, Math.min(limitY, panY));
      
      updateTransform();
    }
  });
}

function highlightOCRText(text) {
  const overlay = document.getElementById('highlight-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  
  if (activeIdx < 0) return;
  const s = styles[activeIdx];
  const boxes = s._ocr_boxes;
  const w_orig = s._source_w;
  const h_orig = s._source_h;
  
  if (!text || !boxes || !w_orig || !h_orig) return;
  
  const normSearch = String(text).trim().toLowerCase().replace(/\s+/g, '').replace(/mm/gi, '');
  if (!normSearch) return;
  
  const matches = boxes.filter(box => {
    const normBox = String(box.text).trim().toLowerCase().replace(/\s+/g, '').replace(/mm/gi, '');
    return normBox.includes(normSearch) || normSearch.includes(normBox);
  });
  
  matches.forEach(box => {
    const left = ((box.cx - box.w / 2) / w_orig) * 100;
    const top = ((box.cy - box.h / 2) / h_orig) * 100;
    const width = (box.w / w_orig) * 100;
    const height = (box.h / h_orig) * 100;
    
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.left = `${left}%`;
    div.style.top = `${top}%`;
    div.style.width = `${width}%`;
    div.style.height = `${height}%`;
    div.style.border = '2.5px solid var(--cyan)';
    div.style.background = 'rgba(0, 212, 255, 0.18)';
    div.style.boxShadow = '0 0 8px var(--cyan)';
    div.style.borderRadius = '3px';
    div.style.pointerEvents = 'none';
    overlay.appendChild(div);
  });
}

function clearOCRHighlights() {
  const overlay = document.getElementById('highlight-overlay');
  if (overlay) overlay.innerHTML = '';
}

function populateSizeSuggestions(i, val) {
  const datalist = document.getElementById(`dl-size-suggestions-${i}`);
  if (!datalist) return;
  datalist.innerHTML = '';
  
  const suggestions = getClosestGatiSizes(val, 5);
  suggestions.forEach(sz => {
    const opt = document.createElement('option');
    opt.value = sz;
    datalist.appendChild(opt);
  });
}

function getClosestGatiSizes(inputVal, count = 5) {
  if (!inputVal) {
    return validGatiSizes.slice(0, count);
  }
  
  const search = inputVal.trim().toLowerCase().replace(/mm/gi, '');
  const list = [];
  
  validGatiSizes.forEach(vs => {
    const vsc = vs.toLowerCase().replace(/mm/gi, '');
    let score = 0;
    if (vsc === search) {
      score = 100;
    } else if (vsc.startsWith(search)) {
      score = 80;
    } else if (vsc.includes(search)) {
      score = 50;
    } else {
      const overlap = getCharOverlap(search, vsc);
      score = overlap * 10;
    }
    list.push({ size: vs, score: score });
  });
  
  list.sort((a, b) => b.score - a.score);
  return list.slice(0, count).map(x => x.size);
}

function getCharOverlap(s1, s2) {
  let matches = 0;
  const set1 = new Set(s1.split(''));
  set1.forEach(c => {
    if (s2.includes(c)) matches++;
  });
  return matches / Math.max(s1.length, s2.length);
}

/* ═══════════════════════════════════════════ */
/*  INIT                                       */
/* ═══════════════════════════════════════════ */
async function init() {
  try {
    const r = await fetch('/api/styles');
    if (r.ok) { styles = await r.json(); }
  } catch(e) {}
  
  // Load Gati size codes for real-time validation
  await loadGatiSizes();
  
  renderSidebar();
  updateStyleCount();
  setupDragDrop();

  initPanZoom();
}

async function loadGatiSizes() {
  try {
    const r = await fetch('/api/gati-sizes');
    if (r.ok) {
      validGatiSizes = await r.json();
      console.log(`Loaded ${validGatiSizes.length} valid Gati size codes for verification.`);
    }
  } catch(e) {
    console.error("Failed loading Gati size codes:", e);
  }
}

window.addEventListener('DOMContentLoaded', init);

/* ═══════════════════════════════════════════ */
/*  DRAG & DROP                                */
/* ═══════════════════════════════════════════ */
function setupDragDrop() {
  const card = document.getElementById('upload-card');
  card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('dragover'); });
  card.addEventListener('dragleave', () => card.classList.remove('dragover'));
  card.addEventListener('drop', e => {
    e.preventDefault(); card.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });
}

/* ═══════════════════════════════════════════ */
/*  FILE HANDLING                              */
/* ═══════════════════════════════════════════ */
function handleFiles(fileList) {
  const images = [];
  const excels = [];
  
  for (const f of fileList) {
    if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
      excels.push(f);
    } else if (f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name)) {
      images.push(f);
    }
  }
  
  if (excels.length > 0) {
    handleExcelUpload(excels[0]);
    return;
  }
  
  for (const f of images) {
    const url = URL.createObjectURL(f);
    uploadedFiles.push({ file: f, serverName: null, previewUrl: url });
  }
  renderThumbnails();
  if (uploadedFiles.length > 0) {
    document.getElementById('extract-btn-wrap').classList.remove('hide');
    document.getElementById('upload-card').classList.add('has-files');
  }
}

async function handleExcelUpload(file) {
  const isShape = file.name.toLowerCase().includes('shape');
  const targetDb = isShape ? "Stone Shape Size.xlsx" : "Stone Size.xlsx";
  
  if (!confirm(`Do you want to update the official Gati database file "${targetDb}" with "${file.name}"?`)) {
    return;
  }
  
  toast('Uploading master size sheet...', 'info');
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const r = await fetch('/api/upload-master-db', { method: 'POST', body: formData });
    const d = await r.json();
    if (r.ok) {
      toast(`✅ Master Database updated! Loaded ${d.loaded} sizes.`, 'success', 5000);
      await loadGatiSizes();
      if (activeIdx >= 0) {
        renderDiamondsTable();
        updateTotals();
      }
    } else {
      toast('Failed to update DB: ' + (d.detail || 'Error'), 'error');
    }
  } catch(e) {
    toast('Network error uploading master DB', 'error');
  }
}

async function reloadSizeDB() {
  toast('Reloading Gati size sheets...', 'info');
  try {
    const r = await fetch('/api/reload-sizes', { method: 'POST' });
    const d = await r.json();
    if (r.ok) {
      toast(`✅ Size DB reloaded! ${d.loaded} unique sizes found.`, 'success', 4000);
      await loadGatiSizes();
      if (activeIdx >= 0) {
        renderDiamondsTable();
        updateTotals();
      }
    } else {
      toast('Reload failed: ' + (d.detail || 'Error'), 'error');
    }
  } catch(e) {
    toast('Network error reloading DB', 'error');
  }
}

function renderThumbnails() {
  const grid = document.getElementById('thumb-grid');
  grid.innerHTML = '';
  uploadedFiles.forEach((uf, i) => {
    const div = document.createElement('div');
    div.className = 'thumb-item';
    div.innerHTML = `<img src="${uf.previewUrl}" alt="${uf.file.name}"><button class="thumb-remove" onclick="removeFile(${i})">&times;</button><div class="thumb-name">${uf.file.name}</div>`;
    grid.appendChild(div);
  });
}

function removeFile(i) {
  URL.revokeObjectURL(uploadedFiles[i].previewUrl);
  uploadedFiles.splice(i, 1);
  renderThumbnails();
  if (uploadedFiles.length === 0) {
    document.getElementById('extract-btn-wrap').classList.add('hide');
    document.getElementById('upload-card').classList.remove('has-files');
  }
}

/* ═══════════════════════════════════════════ */
/*  AI EXTRACTION                              */
/* ═══════════════════════════════════════════ */
// extractAll (Gemini Cloud version) removed. Local OCR extractLocal used instead.

let isBatchRunning = false;
let batchCancelRequested = false;

async function extractLocal() {
  if (uploadedFiles.length === 0) { toast('No images to extract from', 'warn'); return; }
  
  isBatchRunning = true;
  batchCancelRequested = false;
  
  const btn = document.getElementById('extract-local-btn');
  btn.disabled = true;
  
  const progress = document.getElementById('extract-progress');
  const pbar = document.getElementById('progress-bar');
  const ptext = document.getElementById('progress-text');
  const result = document.getElementById('extract-result');
  
  progress.classList.add('show');
  result.classList.remove('show');
  
  const batchDashboard = document.getElementById('batch-dashboard');
  const batchList = document.getElementById('batch-list');
  const globalStatus = document.getElementById('batch-global-status');
  const progBarWrap = document.getElementById('batch-progress-bar-wrap');
  const progBar = document.getElementById('batch-progress-bar');
  const progText = document.getElementById('batch-progress-text');
  
  batchDashboard.style.display = 'block';
  progBarWrap.style.display = 'block';
  batchList.innerHTML = '';
  
  uploadedFiles.forEach((uf, idx) => {
    const li = document.createElement('li');
    li.id = `batch-item-${idx}`;
    li.style.display = 'flex';
    li.style.justify = 'space-between';
    li.style.alignItems = 'center';
    li.style.padding = '8px 12px';
    li.style.background = 'rgba(255,255,255,0.02)';
    li.style.border = '1px solid var(--border)';
    li.style.borderRadius = '8px';
    li.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:16px;">🖼️</span>
        <span class="batch-item-name" style="font-weight:500; font-family:var(--font-h);">${uf.file.name}</span>
      </div>
      <span class="batch-item-status badge-pending" style="color:var(--text2); font-weight:600; font-size:11px; text-transform:uppercase;">Pending ⏳</span>
    `;
    batchList.appendChild(li);
  });
  
  let successCount = 0;
  let errorCount = 0;
  const total = uploadedFiles.length;
  
  for (let i = 0; i < total; i++) {
    if (batchCancelRequested) {
      globalStatus.textContent = 'Cancelled';
      globalStatus.style.color = 'var(--danger)';
      toast('Batch extraction cancelled', 'warn');
      break;
    }
    
    const uf = uploadedFiles[i];
    const itemEl = document.getElementById(`batch-item-${i}`);
    const statusEl = itemEl.querySelector('.batch-item-status');
    
    statusEl.textContent = 'Processing ⚙️';
    statusEl.style.color = 'var(--cyan)';
    itemEl.style.background = 'rgba(0, 212, 255, 0.05)';
    itemEl.style.borderColor = 'rgba(0, 212, 255, 0.25)';
    
    globalStatus.textContent = `Processing file ${i+1} of ${total}...`;
    progText.textContent = `${i} / ${total} complete`;
    progBar.style.width = `${(i / total) * 100}%`;
    pbar.style.width = `${(i / total) * 100}%`;
    ptext.textContent = `Extracting ${uf.file.name}...`;
    
    const formData = new FormData();
    formData.append('files', uf.file);
    
    try {
      const uploadRes = await fetch('/api/upload-images', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.detail || 'Upload failed');
      
      const serverName = uploadData.files[0].saved_as;
      
      const extractForm = new FormData();
      extractForm.append('filenames', JSON.stringify([serverName]));
      
      const extractRes = await fetch('/api/extract-local', { method: 'POST', body: extractForm });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.detail || 'Extraction failed');
      
      const extracted = extractData.extracted || [];
      if (extracted.length === 0 || (extractData.errors && extractData.errors.length > 0)) {
        throw new Error((extractData.errors && extractData.errors[0] && extractData.errors[0].error) || 'OCR returned empty result');
      }
      
      const ns = extracted[0];
      ns.StyleDate = ns.StyleDate || new Date().toISOString().split('T')[0];
      ns.Diamonds = ns.Diamonds || [];
      ns.Parts = ns.Parts || 1;
      ns.NetWt = ns.NetWt || 0;
      styles.push(ns);
      
      successCount++;
      statusEl.textContent = 'Success ✅';
      statusEl.style.color = 'var(--emerald)';
      itemEl.style.background = 'rgba(16, 185, 129, 0.05)';
      itemEl.style.borderColor = 'rgba(16, 185, 129, 0.2)';
      
      renderSidebar();
      updateStyleCount();
      if (successCount === 1) selectStyle(styles.length - 1);
      
    } catch (err) {
      errorCount++;
      statusEl.textContent = 'Failed ❌';
      statusEl.style.color = 'var(--danger)';
      statusEl.title = err.message;
      itemEl.style.background = 'rgba(239, 68, 68, 0.05)';
      itemEl.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    }
  }
  
  progText.textContent = `${total} / ${total} complete`;
  progBar.style.width = '100%';
  pbar.style.width = '100%';
  ptext.textContent = 'Batch extraction complete!';
  
  globalStatus.textContent = `Complete! Success: ${successCount}, Failed: ${errorCount}`;
  globalStatus.style.color = errorCount > 0 ? 'var(--amber)' : 'var(--emerald)';
  
  toast(`Batch processed! Success: ${successCount}, Failed: ${errorCount}`, errorCount > 0 ? 'warn' : 'success', 5000);
  
  uploadedFiles = [];
  renderThumbnails();
  document.getElementById('extract-btn-wrap').classList.add('hide');
  document.getElementById('upload-card').classList.remove('has-files');
  btn.disabled = false;
  btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg> Extract Details (Offline OCR)';
  isBatchRunning = false;
}

function cancelBatch() {
  if (isBatchRunning) {
    batchCancelRequested = true;
    const globalStatus = document.getElementById('batch-global-status');
    globalStatus.textContent = 'Cancelling...';
    globalStatus.style.color = 'var(--amber)';
  } else {
    document.getElementById('batch-dashboard').style.display = 'none';
  }
}

/* ═══════════════════════════════════════════ */
/*  SIDEBAR                                    */
/* ═══════════════════════════════════════════ */
function renderSidebar(filter = '') {
  const ul = document.getElementById('style-list');
  ul.innerHTML = '';
  let count = 0;
  styles.forEach((s, idx) => {
    if (filter && !(s.StyleCode||'').toLowerCase().includes(filter.toLowerCase())) return;
    count++;
    const totalPcs = (s.Diamonds||[]).reduce((a,d) => a + (+d.Pcs||0), 0);
    const totalWt = (s.Diamonds||[]).reduce((a,d) => a + (+d.Weight||0), 0).toFixed(3);
    const li = document.createElement('li');
    li.className = 'style-item' + (idx===activeIdx ? ' active' : '');
    li.innerHTML = `<div>
      <div class="si-code">${s.StyleCode||'Unnamed'}</div>
      <div class="si-meta">${s.MItemCode||'N/A'} · ${s.NetWt||0}g | 💎 ${totalPcs}pcs · ${totalWt}ct</div>
      ${s._source_image ? '<div class="si-src">OCR Extracted</div>' : ''}
    </div><span class="si-badge">${s.Category||'RING'}</span>`;
    li.onclick = () => selectStyle(idx);
    ul.appendChild(li);
  });
  if (count === 0) ul.innerHTML = '<li style="padding:20px 10px;text-align:center;color:var(--muted);font-size:12px;">No styles yet. Upload images or add manually.</li>';
}
document.getElementById('search-input').addEventListener('input', e => renderSidebar(e.target.value));

function updateStyleCount() {
  document.getElementById('style-count').textContent = styles.length > 0 ? `${styles.length} style(s)` : '';
}

/* ═══════════════════════════════════════════ */
/*  SELECT / EDIT                              */
/* ═══════════════════════════════════════════ */
function selectStyle(idx) {
  activeIdx = idx;
  const s = styles[idx];
  document.getElementById('upload-zone').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('editor').style.display = 'flex'; // Flex for editor-layout
  document.getElementById('delete-btn').style.display = 'inline-flex';
  document.getElementById('topbar-title').textContent = s.StyleCode || 'Unnamed Style';

  // Set image view
  const viewerImg = document.getElementById('viewer-img');
  const imageContainer = document.getElementById('image-viewer-container');
  const placeholder = document.getElementById('image-viewer-placeholder');
  
  if (viewerImg) {
    resetZoom();
    if (s._source_image) {
      viewerImg.src = "/uploads/" + s._source_image;
      imageContainer.style.display = 'flex';
      placeholder.style.display = 'none';
      const controls = document.getElementById('zoom-controls-ui');
      if (controls) controls.style.display = 'flex';
    } else {
      viewerImg.src = "";
      imageContainer.style.display = 'none';
      placeholder.style.display = 'flex';
      const controls = document.getElementById('zoom-controls-ui');
      if (controls) controls.style.display = 'none';
    }
  }

  document.getElementById('f-style-code').value = s.StyleCode||'';
  document.getElementById('f-style-date').value = s.StyleDate||'';
  document.getElementById('f-category').value = s.Category||'RINGS';
  document.getElementById('f-sub-category').value = s.SubCategory||'';
  document.getElementById('f-stock-type').value = s.StockType||'';
  document.getElementById('f-make-type').value = s.MakeType||'';
  document.getElementById('f-manufacturer').value = s.Manufacturer||'';
  document.getElementById('f-item-size').value = s.ItemSize||'';
  document.getElementById('f-parts').value = s.Parts||1;
  document.getElementById('f-mitemcode').value = s.MItemCode||'';
  document.getElementById('f-netwt').value = s.NetWt||'';

  renderDiamondsTable();
  updateTotals();
  renderSidebar(document.getElementById('search-input').value);
}

function alignStyleCodeWithSize(styleCode, itemSize) {
  if (!styleCode || !itemSize) return styleCode;
  
  // US Sizes
  let usMatch = itemSize.match(/US[-.\s]*(\d+(?:\.\d+)?)/i);
  if (usMatch) {
    let sizeVal = usMatch[1];
    let styleMatch = styleCode.match(/(-US[-.]*)(\d+(?:\.\d+)?)/i);
    if (styleMatch) {
      let currentVal = styleMatch[2];
      if (parseFloat(currentVal) !== parseFloat(sizeVal)) {
        let idx = styleCode.toUpperCase().lastIndexOf('-US');
        if (idx !== -1) {
          let prefix = styleCode.substring(0, idx + 3);
          let rest = styleCode.substring(idx + 3);
          let extra = rest.match(/^[-.]*/)[0];
          return prefix + extra + sizeVal;
        }
      }
    }
  }
  
  // EU Sizes
  let euMatch = itemSize.match(/EU[-.\s]*(\d+)/i);
  if (euMatch) {
    let sizeVal = euMatch[1];
    let styleMatch = styleCode.match(/(-EU[-.]*)(\d+)/i);
    if (styleMatch) {
      let currentVal = styleMatch[2];
      if (currentVal !== sizeVal) {
        let idx = styleCode.toUpperCase().lastIndexOf('-EU');
        if (idx !== -1) {
          let prefix = styleCode.substring(0, idx + 3);
          let rest = styleCode.substring(idx + 3);
          let extra = rest.match(/^[-.]*/)[0];
          return prefix + extra + sizeVal;
        }
      }
    }
  }

  // UK Sizes
  let ukMatch = itemSize.match(/UK[-.\s]*([A-Z](?:\s*\d\/\d)?)/i);
  if (ukMatch) {
    let sizeVal = ukMatch[1].replace(/\s+/g, '');
    let styleMatch = styleCode.match(/(-UK[-.]*)\s*([A-Z](?:\s*\d\/\d)?)/i);
    if (styleMatch) {
      let styleVal = styleMatch[2].replace(/\s+/g, '');
      if (styleVal.toUpperCase() !== sizeVal.toUpperCase()) {
        let idx = styleCode.toUpperCase().lastIndexOf('-UK');
        if (idx !== -1) {
          let prefix = styleCode.substring(0, idx + 3);
          let rest = styleCode.substring(idx + 3);
          let extra = rest.match(/^[-.]*/)[0];
          return prefix + extra + sizeVal;
        }
      }
    }
  }
  
  return styleCode;
}

function onFieldChange(field, val) {
  if (activeIdx < 0) return;
  styles[activeIdx][field] = val;
  
  // Auto-align StyleCode with ItemSize if either is edited
  if (field === 'ItemSize' || field === 'StyleCode') {
    let styleCode = styles[activeIdx]['StyleCode'] || '';
    let itemSize = styles[activeIdx]['ItemSize'] || '';
    let alignedCode = alignStyleCodeWithSize(styleCode, itemSize);
    if (alignedCode !== styleCode) {
      styles[activeIdx]['StyleCode'] = alignedCode;
      document.getElementById('f-style-code').value = alignedCode;
      if (field === 'ItemSize') {
        toast('Aligned Style Code to size: ' + alignedCode, 'info', 2000);
      }
    }
  }

  if (field === 'StyleCode') document.getElementById('topbar-title').textContent = styles[activeIdx]['StyleCode']||'Unnamed';
  if (['StyleCode','Category','MItemCode','NetWt'].includes(field)) {
    renderSidebar();
    updateTotals();
  }
}

/* ═══════════════════════════════════════════ */
/*  DIAMONDS TABLE                             */
/* ═══════════════════════════════════════════ */
function isValidGatiSize(sz) {
  if (!sz) return true;
  let s = sz.trim();
  if (s.startsWith('⚠️')) {
    s = s.replace('⚠️', '').trim();
  }
  const canon = s.toLowerCase().replace(/\s+/g, '').replace(/\*/g, 'x').replace(/mm/gi, '');
  if (!canon) return true;
  
  return validGatiSizes.some(vs => {
    const vsc = vs.toLowerCase().replace(/\s+/g, '').replace(/\*/g, 'x').replace(/mm/gi, '');
    if (vsc === canon) return true;
    
    // Fuzzy 2D matching
    const m_2d_u = canon.match(/^([\d.]+)[x\*]([\d.]+)$/);
    const m_2d_v = vsc.match(/^([\d.]+)[x\*]([\d.]+)$/);
    if (m_2d_u && m_2d_v) {
      const u_a = parseFloat(m_2d_u[1]);
      const u_b = parseFloat(m_2d_u[2]);
      const v_a = parseFloat(m_2d_v[1]);
      const v_b = parseFloat(m_2d_v[2]);
      if (Math.abs(u_a - v_a) < 0.01 && Math.abs(u_b - v_b) < 0.01) return true;
    }
    
    // Fuzzy 1D matching
    const u_num = parseFloat(canon);
    const v_num = parseFloat(vsc);
    if (!isNaN(u_num) && !isNaN(v_num) && Math.abs(u_num - v_num) < 0.01) return true;
    
    return false;
  });
}

function renderDiamondsTable() {
  const s = styles[activeIdx];
  const body = document.getElementById('diamonds-body');
  body.innerHTML = '';
  if (!s.Diamonds || s.Diamonds.length === 0) {
    body.innerHTML = '<tr class="empty-row"><td colspan="8">No stones added yet. Click "Add Row".</td></tr>';
    return;
  }
  
  let totalPcs = 0;
  let totalWt = 0;
  
  s.Diamonds.forEach((d, i) => {
    totalPcs += (+d.Pcs || 0);
    totalWt += (+d.Weight || 0);
    
    const szVal = d.Size || '';
    const isUnmatched = szVal.includes('⚠️') || (szVal && !isValidGatiSize(szVal));
    const cleanSize = szVal.replace('⚠️', '').trim();
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:var(--muted);padding:7px 12px;font-size:12px">${i+1}</td>
      <td><input value="${d.ItemCode||''}" list="dl-item-code" placeholder="DRD" oninput="diaChange(${i},'ItemCode',this.value)" onfocus="highlightOCRText(this.value)" onblur="clearOCRHighlights()"></td>
      <td style="position:relative">
        <input id="dia-size-input-${i}" value="${cleanSize}" placeholder="1.50MM RD" 
               list="dl-size-suggestions-${i}"
               class="${isUnmatched ? 'input-warn' : ''}" 
               style="${isUnmatched ? 'border-color: var(--amber); background: rgba(245,158,11,0.06); padding-right: 28px; color: var(--amber); font-weight: bold;' : ''}"
               oninput="diaChange(${i},'Size',this.value); populateSizeSuggestions(${i}, this.value); highlightOCRText(this.value)"
               onfocus="populateSizeSuggestions(${i}, this.value); highlightOCRText(this.value)"
               onblur="clearOCRHighlights()">
        <datalist id="dl-size-suggestions-${i}"></datalist>
        <span id="dia-size-warn-${i}" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); color:var(--amber); cursor:help; display:${isUnmatched ? 'inline' : 'none'};" 
              title="This size is NOT in the Gati Master Database! Please correct it, or add it to Stone Size.xlsx and reload DB.">⚠️</span>
      </td>
      <td><input type="number" value="${d.Pcs||''}" min="0" step="1" style="width:70px" oninput="diaChange(${i},'Pcs',+this.value)" onfocus="highlightOCRText(this.value)" onblur="clearOCRHighlights()"></td>
      <td><input type="number" value="${d.Weight||''}" min="0" step="0.001" style="width:90px" oninput="diaChange(${i},'Weight',+this.value)" onfocus="highlightOCRText(this.value)" onblur="clearOCRHighlights()"></td>
      <td><input value="${d.StonePosition||''}" list="dl-position" placeholder="Center" oninput="diaChange(${i},'StonePosition',this.value)" onfocus="highlightOCRText(this.value)" onblur="clearOCRHighlights()"></td>
      <td><input value="${d.SettingType||''}" list="dl-setting" placeholder="PRONG" oninput="diaChange(${i},'SettingType',this.value)" onfocus="highlightOCRText(this.value)" onblur="clearOCRHighlights()"></td>
      <td style="white-space:nowrap;padding:7px 4px;">
        <button class="btn-icon" onclick="duplicateDia(${i})" title="Duplicate Row" style="color:var(--cyan);margin-right:4px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="btn-icon" onclick="removeDia(${i})" title="Remove Row" style="color:var(--danger)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </td>`;
    body.appendChild(tr);
  });
  
  // Append Summary Row
  const sumTr = document.createElement('tr');
  sumTr.style.background = 'rgba(255,255,255,0.02)';
  sumTr.style.fontWeight = 'bold';
  sumTr.innerHTML = `
    <td colspan="3" style="text-align:right;color:var(--text2);padding:10px;font-size:12px;">Total Stones:</td>
    <td id="sum-pcs" style="padding:10px;color:var(--cyan);font-size:13px;">${totalPcs}</td>
    <td id="sum-weight" style="padding:10px;color:var(--cyan);font-size:13px;">${totalWt.toFixed(3)} ct</td>
    <td colspan="3"></td>
  `;
  body.appendChild(sumTr);
}

function updateTotals() {
  if (activeIdx < 0) return;
  const s = styles[activeIdx];
  let totalPcs = 0;
  let totalWt = 0;
  (s.Diamonds || []).forEach(d => {
    totalPcs += (+d.Pcs || 0);
    totalWt += (+d.Weight || 0);
  });
  
  const pcsEl = document.getElementById('sum-pcs');
  const wtEl = document.getElementById('sum-weight');
  if (pcsEl) pcsEl.textContent = totalPcs;
  if (wtEl) wtEl.textContent = totalWt.toFixed(3) + ' ct';
  
  updateLiveHeaderTotals(s, totalPcs, totalWt);
}

function updateLiveHeaderTotals(s, totalPcs, totalWt) {
  const code = s.StyleCode || 'Unnamed Style';
  const mCode = s.MItemCode || 'N/A';
  const netWt = s.NetWt || 0;
  document.getElementById('topbar-title').innerHTML = `${code} <span style="font-size:12px;color:var(--text2);font-weight:normal;margin-left:12px;">(${mCode} · ${netWt}g | 💎 ${totalPcs}pcs · ${totalWt.toFixed(3)}ct)</span>`;
}

function duplicateDia(i) {
  if (activeIdx < 0) return;
  const d = styles[activeIdx].Diamonds[i];
  styles[activeIdx].Diamonds.splice(i + 1, 0, {
    ItemCode: d.ItemCode || 'DRD',
    Size: d.Size || '',
    Pcs: d.Pcs || 0,
    Weight: d.Weight || 0,
    StonePosition: d.StonePosition || '',
    SettingType: d.SettingType || ''
  });
  renderDiamondsTable();
  updateTotals();
  renderSidebar();
}

function diaChange(i, field, val) {
  if (activeIdx < 0) return;
  styles[activeIdx].Diamonds[i][field] = val;
  
  if (field === 'Size') {
    const inputEl = document.getElementById(`dia-size-input-${i}`);
    const warnEl = document.getElementById(`dia-size-warn-${i}`);
    if (inputEl) {
      const isValid = isValidGatiSize(val);
      if (isValid) {
        inputEl.style.borderColor = 'var(--border)';
        inputEl.style.background = 'rgba(255,255,255,0.03)';
        inputEl.style.color = 'var(--text)';
        inputEl.style.fontWeight = 'normal';
        if (warnEl) warnEl.style.display = 'none';
      } else {
        inputEl.style.borderColor = 'var(--amber)';
        inputEl.style.background = 'rgba(245,158,11,0.06)';
        inputEl.style.color = 'var(--amber)';
        inputEl.style.fontWeight = 'bold';
        if (warnEl) warnEl.style.display = 'inline';
      }
    }
  }
  
  if (['Pcs','Weight'].includes(field)) {
    renderSidebar();
    updateTotals();
  }
}
function addDiamondRow() {
  if (activeIdx < 0) return;
  styles[activeIdx].Diamonds.push({ItemCode:'DRD',Size:'',Pcs:0,Weight:0,StonePosition:'',SettingType:''});
  renderDiamondsTable();
  updateTotals();
  renderSidebar();
}
function removeDia(i) {
  if (activeIdx < 0) return;
  styles[activeIdx].Diamonds.splice(i,1);
  renderDiamondsTable();
  updateTotals();
  renderSidebar();
}

/* ═══════════════════════════════════════════ */
/*  ADD / DELETE                               */
/* ═══════════════════════════════════════════ */
function addNewStyle() {
  styles.push({
    StyleCode:'STYLE-'+Math.random().toString(36).slice(2,7).toUpperCase(),
    StyleDate:new Date().toISOString().split('T')[0],
    Category:'EJR',SubCategory:'HEAD',
    Manufacturer:'EVERMORE JEWELLERY PRIVATE LIMITED',
    StockType:'NATURAL DIAMOND JEWELRY',MakeType:'CASTING',
    ItemSize:'',Parts:1,MItemCode:'G14KTY',NetWt:0,Diamonds:[]
  });
  renderSidebar(); updateStyleCount(); selectStyle(styles.length-1);
}
function deleteStyle() {
  if (activeIdx < 0) return;
  if (!confirm('Delete "' + styles[activeIdx].StyleCode + '"?')) return;
  styles.splice(activeIdx,1); activeIdx = -1;
  document.getElementById('editor').style.display = 'none';
  document.getElementById('delete-btn').style.display = 'none';
  document.getElementById('upload-zone').style.display = 'block';
  document.getElementById('topbar-title').textContent = 'Upload Style Masters to Begin';
  renderSidebar(); updateStyleCount();
}

/* ═══════════════════════════════════════════ */
/*  SAVE / EXCEL                               */
/* ═══════════════════════════════════════════ */
async function saveDraft() {
  try {
    const r = await fetch('/api/styles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(styles)});
    if (r.ok) toast('Draft saved! ('+styles.length+' styles)','success');
    else toast('Save failed','error');
  } catch(e) { toast('Network error','error'); }
}
async function generateExcel() {
  if (styles.length===0){toast('No styles to export!','warn');return}
  toast('Generating Excel…','info');
  try {
    const r = await fetch('/api/generate-excel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(styles)});
    if (r.ok) {
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sjeplus_import_ready.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast('Excel file downloaded successfully!', 'success', 6000);
    } else {
      const d = await r.json().catch(() => ({detail: 'Failed to generate excel'}));
      toast('Error: ' + (d.detail || 'Server error'), 'error');
    }
  } catch(e) { toast('Network error','error'); }
}

/* ═══════════════════════════════════════════ */
/*  HELPERS                                    */
/* ═══════════════════════════════════════════ */
function scrollToUpload() {
  activeIdx = -1;
  document.getElementById('editor').style.display = 'none';
  document.getElementById('delete-btn').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
  const uz = document.getElementById('upload-zone');
  uz.style.display = 'block';
  document.getElementById('topbar-title').textContent = 'Upload Style Masters to Begin';
  renderSidebar();
  uz.scrollIntoView({behavior:'smooth'});
  document.getElementById('file-input').click();
}

let toastTimer = null;
function toast(msg, type='success', dur=3500) {
  const el=document.getElementById('toast'), ic=document.getElementById('toast-icon'), mg=document.getElementById('toast-msg');
  const c={success:'var(--emerald)',error:'var(--danger)',warn:'var(--amber)',info:'var(--blue)'};
  const icons={success:'✅',error:'❌',warn:'⚠️',info:'ℹ️'};
  el.style.border='1px solid '+(c[type]||c.info); ic.textContent=icons[type]||'ℹ️'; mg.textContent=msg;
  el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),dur);
}

// Global keyboard shortcuts for efficiency
window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveDraft();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generateExcel();
  }
});
