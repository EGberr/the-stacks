// Looks every book up on Open Library (free, no key) and records its work page
// and cover id, so the site itself makes no API calls. Also checks that each
// "read free" link still answers. Run with: npm run catalog   (Node 23.6+)
import { writeFileSync } from 'node:fs';
import { BOOKS } from '../src/data/catalog.ts';

const out = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

for (const book of BOOKS) {
  const entry = {};
  if (book.kind === 'book') {
    const author = book.author.split(',')[0].split(' ').pop();
    const url =
      'https://openlibrary.org/search.json?limit=5&fields=key,title,cover_i,author_name&title=' +
      encodeURIComponent(book.title) + '&author=' + encodeURIComponent(author);
    try {
      const { docs } = await (await fetch(url, { headers: { 'User-Agent': 'the-stacks catalog builder' } })).json();
      // Only accept a result whose title really matches, and prefer one with a cover.
      const want = norm(book.title);
      const matches = docs.filter((d) => norm(d.title).startsWith(want.slice(0, 18)) || want.startsWith(norm(d.title)));
      const pick = matches.find((d) => d.cover_i) ?? matches[0];
      if (pick) {
        entry.key = pick.key;
        if (pick.cover_i) entry.cover = pick.cover_i;
      }
    } catch (e) {
      console.error(`  search failed for ${book.id}: ${e.message}`);
    }
    await sleep(350); // Be polite to a free service.
  }
  if (book.free) {
    try {
      const res = await fetch(book.free, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 the-stacks link check' } });
      entry.freeOk = res.ok;
      await res.body?.cancel();
    } catch {
      entry.freeOk = false;
    }
  }
  out[book.id] = entry;
  console.log(`${entry.cover ? '▣' : entry.key ? '□' : '·'} ${book.id.padEnd(14)} ${entry.key ?? ''} ${book.free ? (entry.freeOk ? 'free ✓' : 'free ✗') : ''}`);
}

writeFileSync(new URL('../src/data/openlibrary.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
const books = BOOKS.filter((b) => b.kind === 'book');
console.log(`\n${books.filter((b) => out[b.id].cover).length}/${books.length} books with a cover, ${BOOKS.filter((b) => out[b.id].freeOk).length}/${BOOKS.filter((b) => b.free).length} free links alive`);
