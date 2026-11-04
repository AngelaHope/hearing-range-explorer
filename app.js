// Hearing Range Explorer
// Plays pure tones with the Web Audio API and shows where each pitch is
// sensed along the cochlea (high pitches at the base, low at the apex).

const MIN_HZ = 20;
const MAX_HZ = 20000;
const TEST_FREQS = [125, 250, 500, 1000, 2000, 4000, 6000, 8000, 10000,
                    12000, 14000, 15000, 16000, 17000, 18000];
const SVG_NS = "http://www.w3.org/2000/svg";

const $ = (id) => document.getElementById(id);
const formatHz = (hz) => `${Math.round(hz).toLocaleString("en-US")} Hz`;

// Position of a frequency on a 0–1 log scale (0 = 20 Hz, 1 = 20 kHz)
const logPos = (hz) => Math.log(hz / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ);
// Slider value (0–1000) to frequency, on a log scale
const sliderToHz = (v) => MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, v / 1000);

/* ---------- Audio ---------- */

let ctx = null;
let osc = null;
let gain = null;

function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function volume() {
  return Number($("volume").value) / 100;
}

function startContinuous(hz) {
  const ac = audio();
  stopContinuous();
  osc = ac.createOscillator();
  gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = hz;
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(volume(), ac.currentTime + 0.05);
  osc.connect(gain).connect(ac.destination);
  osc.start();
}

function stopContinuous() {
  if (!osc) return;
  const ac = audio();
  gain.gain.cancelScheduledValues(ac.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.05);
  osc.stop(ac.currentTime + 0.06);
  osc = null;
  gain = null;
}

// A single short beep with soft edges, so there is no click
function playBeep(hz, seconds = 1.2) {
  const ac = audio();
  const o = ac.createOscillator();
  const g = ac.createGain();
  const t = ac.currentTime;
  o.type = "sine";
  o.frequency.value = hz;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume(), t + 0.08);
  g.gain.setValueAtTime(volume(), t + seconds - 0.08);
  g.gain.linearRampToValueAtTime(0, t + seconds);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + seconds + 0.02);
  setPlaying(true);
  o.onended = () => { if (!osc) setPlaying(false); };
}

/* ---------- Cochlea spiral ---------- */

const TURNS = 2.6;
const THETA_MAX = TURNS * 2 * Math.PI;
const R_APEX = 16;
const R_BASE = 138;
const K = (R_BASE - R_APEX) / THETA_MAX;

