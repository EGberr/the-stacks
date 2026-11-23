import './style.css';
import { BOOKS, DOMAINS, PATHS } from './data/catalog.ts';
import openLibrary from './data/openlibrary.json';
import { Library } from './scene/library.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const meta = openLibrary as Record<string, { key?: string; cover?: number; freeOk?: boolean }>;
const byId = new Map(BOOKS.map((b) => [b.id, b]));
const params = new URLSearchParams(location.search);
const LEVELS = ['', 'Start here', 'Core', 'Deep'];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ── state ────────────────────────────────────────────────────────────────────

let domain = 0;
let openId: string | null = null;
let pathId: string | null = null;
let hoverId: string | null = null;

/** Which books this visitor has read. A convenience kept in their own browser. */
const read = new Set<string>();
try {
  for (const id of JSON.parse(localStorage.getItem('stacks:read') ?? '[]')) if (byId.has(id)) read.add(id);
} catch {
  /* Private mode or blocked storage: start with an empty shelf. */
}
function saveRead(): void {
  try {
    localStorage.setItem('stacks:read', JSON.stringify([...read]));
  } catch {
    /* Reading marks simply will not survive a reload. */
  }
}

const library = new Library($<HTMLCanvasElement>('room'), BOOKS, DOMAINS, meta, params.has('skip'));

// ── kinetic type ─────────────────────────────────────────────────────────────

/** Replaces the text of `el`, letter by letter: the old word leaves, the new one arrives. */
function kinetic(el: HTMLElement, text: string): void {
  const build = () => {
    el.classList.remove('kin-out');
    el.replaceChildren(
      ...text.split(' ').map((word, w, words) => {
        const span = document.createElement('span');
        span.style.whiteSpace = 'nowrap';
        span.style.display = 'inline-block';
        const offset = words.slice(0, w).join(' ').length;
        span.append(
          ...[...word].map((ch, i) => {
            const letter = document.createElement('span');
            letter.className = 'kin';
            letter.style.setProperty('--i', String(offset + i));
            letter.textContent = ch;
            return letter;
          })
        );
        const frag = document.createDocumentFragment();
        frag.append(span, w < words.length - 1 ? ' ' : '');
        return frag;
      })
    );
    el.setAttribute('aria-label', text);
  };
  if (!el.childElementCount) return build();
  el.classList.add('kin-out');
  window.setTimeout(build, 300);
}

// ── rendering the interface ──────────────────────────────────────────────────

function renderNav(): void {
  $('nav').innerHTML = DOMAINS.map((d, i) => {
    const books = BOOKS.filter((b) => b.domain === d.id);
    const done = books.filter((b) => read.has(b.id)).length;
    return `<button class="${i === domain ? 'on' : ''}" data-i="${i}" style="--c:${d.color}" aria-pressed="${i === domain}">
      <b>${esc(d.name)}</b><small><i>${done}</i> / ${books.length} read</small></button>`;
  }).join('');
  $('progress').innerHTML = `<b>${read.size}</b> / ${BOOKS.length} read`;
}

function showDomain(index: number, announce = true): void {
  domain = (index + DOMAINS.length) % DOMAINS.length;
  const d = DOMAINS[domain];
  document.documentElement.style.setProperty('--accent', d.color);
  library.setDomain(domain);
  if (announce) {
    kinetic($('title'), d.name);
    $('count').textContent = `${String(domain + 1).padStart(2, '0')} / ${String(DOMAINS.length).padStart(2, '0')}`;
    $('line').textContent = d.line;
  }
  renderNav();
}

function chip(id: string): string {
  const b = byId.get(id);
  return b ? `<button class="chip" data-book="${b.id}">${esc(b.title)}</button>` : '';
}

