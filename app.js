import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

const PDF_URL = './magazine/magazine.pdf';
const INDEX_URL = './data/players.json';
const book = document.querySelector('#book');
const message = document.querySelector('#book-message');
const stage = document.querySelector('#book-stage');
const currentLabel = document.querySelector('#page-current');
const totalLabel = document.querySelector('#page-total');
let pageFlip;
let pdfDocument;
let playerEntries = [];
let contentsEntries = [];

try {
  const response = await fetch(INDEX_URL);
  if (!response.ok) throw new Error('Index unavailable');
  const index = await response.json();
  playerEntries = Array.isArray(index.players) ? index.players : [];
  contentsEntries = Array.isArray(index.contents) ? index.contents : [];
  if (index.issueTitle) document.querySelector('#issue-title').textContent = index.issueTitle;
  if (index.edition) document.querySelector('#edition-date').textContent = index.edition;
} catch {
  playerEntries = [];
  contentsEntries = [];
}
renderContents();
wireSearch();
wireReaderControls();

try {
  const response = await fetch(PDF_URL, { headers: { Range: 'bytes=0-' } });
  if (!response.ok) throw new Error('No magazine PDF found');
  const pdfBytes = await response.arrayBuffer();
  pdfDocument = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  await buildFlipbook(pdfDocument);
} catch (error) {
  console.info('Add a PDF at magazine/magazine.pdf to populate the reader.', error);
  currentLabel.textContent = '—';
  totalLabel.textContent = '—';
}

async function buildFlipbook(pdf) {
  message.hidden = true;
  book.style.display = 'block';
  book.replaceChildren();
  const firstPage = await pdf.getPage(1);
  const baseViewport = firstPage.getViewport({ scale: 1 });
  const pageWidth = 470;
  const pageHeight = Math.round(pageWidth * baseViewport.height / baseViewport.width);

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;

    const pageNode = document.createElement('div');
    pageNode.className = 'page';
    pageNode.dataset.page = String(pageNumber);
    pageNode.append(canvas);
    const annotations = await page.getAnnotations({ intent: 'display' });
    addLinkLayer(pageNode, annotations, viewport, pdf);
    book.append(pageNode);
  }

  pageFlip = new St.PageFlip(book, {
    width: pageWidth,
    height: pageHeight,
    size: 'stretch',
    minWidth: 230,
    maxWidth: pageWidth,
    minHeight: 300,
    maxHeight: pageHeight,
    maxShadowOpacity: 0.22,
    showCover: true,
    mobileScrollSupport: false,
    usePortrait: true,
    autoSize: true,
    clickEventForward: true,
    flippingTime: 720,
    drawShadow: true,
  });
  pageFlip.loadFromHTML(book.querySelectorAll('.page'));
  pageFlip.on('flip', (event) => { currentLabel.textContent = String(event.data + 1); });
  totalLabel.textContent = String(pdf.numPages);
  currentLabel.textContent = '1';
  stage.classList.add('has-book');
}

function addLinkLayer(pageNode, annotations, viewport, pdf) {
  const links = annotations.filter((annotation) => annotation.subtype === 'Link' && (annotation.url || annotation.dest));
  if (!links.length) return;
  const layer = document.createElement('div');
  layer.className = 'page-links';
  for (const annotation of links) {
    const [left, top, right, bottom] = viewport.convertToViewportRectangle(annotation.rect);
    const anchor = document.createElement('a');
    anchor.style.left = `${Math.min(left, right) / viewport.width * 100}%`;
    anchor.style.top = `${Math.min(top, bottom) / viewport.height * 100}%`;
    anchor.style.width = `${Math.abs(right - left) / viewport.width * 100}%`;
    anchor.style.height = `${Math.abs(bottom - top) / viewport.height * 100}%`;
    anchor.setAttribute('aria-label', annotation.url ? '打开 PDF 链接' : '跳转到 PDF 内部链接');
    if (annotation.url) {
      anchor.href = annotation.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    } else {
      anchor.href = '#';
      anchor.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
          const destination = typeof annotation.dest === 'string' ? await pdf.getDestination(annotation.dest) : annotation.dest;
          const pageIndex = await pdf.getPageIndex(destination[0]);
          goToPage(pageIndex + 1);
        } catch { /* Some PDFs contain destinations PDF.js cannot resolve. */ }
      });
    }
    layer.append(anchor);
  }
  pageNode.append(layer);
}

function wireReaderControls() {
  document.querySelector('#prev-page').addEventListener('click', () => pageFlip?.flipPrev());
  document.querySelector('#next-page').addEventListener('click', () => pageFlip?.flipNext());
  document.querySelector('#fullscreen').addEventListener('click', async () => {
    if (!document.fullscreenElement) await document.querySelector('.reader-shell').requestFullscreen?.();
    else await document.exitFullscreen?.();
  });
  document.addEventListener('keydown', (event) => {
    if (event.metaKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      document.querySelector('#player-search').focus();
    }
  });
  document.querySelector('#show-contents').addEventListener('click', () => {
    document.querySelector('#contents').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function wireSearch() {
  const input = document.querySelector('#player-search');
  const results = document.querySelector('#search-results');
  const template = document.querySelector('#search-result-template');
  input.addEventListener('input', () => {
    const query = input.value.trim().toLocaleLowerCase();
    results.replaceChildren();
    if (!query) {
      const hint = document.createElement('p');
      hint.className = 'search-hint';
      hint.textContent = '输入球员姓名开始搜索';
      results.append(hint);
      return;
    }
    const matches = playerEntries.filter((entry) => [entry.name, ...(entry.aliases || [])].some((name) => name.toLocaleLowerCase().includes(query)));
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.className = 'no-results';
      empty.textContent = '没有找到这位球员。可以检查姓名，或在 data/players.json 中补充索引。';
      results.append(empty);
      return;
    }
    for (const entry of matches) {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector('.result-card');
      fragment.querySelector('.result-avatar').textContent = initials(entry.name);
      fragment.querySelector('.result-main strong').textContent = entry.name;
      fragment.querySelector('.result-main small').textContent = entry.note || '球员专题';
      fragment.querySelector('.result-page').textContent = `PAGE ${entry.page}`;
      card.addEventListener('click', () => goToPage(entry.page));
      results.append(fragment);
    }
  });
}

function renderContents() {
  const root = document.querySelector('#contents');
  root.replaceChildren();
  contentsEntries.forEach((entry, index) => {
    const button = document.createElement('button');
    button.className = 'contents-item';
    button.innerHTML = `<span class="content-number">${String(index + 1).padStart(2, '0')}</span><span class="content-text"><span class="content-title"></span><span class="content-meta"></span></span><span class="content-arrow">↗</span>`;
    button.querySelector('.content-title').textContent = entry.title;
    button.querySelector('.content-meta').textContent = entry.subtitle || `PAGE ${entry.page}`;
    button.addEventListener('click', () => goToPage(entry.page));
    root.append(button);
  });
  if (!contentsEntries.length) {
    root.innerHTML = '<p class="search-hint">目录将在你添加杂志和目录索引后显示。</p>';
  }
}

function goToPage(page) {
  if (!pageFlip || !Number.isFinite(Number(page))) return;
  const target = Math.min(Math.max(Number(page) - 1, 0), pdfDocument.numPages - 1);
  pageFlip.flip(target);
  document.querySelector('#book-stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function initials(name = '') {
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? `${words[0][0]}${words.at(-1)[0]}`.toUpperCase() : (name.slice(0, 2) || 'F').toUpperCase();
}
