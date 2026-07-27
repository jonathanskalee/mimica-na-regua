/**
 * Gera os ícones do PWA a partir de uma única definição de arte.
 *
 * Rode com `npm run icons` depois de mexer no desenho.
 *
 * A marca é um ingresso com as lâmpadas da marquise em cima — a mesma
 * linguagem das telas. O "M" é desenhado como traçado, não como texto, para
 * não depender de nenhuma fonte instalada na máquina que gera os PNGs.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(publicDir, { recursive: true });

const NOITE = "#14070c";
const OURO = "#f2c14e";
const TINTA = "#241014";

/** O desenho, centrado num quadro de 512×512. */
const artwork = `
  <defs>
    <mask id="recortes">
      <rect width="512" height="512" fill="#000"/>
      <rect x="106" y="172" width="300" height="196" rx="26" fill="#fff"/>
      <circle cx="106" cy="270" r="28" fill="#000"/>
      <circle cx="406" cy="270" r="28" fill="#000"/>
    </mask>
  </defs>

  <!-- lâmpadas da marquise -->
  <circle cx="196" cy="124" r="13" fill="${OURO}"/>
  <circle cx="256" cy="112" r="13" fill="${OURO}"/>
  <circle cx="316" cy="124" r="13" fill="${OURO}"/>

  <!-- o ingresso, com os recortes do canhoto -->
  <g mask="url(#recortes)">
    <rect x="106" y="172" width="300" height="196" rx="26" fill="${OURO}"/>
  </g>

  <!-- M vazado -->
  <path d="M 214 322 L 214 224 L 256 276 L 298 224 L 298 322"
        fill="none" stroke="${TINTA}" stroke-width="30"
        stroke-linejoin="miter" stroke-linecap="square"/>
`;

const svg = (inner, { rounded }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512"${rounded ? ' rx="112"' : ""} fill="${NOITE}"/>
  ${inner}
</svg>`;

// Empurra o conjunto para baixo: as lâmpadas ocupam menos altura que o
// ingresso, então centrar pela caixa deixaria a marca visualmente alta.
const centrado = `<g transform="translate(0 22)">${artwork}</g>`;

const icon = svg(centrado, { rounded: true });

// O Android recorta o ícone maskable num círculo de 80% do quadro, então o
// desenho encolhe para caber na zona segura em vez de perder as bordas.
const maskable = svg(
  `<g transform="translate(51.2 51.2) scale(0.8)">${centrado}</g>`,
  { rounded: false }
);

writeFileSync(join(publicDir, "icon.svg"), icon);

const targets = [
  { svg: icon, size: 192, name: "icon-192.png" },
  { svg: icon, size: 512, name: "icon-512.png" },
  { svg: maskable, size: 512, name: "icon-maskable-512.png" },
];

for (const t of targets) {
  await sharp(Buffer.from(t.svg)).resize(t.size, t.size).png().toFile(join(publicDir, t.name));
  console.log(`gerado public/${t.name}`);
}
