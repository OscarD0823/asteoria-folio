const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export async function svgImage(svg: string, width = 1000, height = 600) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function equationImage(latex: string) {
  if (latex.length > 8000)
    throw new Error("La ecuación supera 8000 caracteres.");
  const [
    { mathjax },
    { TeX },
    { SVG },
    { liteAdaptor },
    { RegisterHTMLHandler },
  ] = await Promise.all([
    import("mathjax-full/js/mathjax.js"),
    import("mathjax-full/js/input/tex.js"),
    import("mathjax-full/js/output/svg.js"),
    import("mathjax-full/js/adaptors/liteAdaptor.js"),
    import("mathjax-full/js/handlers/html.js"),
  ]);
  await Promise.all([
    import("mathjax-full/js/input/tex/ams/AmsConfiguration.js"),
    import("mathjax-full/js/input/tex/noundefined/NoUndefinedConfiguration.js"),
  ]);
  const adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  const document = mathjax.document("", {
    InputJax: new TeX({ packages: ["base", "ams", "noundefined"] }),
    OutputJax: new SVG({ fontCache: "local" }),
  });
  const rendered = document.convert(latex, { display: true });
  const outer = adaptor.outerHTML(rendered),
    match = outer.match(/<svg\b[\s\S]*?<\/svg>/);
  if (!match) throw new Error("No se pudo representar la ecuación.");
  const view = match[0].match(/viewBox="([^"]+)"/);
  const box = (view?.[1] ?? "0 0 1000 200").split(/\s+/).map(Number);
  const ratio = Math.max(0.1, box[2] / box[3]);
  const w = Math.min(1800, Math.max(400, ratio * 160)),
    h = Math.max(80, w / ratio);
  const svg = match[0]
    .replace(/width="[^"]+"/, 'width="' + w + '"')
    .replace(/height="[^"]+"/, 'height="' + h + '"')
    .replace(/currentColor/g, "#20273a");
  const displayWidth = Math.min(600, Math.max(40, (box[2] / 1000) * 22));
  return {
    src: await svgImage(svg, w, h),
    width: displayWidth,
    height: displayWidth / ratio,
  };
}
export async function chartImage(
  values: string,
  kind: string,
  title: string,
  color = "#6554d8",
) {
  const rows = values
    .split("\n")
    .filter((s) => s.trim())
    .map((s) => {
      const match = s.match(/^(.*?)[;\t:]\s*(-?\d+(?:[.,]\d+)?)\s*$/);
      if (!match) throw new Error("Usa una fila por dato: Nombre; 25");
      return {
        name: match[1].trim(),
        value: Number(match[2].replace(",", ".")),
      };
    });
  if (!rows.length || rows.length > 50)
    throw new Error("Introduce entre 1 y 50 datos.");
  const w = 1000,
    h = 600,
    max = Math.max(1, ...rows.map((r) => Math.abs(r.value))),
    min = Math.min(0, ...rows.map((r) => r.value));
  let elements = "";
  if (kind === "pie") {
    if (rows.some((r) => r.value < 0) || rows.every((r) => r.value === 0))
      throw new Error("Un gráfico circular necesita valores positivos.");
    const total = rows.reduce((s, r) => s + r.value, 0);
    let angle = -Math.PI / 2;
    rows.forEach((r, i) => {
      const end = angle + (r.value / total) * 2 * Math.PI,
        x = 360 + 200 * Math.cos(angle),
        y = 310 + 200 * Math.sin(angle),
        ex = 360 + 200 * Math.cos(end),
        ey = 310 + 200 * Math.sin(end);
      elements +=
        rows.length === 1
          ? `<circle cx="360" cy="310" r="200" fill="${color}"/>`
          : `<path d="M360 310 L${x} ${y} A200 200 0 ${end - angle > Math.PI ? 1 : 0} 1 ${ex} ${ey} Z" fill="hsl(${250 + i * 45} 65% 62%)"/>`;
      elements += `<text x="610" y="${140 + i * 28}" font-size="20">${escape(r.name)}: ${r.value}</text>`;
      angle = end;
    });
  } else {
    const points: string[] = [];
    rows.forEach((r, i) => {
      const x = 90 + (i * 830) / rows.length,
        y = 480 - ((r.value - min) / (max - min)) * 340,
        zero = 480 - ((0 - min) / (max - min)) * 340;
      points.push(`${x + 20},${y}`);
      elements +=
        kind === "line"
          ? `<circle cx="${x + 20}" cy="${y}" r="6" fill="${color}"/>`
          : `<rect x="${x}" y="${Math.min(y, zero)}" width="${Math.max(4, 600 / rows.length)}" height="${Math.max(1, Math.abs(zero - y))}" rx="4" fill="${color}"/>`;
      elements += `<text x="${x}" y="535" font-size="${rows.length > 12 ? 12 : 18}">${escape(r.name.slice(0, 12))}</text><text x="${x}" y="${y - 12}" font-size="18">${r.value}</text>`;
    });
    if (kind === "line")
      elements += `<polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="4"/>`;
    elements += `<path d="M70 100 V500 H950" fill="none" stroke="#a2a9bb" stroke-width="2"/>`;
  }
  return svgImage(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="white"/><g fill="#20273a" font-family="Arial"><text x="70" y="60" font-size="28" font-weight="bold">${escape(title)}</text>${elements}</g></svg>`,
    w,
    h,
  );
}
export async function shapeImage(
  kind: string,
  label: string,
  color = "#6554d8",
) {
  const shapes: Record<string, string> = {
    rectangle: '<rect x="25" y="25" width="550" height="350" rx="22"/>',
    ellipse: '<ellipse cx="300" cy="200" rx="275" ry="175"/>',
    triangle: '<path d="M300 25 L575 375 H25 Z"/>',
    arrow: '<path d="M25 130 H390 V25 L575 200 390 375 V270 H25 Z"/>',
    star: '<path d="M300 20 L365 135 500 155 400 245 425 380 300 315 175 380 200 245 100 155 235 135 Z"/>',
    heart:
      '<path d="M300 365 C-80 120 130 -90 300 120 C470 -90 680 120 300 365 Z"/>',
  };
  return svgImage(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><g fill="${color}">${shapes[kind] ?? shapes.rectangle}</g><text x="300" y="220" text-anchor="middle" fill="white" font-family="Arial" font-size="32">${escape(label)}</text></svg>`,
    600,
    400,
  );
}
export const symbolGroups: Record<string, string[]> = {
  Matemáticas: Array.from("±×÷≠≈≤≥∞∑∏∫√∂∆∇∈∉⊂⊆∪∩∀∃∅ℝℕℤℚℂ"),
  Griego: Array.from("αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΘΛΞΠΣΦΨΩ"),
  "Monedas y signos": Array.from("€£¥₹₩₽¢©®™§¶†‡°‰‱…–—«»¿¡"),
  Flechas: Array.from("←↑→↓↔↕↖↗↘↙⇒⇐⇔⇧⇩"),
  Íconos: Array.from("★☆✓✔✕✖☑☐☀☁☂☎♠♣♥♦♪♫⚑⚙"),
};
