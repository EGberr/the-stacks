import * as THREE from 'three';
import type { Book, Domain } from '../data/catalog.ts';

const W = 400;
const H = 592;
const DISPLAY = '"Bodoni Moda", "Didot", Georgia, serif';
const TEXT = '"Instrument Sans", system-ui, sans-serif';

function wrap(g: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Sets the largest font size at which the title fits the box, and returns its lines. */
function fitTitle(g: CanvasRenderingContext2D, title: string, font: (px: number) => string, width: number, height: number): [string[], number] {
  for (let px = 58; px >= 22; px -= 2) {
    g.font = font(px);
    const lines = wrap(g, title, width);
    if (lines.length * px * 1.04 <= height && lines.every((l) => g.measureText(l).width <= width)) return [lines, px];
  }
  g.font = font(22);
  return [wrap(g, title, width), 22];
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * A typographic cover, drawn in code. Every book starts with one; books that
 * have artwork on Open Library swap to it when the image arrives. Papers keep
 * theirs: they never had a cover.
 */
export function drawCover(book: Book, domain: Domain): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const paper = book.kind === 'paper';
  const ink = paper ? '#1a1712' : '#fbf5e9';

  if (paper) {
    g.fillStyle = '#efe6d2';
    g.fillRect(0, 0, W, H);
    // Ruled lines, like a typeset abstract.
    g.fillStyle = 'rgba(26,23,18,0.10)';
    for (let y = 392; y < H - 60; y += 13) g.fillRect(44, y, (W - 88) * (y % 39 === 2 ? 0.62 : 1), 2);
    g.fillStyle = domain.color;
    g.fillRect(0, 0, W, 12);
  } else {
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, domain.color);
    grad.addColorStop(1, '#14110d');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // One large arc as the only ornament.
    g.strokeStyle = 'rgba(251,245,233,0.16)';
    g.lineWidth = 2;
    for (let r = 120; r <= 300; r += 60) {
      g.beginPath();
      g.arc(W + 20, H + 20, r, 0, Math.PI * 2);
      g.stroke();
    }
  }

  g.fillStyle = paper ? domain.color : 'rgba(251,245,233,0.78)';
  g.font = `600 15px ${TEXT}`;
  (g as unknown as { letterSpacing: string }).letterSpacing = '4px';
  g.fillText(paper ? `PAPER · ${book.year}` : domain.name.toUpperCase(), 44, 70);
  (g as unknown as { letterSpacing: string }).letterSpacing = '0px';

  g.fillStyle = ink;
  const [lines, px] = fitTitle(g, book.title, (s) => `italic 600 ${s}px ${DISPLAY}`, W - 88, 250);
  lines.forEach((line, i) => g.fillText(line, 44, 132 + px * 0.8 + i * px * 1.04));

  g.fillStyle = paper ? 'rgba(26,23,18,0.72)' : 'rgba(251,245,233,0.8)';
  g.font = `500 17px ${TEXT}`;
  wrap(g, book.author, W - 88)
    .slice(0, 2)
    .forEach((line, i) => g.fillText(line, 44, H - 66 + i * 22));
  return toTexture(canvas);
}

/** The first page, seen when the cover swings open. */
export function drawTitlePage(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#f3ead8';
  g.fillRect(0, 0, W, H);
  const shade = g.createLinearGradient(0, 0, 70, 0);
  shade.addColorStop(0, 'rgba(40,30,15,0.34)');
  shade.addColorStop(1, 'rgba(40,30,15,0)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 70, H);
  g.fillStyle = 'rgba(26,23,18,0.82)';
  g.textAlign = 'center';
  g.font = `italic 500 52px ${DISPLAY}`;
  g.fillText('Five', W / 2 + 10, 250);
  g.fillText('ideas', W / 2 + 10, 306);
  g.font = `600 13px ${TEXT}`;
  (g as unknown as { letterSpacing: string }).letterSpacing = '5px';
  g.fillStyle = 'rgba(26,23,18,0.5)';
  g.fillText('THE STACKS', W / 2 + 10, 372);
  g.fillRect(W / 2 - 14, 334, 48, 1.5);
  return toTexture(canvas);
}

/** Open Library serves covers with CORS headers, so they can be used as WebGL textures. */
export function loadArtwork(coverId: number, onLoad: (tex: THREE.Texture) => void): void {
  new THREE.TextureLoader().setCrossOrigin('anonymous').load(
    `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`,
    (tex) => {
      // Open Library answers a missing cover with a 1×1 image rather than an error.
      const img = tex.image as HTMLImageElement;
      if (img.width < 40) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      onLoad(tex);
    },
    undefined,
    () => {} // Keep the drawn cover.
  );
}
