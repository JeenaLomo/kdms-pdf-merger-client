/* Client-side PDF Merger (English)
 * - Uses pdf-lib to merge
 * - Uses PDF.js for first-page thumbnails
 * - Drag to reorder cards
*/

const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const dropzone = document.getElementById('dropzone');
const fileListEl = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const clearBtn = document.getElementById('clearBtn');
const limitsEl = document.getElementById('limits');
const progressEl = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultEl = document.getElementById('result');

// Limits
const LIMIT_BYTES = 100 * 1024 * 1024; // ~100MB total
const LIMIT_FILES = 50; // reasonable bound
const LIMIT_PAGES_EST = 500;

let files = []; // [{file, id, name, size}]
let dragSrcIndex = null;

browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(Array.from(e.target.files)));

;['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => {
  e.preventDefault(); e.stopPropagation();
  dropzone.classList.add('is-over');
}));
;['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => {
  e.preventDefault(); e.stopPropagation();
  dropzone.classList.remove('is-over');
}));
dropzone.addEventListener('drop', (e) => {
  const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  handleFiles(dropped);
});

clearBtn.addEventListener('click', () => {
  files = [];
  renderList();
  resultEl.innerHTML = '';
});

mergeBtn.addEventListener('click', async () => {
  try {
    await mergeFiles();
  } catch (err) {
    alert('An error occurred while merging: ' + err.message);
    console.error(err);
  }
});

function handleFiles(selected){
  const combined = [...files.map(f => f.file), ...selected];
  // de-duplicate by name+size (simple heuristic)
  const map = new Map();
  for(const f of combined){
    const key = `${f.name}__${f.size}`;
    if(!map.has(key)) map.set(key, f);
  }
  const unique = Array.from(map.values()).slice(0, LIMIT_FILES);
  files = unique.map((f, i) => ({
    id: `${f.name}-${f.size}-${i}-${Math.random().toString(36).slice(2,7)}`,
    file: f,
    name: f.name,
    size: f.size
  }));

  renderList();
}

function renderList(){
  fileListEl.innerHTML = '';
  resultEl.innerHTML = '';
  const totalBytes = files.reduce((s,f)=>s+f.size,0);
  limitsEl.textContent = files.length
    ? `Files: ${files.length} • Total size: ${formatBytes(totalBytes)} (recommended ≤ ~100MB / ~${LIMIT_PAGES_EST} pages for speed)`
    : '';

  mergeBtn.disabled = files.length === 0 || totalBytes > LIMIT_BYTES;

  files.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'file-card';
    li.setAttribute('data-index', idx);
    li.setAttribute('draggable', 'true');

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    li.appendChild(thumb);
    renderThumbnail(item.file, thumb).catch(() => {
      thumb.innerHTML = '<span class="tag">Preview not available</span>';
    });

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `
      <div class="name" title="${item.name}">${item.name}</div>
      <div class="size">${formatBytes(item.size)}</div>
      <div class="controls">
        <button class="btn subtle" data-act="up">↑</button>
        <button class="btn subtle" data-act="down">↓</button>
        <button class="btn subtle" data-act="remove">Remove</button>
      </div>
      <span class="tag">Drag to reorder</span>
    `;
    li.appendChild(meta);

    // Drag & Drop reorder
    li.addEventListener('dragstart', (e) => {
      dragSrcIndex = idx;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      const target = e.currentTarget;
      const targetIndex = Number(target.getAttribute('data-index'));
      if(targetIndex !== dragSrcIndex){
        const children = Array.from(fileListEl.children);
        const srcEl = children[dragSrcIndex];
        const tgtEl = children[targetIndex];
        if(!srcEl || !tgtEl) return;
        if(dragSrcIndex < targetIndex){
          fileListEl.insertBefore(srcEl, tgtEl.nextSibling);
        }else{
          fileListEl.insertBefore(srcEl, tgtEl);
        }
        const newOrder = Array.from(fileListEl.children).map(el => Number(el.getAttribute('data-index')));
        files = newOrder.map(i => files[i]);
        Array.from(fileListEl.children).forEach((el, i) => el.setAttribute('data-index', i));
        dragSrcIndex = Array.from(fileListEl.children).indexOf(srcEl);
      }
    });

    // Buttons
    meta.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const act = e.currentTarget.getAttribute('data-act');
        if(act === 'remove'){
          files.splice(idx,1);
        }else if(act === 'up' && idx>0){
          [files[idx-1], files[idx]] = [files[idx], files[idx-1]];
        }else if(act === 'down' && idx<files.length-1){
          [files[idx+1], files[idx]] = [files[idx], files[idx+1]];
        }
        renderList();
      });
    });

    fileListEl.appendChild(li);
  });
}

async function renderThumbnail(file, container){
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.35 });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  container.innerHTML='';
  container.appendChild(canvas);
  await page.render({ canvasContext: ctx, viewport }).promise;
}

function formatBytes(bytes){
  if(bytes === 0) return '0 B';
  const k=1024,sizes=['B','KB','MB','GB','TB'];const i=Math.floor(Math.log(bytes)/Math.log(k));
  return parseFloat((bytes/Math.pow(k,i)).toFixed(2))+' '+sizes[i];
}

async function mergeFiles(){
  if(files.length === 0) return;

  progressEl.hidden = false;
  progressBar.style.width = '0%';
  progressText.textContent = 'Merging…';

  const { PDFDocument } = PDFLib;
  const merged = await PDFDocument.create();

  let processed = 0;
  const total = files.length;

  for(const item of files){
    const bytes = await item.file.arrayBuffer();
    const src = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for(const p of pages) merged.addPage(p);
    processed++;
    const pct = Math.round((processed/total)*100);
    progressBar.style.width = pct + '%';
    progressText.textContent = `Merging: ${processed}/${total} (${pct}%)`;
    await new Promise(r => setTimeout(r, 0));
  }

  const out = await merged.save();
  const blob = new Blob([out], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  resultEl.innerHTML = '';
  const dlBtn = document.createElement('a');
  dlBtn.className = 'btn success';
  dlBtn.href = url;
  dlBtn.download = 'merged.pdf';
  dlBtn.textContent = 'Download merged.pdf';
  resultEl.appendChild(dlBtn);

  progressText.textContent = 'Done ✅';
}
