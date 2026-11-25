// Gera os ícones do 7Líder: calendário com os pontos formando um "7".
const { chromium } = require("playwright");
// Uso: node scripts/gerar-icones.js public/icones
const out = process.argv[2];
const ESCURO = "#4f46e5", CLARO = "#a5b4fc", TOPO = "#c7d2fe", ARGOLA = "#e0e7ff";
const SETE = new Set(["0,0", "1,0", "2,0", "2,1", "1,2"]); // (coluna,linha)

// Desenho do calendário num quadro 512x512 (sem fundo).
function calendario({ selo = false } = {}) {
  const corpo = selo ? "#fff" : "#fff";
  let s = "";
  if (!selo) {
    s += `<rect x="103" y="112" width="307" height="306" rx="34" fill="${corpo}"/>`;
    s += `<path d="M137 112h239a34 34 0 0 1 34 34v45H103v-45a34 34 0 0 1 34-34z" fill="${TOPO}"/>`;
    s += `<rect x="175" y="85" width="27" height="56" rx="13.5" fill="${ARGOLA}"/><rect x="310" y="85" width="27" height="56" rx="13.5" fill="${ARGOLA}"/>`;
  } else {
    s += `<mask id="m"><rect width="512" height="512" fill="#fff"/>`;
  }
  const xs = [182, 256, 330], ys = [250, 304, 358];
  for (let c = 0; c < 3; c++)
    for (let l = 0; l < 3; l++) {
      const no7 = SETE.has(`${c},${l}`);
      if (selo) { if (no7) s += `<circle cx="${xs[c]}" cy="${ys[l]}" r="20" fill="#000"/>`; }
      else s += `<circle cx="${xs[c]}" cy="${ys[l]}" r="${no7 ? 17 : 15}" fill="${no7 ? ESCURO : CLARO}"/>`;
    }
  if (selo) {
    s += `</mask><g mask="url(#m)" fill="#fff"><rect x="103" y="112" width="307" height="306" rx="34"/>`;
    s += `<rect x="175" y="70" width="27" height="60" rx="13.5"/><rect x="310" y="70" width="27" height="60" rx="13.5"/></g>`;
  }
  return s;
}
const svg = (conteudo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${conteudo}</svg>`;
const escala = (f, c) => `<g transform="translate(${256 * (1 - f)} ${256 * (1 - f)}) scale(${f})">${c}</g>`;
const ICONES = [
  // [arquivo, tamanho, svg]
  ["icone-512.png", 512, svg(`<rect width="512" height="512" rx="112" fill="${ESCURO}"/>${calendario()}`)],
  ["icone-192.png", 192, svg(`<rect width="512" height="512" rx="112" fill="${ESCURO}"/>${calendario()}`)],
  ["icone-notificacao-96.png", 96, svg(`<rect width="512" height="512" rx="112" fill="${ESCURO}"/>${calendario()}`)],
  ["icone-maskable-512.png", 512, svg(`<rect width="512" height="512" fill="${ESCURO}"/>${escala(0.75, calendario())}`)],
  ["apple-touch-icon.png", 180, svg(`<rect width="512" height="512" fill="${ESCURO}"/>${escala(0.9, calendario())}`)],
  ["selo-96.png", 96, svg(calendario({ selo: true }))],
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [nome, tam, s] of ICONES) {
    await p.setViewportSize({ width: tam, height: tam });
    await p.setContent(`<html><body style="margin:0;background:transparent">${s.replace('width="512" height="512">', `width="${tam}" height="${tam}">`)}</body></html>`);
    await p.screenshot({ path: `${out}/${nome}`, omitBackground: true, clip: { x: 0, y: 0, width: tam, height: tam } });
  }
  await b.close();
})();