// Point on the spiral for a 0–1 position (0 = apex/centre, 1 = base/entrance)
function spiralPoint(p, offset = 0) {
  const theta = p * THETA_MAX;
  const r = R_APEX + K * theta + offset;
  const angle = theta - Math.PI / 2;
  return [r * Math.cos(angle), r * Math.sin(angle)];
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function buildCochlea() {
  const svg = $("cochlea");
  const pts = [];
  for (let i = 0; i <= 400; i++) pts.push(spiralPoint(i / 400));
  const d = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L");
  svg.append(svgEl("path", { d, class: "spiral-track" }));
  svg.append(svgEl("path", { d, class: "spiral-band" }));

  for (const hz of [100, 1000, 10000]) {
    const [x, y] = spiralPoint(logPos(hz));
    const label = svgEl("text", { x, y, class: "spiral-tick", "text-anchor": "middle", "dominant-baseline": "middle" });
    label.textContent = hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`;
    svg.append(label);
  }

  const group = svgEl("g", { id: "marker-group" });
  group.append(svgEl("circle", { r: 16, class: "marker-glow" }));
  group.append(svgEl("circle", { r: 8, class: "marker" }));
  svg.append(group);
}

function moveMarker(hz) {
  const [x, y] = spiralPoint(logPos(hz));
  $("marker-group").setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
}

function setPlaying(on) {
  $("cochlea").classList.toggle("playing", on);
}

/* ---------- Explore mode ---------- */

function currentSliderHz() {
  return sliderToHz(Number($("freq").value));
}

function updateExplore() {
  const hz = currentSliderHz();
  $("freq-out").textContent = formatHz(hz);
  moveMarker(hz);
  if (osc) osc.frequency.setTargetAtTime(hz, audio().currentTime, 0.02);
}

function toggleExplore() {
  const btn = $("play-toggle");
  if (osc) {
    stopContinuous();
    btn.textContent = "Play tone";
    setPlaying(false);
  } else {
    startContinuous(currentSliderHz());
    btn.textContent = "Stop tone";
    setPlaying(true);
  }
}

/* ---------- Hearing test ---------- */

let step = 0;
let answers = [];

function startTest() {
  if (osc) toggleExplore();
  step = 0;
  answers = [];
  $("test-start").hidden = true;
  $("results").hidden = true;
  $("test-step").hidden = false;
  showStep();
}

function showStep() {
  const hz = TEST_FREQS[step];
  $("step-count").textContent = `Tone ${step + 1} of ${TEST_FREQS.length}`;
  $("step-freq").textContent = formatHz(hz);
  moveMarker(hz);
  playBeep(hz);
}

function answer(heard) {
  answers.push({ hz: TEST_FREQS[step], heard });
  step += 1;
  if (step < TEST_FREQS.length) showStep();
  else showResults();
}

function showResults() {
  $("test-step").hidden = true;
  $("results").hidden = false;
  const heard = answers.filter((a) => a.heard).map((a) => a.hz);

  let line;
  if (heard.length === 0) {
    line = "You didn't hear any tones. Raise the volume slider a little and try again.";
  } else {
    const low = Math.min(...heard);
    const high = Math.max(...heard);
    line = `You heard tones from ${formatHz(low)} up to ${formatHz(high)}.`;
    const gaps = answers.filter((a) => !a.heard && a.hz > low && a.hz < high);
    if (gaps.length) {
      line += ` You missed ${gaps.map((g) => formatHz(g.hz)).join(" and ")} in between, which can happen with quiet speakers or background noise.`;
    }
    moveMarker(high);
  }
  $("result-line").textContent = line;
  drawChart(heard);
  $("restart").focus();
}

function drawChart(heard) {
  const svg = $("chart");
  svg.querySelectorAll(":not(title)").forEach((n) => n.remove());
  const left = 20, right = 620, mid = 80;
  const x = (hz) => left + logPos(hz) * (right - left);

  for (const hz of [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]) {
    svg.append(svgEl("line", { x1: x(hz), x2: x(hz), y1: 30, y2: 130, class: "gridline" }));
    const t = svgEl("text", { x: x(hz), y: 152, "text-anchor": "middle" });
    t.textContent = hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
    svg.append(t);
  }
  svg.append(svgEl("line", { x1: left, x2: right, y1: mid, y2: mid, class: "axis" }));
  const unit = svgEl("text", { x: right, y: 20, "text-anchor": "end" });
  unit.textContent = "Pitch (Hz)";
  svg.append(unit);

  if (heard.length) {
    const lo = x(Math.min(...heard)), hi = x(Math.max(...heard));
    svg.append(svgEl("rect", { x: lo, y: mid - 22, width: Math.max(hi - lo, 2), height: 44, rx: 6, class: "range" }));
  }
  for (const a of answers) {
    svg.append(svgEl("circle", { cx: x(a.hz), cy: mid, r: 7, class: a.heard ? "heard-mark" : "missed-mark" }));
  }
}

/* ---------- Wire up ---------- */

buildCochlea();
updateExplore();

$("freq").addEventListener("input", updateExplore);
$("play-toggle").addEventListener("click", toggleExplore);
$("volume").addEventListener("input", () => {
  $("volume-out").textContent = `${$("volume").value}%`;
  if (gain) gain.gain.setTargetAtTime(volume(), audio().currentTime, 0.02);
});
$("start-test").addEventListener("click", startTest);
$("replay").addEventListener("click", () => playBeep(TEST_FREQS[step]));
$("heard").addEventListener("click", () => answer(true));
$("missed").addEventListener("click", () => answer(false));
$("restart").addEventListener("click", startTest);
