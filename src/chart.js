// chart.js — a tiny line chart drawn on <canvas>, so the project needs no chart library.

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const shortMoney = (v) =>
  Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}k`;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string[]} labels  x-axis labels
 * @param {{name: string, values: number[], color: string}[]} series
 */
export function drawLineChart(canvas, labels, series) {
  // Match the canvas to its on-screen size so lines stay sharp on retina screens
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight || 260;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const pad = { top: 28, right: 12, bottom: 28, left: 56 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 0);
  const min = Math.min(...all, 0);
  const x = (i) => pad.left + (labels.length === 1 ? 0 : (i / (labels.length - 1)) * plotW);
  const y = (v) => pad.top + plotH - ((v - min) / (max - min || 1)) * plotH;

  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = css("--muted");
  ctx.strokeStyle = css("--line");
  ctx.lineWidth = 1;

  // Horizontal gridlines + y labels
  for (let i = 0; i <= 4; i++) {
    const v = min + ((max - min) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y(v));
    ctx.lineTo(width - pad.right, y(v));
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(shortMoney(v), pad.left - 8, y(v) + 4);
  }

  // X labels (thinned so they don't overlap)
  const step = Math.ceil(labels.length / 8);
  ctx.textAlign = "center";
  const last = labels.length - 1;
  labels.forEach((label, i) => {
    const isTick = i % step === 0;
    const lastFits = i === last && last % step >= step / 2;
    if (isTick || lastFits) ctx.fillText(label, x(i), height - 8);
  });

  // Lines + legend
  let legendX = pad.left;
  series.forEach((s) => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    s.values.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
    ctx.stroke();

    ctx.fillStyle = s.color;
    ctx.fillRect(legendX, 8, 12, 12);
    ctx.fillStyle = css("--text");
    ctx.textAlign = "left";
    ctx.fillText(s.name, legendX + 18, 18);
    legendX += ctx.measureText(s.name).width + 40;
  });
}