function openBook(id: string | null): void {
  openId = id;
  library.focus(id);
  const card = $('card');
  document.body.classList.toggle('quiet', Boolean(id) || Boolean(pathId));
  if (!id) {
    card.classList.remove('on');
    return;
  }
  const b = byId.get(id)!;
  const d = DOMAINS.find((x) => x.id === b.domain)!;
  if (!pathId) showDomain(DOMAINS.indexOf(d));
  const info = meta[b.id] ?? {};
  const isRead = read.has(b.id);
  let i = 0;
  const rise = () => `class="rise" style="--i:${i++}"`;
  card.style.setProperty('--c', d.color);
  card.innerHTML = `
    <button class="close" aria-label="Close this book">×</button>
    <p class="meta rise" style="--i:${i++}"><i>${esc(d.name)}</i><span>${b.kind === 'paper' ? 'Paper' : 'Book'} · ${b.year}</span><span>${LEVELS[b.level]}</span></p>
    <h3 id="card-title"></h3>
    <p ${rise()}><span class="author">${esc(b.author)}</span></p>
    <p class="who rise" style="--i:${i++}"><span>Who it is for</span>${esc(b.who)}</p>
    <ol class="ideas">${b.ideas.map((idea, n) => `<li class="rise" style="--i:${i++}"><b>${n + 1}</b><span>${esc(idea)}</span></li>`).join('')}</ol>
    <div class="links rise" style="--i:${i++}">
      ${b.before?.length ? `<p>Read before</p><div class="chips">${b.before.map(chip).join('')}</div>` : ''}
      ${b.after?.length ? `<p>Read after</p><div class="chips">${b.after.map(chip).join('')}</div>` : ''}
    </div>
    <div class="actions rise" style="--i:${i++}">
      <button id="mark" class="pill ${isRead ? 'read-on' : 'solid'}">${isRead ? '✓ Read' : 'Mark as read'}</button>
      ${b.free && info.freeOk !== false ? `<a class="pill" href="${b.free}" target="_blank" rel="noreferrer">Read free ↗</a>` : ''}
      ${info.key ? `<a class="pill" href="https://openlibrary.org${info.key}" target="_blank" rel="noreferrer">Open Library ↗</a>` : ''}
    </div>
    <p class="fine rise" style="--i:${i++}">These notes are an original summary written for The Stacks. Nothing here is quoted from the work.</p>`;
  kinetic($('card-title'), b.title);
  card.scrollTop = 0;
  card.classList.add('on');
}

function toggleRead(id: string): void {
  if (read.has(id)) read.delete(id);
  else read.add(id);
  saveRead();
  library.setRead(read);
  renderNav();
  if (pathId) renderPathBar();
  const btn = document.getElementById('mark');
  if (btn) {
    const on = read.has(id);
    btn.className = `pill ${on ? 'read-on' : 'solid'}`;
    btn.textContent = on ? '✓ Read' : 'Mark as read';
  }
}

// ── reading paths ────────────────────────────────────────────────────────────

function renderPathBar(): void {
  const p = PATHS.find((x) => x.id === pathId);
  if (!p) return;
  const done = p.books.filter((id) => read.has(id)).length;
  $('path-meta').textContent = `Reading path · ${p.weeks} weeks · ${done} of ${p.books.length} read`;
  $('path-name').textContent = p.name;
  $('path-steps').innerHTML = p.books
    .map((id, i) => `<li><button class="${read.has(id) ? 'read' : ''}" data-book="${id}" style="--i:${i}"><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(byId.get(id)!.title)}</span></button></li>`)
    .join('');
}

function setPath(id: string | null): void {
  pathId = id;
  const p = PATHS.find((x) => x.id === id) ?? null;
  if (openId) openBook(null);
  library.setPath(p ? p.books : null);
  $('pathbar').classList.toggle('hidden', !p);
  document.body.classList.toggle('quiet', Boolean(p));
  $('steps').innerHTML = p ? p.books.map((_, i) => `<span>${i + 1}</span>`).join('') : '';
  if (p) renderPathBar();
  $<HTMLInputElement>('search').value = '';
  library.setFilter(null);
}

$('path-list').innerHTML = PATHS.map(
  (p, i) => `<li><button data-path="${p.id}"><i>${i + 1}</i><div><b>${esc(p.name)}</b><span>${esc(p.line)}</span></div><small>${p.books.length} reads · ${p.weeks} weeks</small></button></li>`
).join('');

const sheet = $('paths');
const showSheet = (on: boolean) => sheet.classList.toggle('hidden', !on);

// ── search ───────────────────────────────────────────────────────────────────

function search(query: string): void {
  const q = query.trim().toLowerCase();
  if (!q) {
    library.setFilter(null);
    $('line').textContent = DOMAINS[domain].line;
    return;
  }
  const hits = BOOKS.filter((b) => `${b.title} ${b.author} ${b.who} ${b.ideas.join(' ')}`.toLowerCase().includes(q));
  library.setFilter(new Set(hits.map((b) => b.id)));
  // Turn the room toward the first wall that has a match.
  const here = hits.some((b) => b.domain === DOMAINS[domain].id);
  if (!here && hits.length) showDomain(DOMAINS.findIndex((d) => d.id === hits[0].domain));
  $('line').textContent = hits.length ? `${hits.length} of ${BOOKS.length} match “${query.trim()}”` : `Nothing matches “${query.trim()}”`;
}

