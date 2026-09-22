// Gambar sampul bawaan tiap bulan (SVG kecil) sebelum user mengunggah gambarnya sendiri.
const PAL = [
  ['#DCE9F7', '#F6E7F0', '#BFD9C5', '#9CC7A9', '#F4A3B5'], ['#F9DDE4', '#FDF0E9', '#C9DFC2', '#A8CDA0', '#E9788C'],
  ['#DDEFE2', '#F4F8E0', '#BADAB0', '#93C48A', '#F7D26B'], ['#FBD9E2', '#FDEEF1', '#C8E2C0', '#A2CF9A', '#F19AB3'],
  ['#D8EAF8', '#EAF6EF', '#B5DBB0', '#8CC58D', '#F7B7C6'], ['#D3E8F7', '#F0F8FB', '#C0DFC0', '#98CB9D', '#FFFFFF'],
  ['#FFE9D6', '#FFF6E8', '#CFE4B8', '#A9D18F', '#F4869B'], ['#CDEBF2', '#EAF8F0', '#B9DFAF', '#8FCB8E', '#FFD36E'],
  ['#C9E5F2', '#E8F5F0', '#B9DBB4', '#8FC48F', '#FFC48A'], ['#F8E0C6', '#FBEBD9', '#D9D6A3', '#C1BC7B', '#E58B58'],
  ['#E6DCF0', '#F3EBF6', '#CFD6B4', '#B4BE93', '#C79BD9'], ['#DDE7F4', '#F3F1F8', '#CADFD3', '#A9CBB9', '#E0687A'],
];

export function coverSVG(i: number): string {
  const p = PAL[i];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 140' preserveAspectRatio='xMidYMid slice'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${p[0]}'/><stop offset='1' stop-color='${p[1]}'/></linearGradient></defs>` +
    `<rect width='240' height='140' fill='url(#g)'/><circle cx='${40 + ((i * 37) % 140)}' cy='38' r='16' fill='#fff' opacity='.75'/>` +
    `<ellipse cx='172' cy='34' rx='26' ry='9' fill='#fff' opacity='.8'/><ellipse cx='190' cy='28' rx='16' ry='9' fill='#fff' opacity='.8'/>` +
    `<path d='M0 100 Q60 66 120 96 T240 88 V140 H0Z' fill='${p[2]}'/><path d='M0 118 Q70 92 140 116 T240 108 V140 H0Z' fill='${p[3]}'/>` +
    `<g fill='${p[4]}'><circle cx='40' cy='118' r='4'/><circle cx='62' cy='126' r='3'/><circle cx='190' cy='122' r='4'/><circle cx='210' cy='114' r='3'/><circle cx='120' cy='124' r='3'/></g></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
}