// ── events ───────────────────────────────────────────────────────────────────

library.events = {
  onHover(id) {
    hoverId = id;
    const tip = $('tip');
    const b = id ? byId.get(id) : null;
    tip.classList.toggle('on', Boolean(b));
    if (b) tip.innerHTML = `<b>${esc(b.title)}</b><span>${esc(b.author.split(',')[0])} · ${b.year}</span>`;
  },
  onPick(id) {
    if (id && id !== openId) openBook(id);
    else if (!id && openId) openBook(null);
  },
  onTurn(direction) {
    if (openId) step(direction);
    else if (!pathId) showDomain(domain + direction);
  },
  onIntroEnd() {
    $('opening').classList.add('gone');
    $('hud').classList.remove('hidden');
    showDomain(domain);
    const book = params.get('book');
    const path = params.get('path');
    if (path && PATHS.some((p) => p.id === path)) setPath(path);
    else if (book && byId.has(book)) openBook(book);
  },
};

/** With a book open, move to its neighbour on the shelf or on the path. */
function step(direction: number): void {
  if (!openId) return;
  const list = pathId ? PATHS.find((p) => p.id === pathId)!.books : BOOKS.filter((b) => b.domain === byId.get(openId!)!.domain).map((b) => b.id);
  const i = list.indexOf(openId);
  if (i >= 0) openBook(list[(i + direction + list.length) % list.length]);
}

$('nav').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button');
  if (btn) showDomain(Number(btn.dataset.i));
});

$('card').addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  if (t.closest('.close')) openBook(null);
  else if (t.closest('#mark') && openId) toggleRead(openId);
  else {
    const to = t.closest<HTMLElement>('[data-book]')?.dataset.book;
    if (to) {
      // A related book may live on another wall: leave the path and walk there.
      if (pathId && !PATHS.find((p) => p.id === pathId)!.books.includes(to)) setPath(null);
      openBook(to);
    }
  }
});

$('path-steps').addEventListener('click', (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>('[data-book]')?.dataset.book;
  if (id) openBook(id);
});
$('path-exit').addEventListener('click', () => setPath(null));
$('paths-open').addEventListener('click', () => showSheet(true));
$('paths-close').addEventListener('click', () => showSheet(false));
sheet.addEventListener('click', (e) => {
  const id = (e.target as HTMLElement).closest<HTMLElement>('[data-path]')?.dataset.path;
  if (id) {
    showSheet(false);
    setPath(id);
  } else if (e.target === sheet) showSheet(false);
});

const searchInput = $<HTMLInputElement>('search');
searchInput.addEventListener('input', () => {
  if (pathId) setPath(null);
  if (openId) openBook(null);
  search(searchInput.value);
});

window.addEventListener('keydown', (e) => {
  const typing = e.target === searchInput;
  if (e.key === 'Escape') {
    if (!sheet.classList.contains('hidden')) showSheet(false);
    else if (openId) openBook(null);
    else if (pathId) setPath(null);
    else if (searchInput.value) {
      searchInput.value = '';
      search('');
      searchInput.blur();
    }
    return;
  }
  if (typing) return;
  if (e.key === '/') {
    e.preventDefault();
    searchInput.focus();
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    library.events.onTurn(e.key === 'ArrowRight' ? 1 : -1);
  } else if ((e.key === 'r' || e.key === 'R') && openId) toggleRead(openId);
});

// ── labels that ride on the books ────────────────────────────────────────────

function follow(): void {
  if (hoverId) {
    const p = library.screenOf(hoverId, -1.2);
    if (p) $('tip').style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, 0)`;
  }
  const p = pathId ? PATHS.find((x) => x.id === pathId) : null;
  if (p) {
    const marks = $('steps').children;
    p.books.forEach((id, i) => {
      const at = library.screenOf(id, 1.2);
      const el = marks[i] as HTMLElement | undefined;
      if (!el) return;
      el.style.opacity = at && !openId ? '1' : '0';
      if (at) el.style.transform = `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    });
  }
  requestAnimationFrame(follow);
}

// ── start ────────────────────────────────────────────────────────────────────

kinetic($('opening-title'), 'The Stacks');
library.setRead(read);
renderNav();
requestAnimationFrame(follow);

// Handy while developing.
if (import.meta.env.DEV) Object.assign(window, { __stacks: { library, openBook, setPath, showDomain } });
