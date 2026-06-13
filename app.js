/* ════════════════════════════════════════════════════════
   UTBK TRYOUT — app.js
   Vanilla JS, static-only, no dependencies
   ════════════════════════════════════════════════════════ */

"use strict";

/* ─── STATE ──────────────────────────────────────────────── */
let state = {
  data: null,               // loaded from soal.json
  currentSubtestIdx: 0,     // which subtest we're on
  currentSoalIdx: 0,        // which question within subtest

  // per-subtest: array of per-question objects
  // { jawaban: String|null, ragu: Boolean }
  answers: [],              // answers[subtestIdx][soalIdx]

  timerInterval: null,
  timeLeft: 0,              // seconds remaining
};

/* ─── UTILS ──────────────────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showPage(id) {
  $$('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function stripSpaces(str) {
  return String(str).trim().replace(/\s+/g, '').toLowerCase();
}

const scoreConversion = {
  tps_pu: [
    131.2, 156.4, 181.5, 206.7, 231.9, 257, 282.2, 307.4, 332.5, 357.7,
    382.8, 408, 433.2, 458.3, 483.5, 508.7, 533.8, 559, 584.2, 609.3,
    634.5, 659.6, 684.8, 710, 735.1, 760.3, 785.5, 810.6, 835.8, 861,
    886.1
  ],
  tps_ppu: [
    159.9, 195.7, 231.5, 267.3, 303.1, 338.9, 374.7, 410.5, 446.3, 482.1,
    517.9, 553.7, 589.5, 625.3, 661.1, 696.9, 732.7, 768.5, 804.4, 840.2,
    876
  ],
  tps_pbm: [
    160.5, 195.4, 230.2, 265, 299.9, 334.7, 369.5, 404.3, 439.2, 474,
    508.8, 543.7, 578.5, 613.3, 648.2, 683, 717.8, 752.6, 787.5, 822.3,
    857.1
  ],
  tps_pk: [
    192, 232.4, 272.8, 313.2, 353.6, 394, 434.4, 474.8, 515.2, 555.6,
    596, 636.4, 676.8, 717.2, 757.6, 798, 838.4, 878.8, 919.2, 959.6,
    1000
  ],
  literasi_indo: [
    233.8, 266.4, 299, 331.6, 364.2, 396.8, 429.4, 462, 494.6, 527.2,
    559.8, 592.4, 625, 657.6, 690.2, 722.8, 755.4, 788, 820.6, 853.2,
    885.8
  ],
  literasi_inggris: [
    126.3, 151.1, 175.9, 200.8, 225.6, 250.4, 275.2, 300, 324.8, 349.6,
    374.5, 399.3, 424.1, 448.9, 473.7, 498.5, 523.4, 548.2, 573, 597.8,
    622.6
  ],
  literasi_mat: [
    242.4, 280.3, 318.1, 356, 393.9, 431.7, 469.7, 507.5, 545.4, 583.3,
    621.2, 659.1, 697, 734.8, 772.7, 810.6, 848.5, 886.4, 924.2, 962.1,
    1000
  ]
};

function convertScore(subtestId, correctCount) {
  const table = scoreConversion[subtestId];
  if (!table) return 0;
  const idx = Math.max(0, Math.min(correctCount, table.length - 1));
  return table[idx];
}

function formatScore(value) {
  return Number(value).toFixed(1).replace(/\.0$/, '');
}

/* ─── BOOT ───────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('soal.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
    initStartPage();
  } catch (err) {
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;font-family:sans-serif;color:#f87171;text-align:center;padding:24px;">
        <div style="font-size:48px;">⚠️</div>
        <h2 style="color:#f8fafc">Gagal memuat soal.json</h2>
        <p style="color:#94a3b8;max-width:400px;">Pastikan file <code style="color:#2dd4bf">soal.json</code> berada di folder yang sama dengan <code style="color:#2dd4bf">index.html</code>.<br><br>Jika menjalankan secara lokal, gunakan live server (bukan file:// langsung) karena browser memblokir fetch dari file:// .</p>
        <p style="color:#64748b;font-size:13px;">Error: ${err.message}</p>
      </div>`;
  }
});

/* ─── START PAGE ─────────────────────────────────────────── */
function initStartPage() {
  const subtests = state.data.subtests;

  // Counts
  let totalSoal = 0, totalMenit = 0;
  subtests.forEach(st => {
    totalSoal += st.soal.length;
    totalMenit += st.durasi_menit;
  });

  $('#total-subtes-count').textContent = subtests.length;
  $('#total-soal-count').textContent = totalSoal;
  const jam = Math.floor(totalMenit / 60);
  const mnt = totalMenit % 60;
  $('#total-waktu-count').textContent = jam > 0 ? `${jam}j ${mnt}m` : `${mnt} mnt`;

  // Subtest list
  const list = $('#subtest-order-list');
  subtests.forEach((st, i) => {
    const item = document.createElement('div');
    item.className = 'subtest-order-item';
    const isianCount = st.soal.filter(s => s.tipe === 'isian_singkat').length;
    const pgCount = st.soal.length - isianCount;
    let tipeMeta = `${pgCount} PG`;
    if (isianCount > 0) tipeMeta += ` + ${isianCount} Isian`;
    item.innerHTML = `
      <span class="sto-name">${i + 1}. ${st.nama}</span>
      <span class="sto-meta">${tipeMeta} · ${st.durasi_menit} mnt</span>
    `;
    list.appendChild(item);
  });

  // Init answers array
  state.answers = subtests.map(st =>
    st.soal.map(() => ({ jawaban: null, ragu: false }))
  );

  $('#btn-mulai').addEventListener('click', startExam);
  showPage('page-start');
}

/* ─── START EXAM ─────────────────────────────────────────── */
function startExam() {
  state.currentSubtestIdx = 0;
  state.currentSoalIdx = 0;
  showPage('page-ujian');
  loadSubtest(0);
}

/* ─── LOAD SUBTEST ───────────────────────────────────────── */
function loadSubtest(idx) {
  const subtests = state.data.subtests;
  const st = subtests[idx];
  state.currentSubtestIdx = idx;
  state.currentSoalIdx = 0;

  // Header labels
  $('#subtest-label').textContent = st.nama;
  $('#subtest-progress').textContent = `Subtes ${idx + 1} dari ${subtests.length}`;

  // Timer
  clearInterval(state.timerInterval);
  state.timeLeft = Math.round(st.durasi_menit * 60);
  updateTimerDisplay();
  state.timerInterval = setInterval(tickTimer, 1000);

  // Render first question
  renderSoal(0);
  renderNavGrid();

  // Selesai subtes button
  $('#btn-selesai-subtes').onclick = () => endSubtest(false);
}

/* ─── TIMER ──────────────────────────────────────────────── */
function tickTimer() {
  state.timeLeft--;
  updateTimerDisplay();
  if (state.timeLeft <= 0) {
    clearInterval(state.timerInterval);
    endSubtest(true);
  }
}

function updateTimerDisplay() {
  const el = $('#timer-display');
  const wrap = $('#timer-wrap');
  el.textContent = formatTime(Math.max(0, state.timeLeft));
  wrap.classList.remove('warning', 'danger');
  const total = state.data.subtests[state.currentSubtestIdx].durasi_menit * 60;
  const ratio = state.timeLeft / total;
  if (state.timeLeft <= 60) wrap.classList.add('danger');
  else if (ratio <= 0.25) wrap.classList.add('warning');
}

/* ─── RENDER SOAL ────────────────────────────────────────── */
function renderSoal(soalIdx) {
  const st = state.data.subtests[state.currentSubtestIdx];
  const soal = st.soal[soalIdx];
  const ans = state.answers[state.currentSubtestIdx][soalIdx];

  state.currentSoalIdx = soalIdx;

  // Header
  $('#soal-num').textContent = `Soal ${soalIdx + 1}`;
  $('#soal-bobot').textContent = `Bobot: ${soal.bobot}`;

  // Ragu button
  const btnRagu = $('#btn-ragu');
  btnRagu.classList.toggle('active', ans.ragu);
  btnRagu.onclick = () => {
    state.answers[state.currentSubtestIdx][soalIdx].ragu = !state.answers[state.currentSubtestIdx][soalIdx].ragu;
    btnRagu.classList.toggle('active', state.answers[state.currentSubtestIdx][soalIdx].ragu);
    renderNavGrid();
  };

  // Soal text with optional gambar
  const soalTextEl = $('#soal-text');
  soalTextEl.innerHTML = '';
  if (soal.gambar) {
    const image = document.createElement('img');
    image.src = soal.gambar;
    image.alt = `Gambar soal ${soalIdx + 1}`;
    image.className = 'soal-image';
    soalTextEl.appendChild(image);
  }
  const question = document.createElement('div');
  question.textContent = soal.pertanyaan;
  soalTextEl.appendChild(question);

  // Opsi or isian
  const container = $('#opsi-container');
  container.innerHTML = '';

  if (soal.tipe === 'pilihan_ganda') {
    Object.entries(soal.opsi).forEach(([key, val]) => {
      const item = document.createElement('div');
      item.className = 'opsi-item' + (ans.jawaban === key ? ' selected' : '');
      item.innerHTML = `<span class="opsi-label">${key}</span><span class="opsi-text">${val}</span>`;
      item.addEventListener('click', () => {
        state.answers[state.currentSubtestIdx][soalIdx].jawaban = key;
        // deselect ragu if answered
        // keep ragu, user controls explicitly
        // re-render
        renderSoal(soalIdx);
        renderNavGrid();
      });
      container.appendChild(item);
    });
  } else {
    // isian singkat
    const wrap = document.createElement('div');
    wrap.className = 'isian-container';
    wrap.innerHTML = `<span class="isian-label">Ketik jawaban Anda:</span>`;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'isian-input';
    input.placeholder = 'Tulis jawaban di sini...';
    input.value = ans.jawaban !== null ? ans.jawaban : '';
    input.addEventListener('input', () => {
      const val = input.value.trim();
      state.answers[state.currentSubtestIdx][soalIdx].jawaban = val === '' ? null : val;
      renderNavGrid();
    });
    wrap.appendChild(input);
    container.appendChild(wrap);
    // focus
    setTimeout(() => input.focus(), 50);
  }

  // Nav buttons
  const btnPrev = $('#btn-prev');
  const btnNext = $('#btn-next');
  btnPrev.disabled = soalIdx === 0;
  btnNext.textContent = soalIdx === st.soal.length - 1 ? 'Selesai Subtes →' : 'Berikutnya →';

  btnPrev.onclick = () => { if (soalIdx > 0) renderSoal(soalIdx - 1); };
  btnNext.onclick = () => {
    if (soalIdx < st.soal.length - 1) {
      renderSoal(soalIdx + 1);
    } else {
      endSubtest(false);
    }
  };

  renderNavGrid();
}

/* ─── NAV GRID ───────────────────────────────────────────── */
function renderNavGrid() {
  const st = state.data.subtests[state.currentSubtestIdx];
  const grid = $('#nav-grid');
  grid.innerHTML = '';

  let dijawab = 0, ragu = 0;

  st.soal.forEach((_, i) => {
    const ans = state.answers[state.currentSubtestIdx][i];
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.textContent = i + 1;

    const isAnswered = ans.jawaban !== null && ans.jawaban !== '';
    const isRagu = ans.ragu;
    const isCurrent = i === state.currentSoalIdx;

    if (isCurrent) btn.classList.add('current');
    else if (isRagu) { btn.classList.add('ragu'); ragu++; }
    else if (isAnswered) { btn.classList.add('answered'); dijawab++; }

    if (isAnswered && !isCurrent) dijawab++;
    // correcting double count above:
    btn.onclick = () => renderSoal(i);
    grid.appendChild(btn);
  });

  // Recount properly
  let countDijawab = 0, countRagu = 0, countKosong = 0;
  st.soal.forEach((_, i) => {
    const ans = state.answers[state.currentSubtestIdx][i];
    const isAnswered = ans.jawaban !== null && ans.jawaban !== '';
    if (ans.ragu) countRagu++;
    if (isAnswered) countDijawab++;
    if (!isAnswered) countKosong++;
  });

  $('#nav-summary').innerHTML = `
    <strong>${countDijawab}</strong> dijawab &nbsp;·&nbsp;
    <strong>${countRagu}</strong> ragu &nbsp;·&nbsp;
    <strong>${countKosong}</strong> kosong
  `;
}

/* ─── END SUBTEST ────────────────────────────────────────── */
function endSubtest(autoEnd) {
  clearInterval(state.timerInterval);

  const stIdx = state.currentSubtestIdx;
  const st = state.data.subtests[stIdx];
  const subtests = state.data.subtests;

  // Hitung jumlah benar untuk konversi nilai
  let benar = 0, salah = 0, kosong = 0;
  st.soal.forEach((soal, i) => {
    const userAns = state.answers[stIdx][i].jawaban;
    if (userAns === null || userAns === '') {
      kosong++;
    } else {
      const correct = soal.tipe === 'isian_singkat'
        ? stripSpaces(userAns) === stripSpaces(soal.jawaban)
        : userAns === soal.jawaban;
      if (correct) { benar++; }
      else salah++;
    }
  });

  const skorSubtest = convertScore(st.id, benar);
  const isLast = stIdx === subtests.length - 1;

  // Transition screen
  const icon = document.getElementById('transisi-icon');
  const title = document.getElementById('transisi-title');
  const desc = document.getElementById('transisi-desc');
  const stats = document.getElementById('transisi-stats');
  const btnLanjut = document.getElementById('btn-lanjut');

  icon.textContent = autoEnd ? '⏰' : '✅';
  title.textContent = autoEnd ? 'Waktu Habis!' : 'Subtes Selesai!';
  desc.textContent = `${st.nama}`;
  stats.innerHTML = `
    <div class="t-stat"><span class="t-stat-val" style="color:var(--green-400)">${benar}</span><span class="t-stat-label">Benar</span></div>
    <div class="t-stat"><span class="t-stat-val" style="color:var(--red-400)">${salah}</span><span class="t-stat-label">Salah</span></div>
    <div class="t-stat"><span class="t-stat-val" style="color:var(--gray-400)">${kosong}</span><span class="t-stat-label">Kosong</span></div>
    <div class="t-stat"><span class="t-stat-val">${formatScore(skorSubtest)}</span><span class="t-stat-label">Nilai</span></div>
  `;

  if (isLast) {
    btnLanjut.textContent = '📊 Lihat Hasil Akhir →';
    btnLanjut.onclick = () => showResults();
  } else {
    btnLanjut.textContent = `Lanjut: ${subtests[stIdx + 1].nama} →`;
    btnLanjut.onclick = () => {
      showPage('page-ujian');
      loadSubtest(stIdx + 1);
    };
  }

  showPage('page-transisi');
}

/* ─── RESULTS PAGE ───────────────────────────────────────── */
function showResults() {
  const subtests = state.data.subtests;
  let totalAverage = 0;
  const subtestResults = [];

  subtests.forEach((st, stIdx) => {
    let benar = 0, salah = 0, kosong = 0;
    st.soal.forEach((soal, i) => {
      const userAns = state.answers[stIdx][i].jawaban;
      if (userAns === null || userAns === '') {
        kosong++;
      } else {
        const correct = soal.tipe === 'isian_singkat'
          ? stripSpaces(userAns) === stripSpaces(soal.jawaban)
          : userAns === soal.jawaban;
        if (correct) { benar++; }
        else salah++;
      }
    });
    const nilai = convertScore(st.id, benar);
    totalAverage += nilai;
    subtestResults.push({ st, stIdx, benar, salah, kosong, nilai });
  });

  const avgScore = subtestResults.length > 0 ? totalAverage / subtestResults.length : 0;
  $('#skor-angka').textContent = formatScore(avgScore);
  $('#skor-max').textContent = '1000';
  const persen = Math.round((avgScore / 1000) * 100);
  $('#skor-persen').textContent = `${persen}%`;

  // Ring animation
  const ringCircumference = 2 * Math.PI * 80; // 502.65
  const offset = ringCircumference - (persen / 100) * ringCircumference;
  setTimeout(() => {
    document.getElementById('ring-fill').style.strokeDashoffset = offset;
  }, 300);

  // Per-subtest status cards
  const rincianEl = $('#hasil-rincian');
  rincianEl.innerHTML = '';
  subtestResults.forEach(({ st, benar, salah, kosong, nilai }) => {
    const card = document.createElement('div');
    card.className = 'rincian-card';
    card.innerHTML = `
      <div class="rincian-nama">${st.nama}</div>
      <div class="rincian-stats">
        <span class="rs-benar">✔ ${benar} benar</span>
        <span class="rs-salah">✘ ${salah} salah</span>
        <span class="rs-kosong">— ${kosong} kosong</span>
      </div>
      <div class="rincian-skor">
        <span class="rincian-skor-val">${formatScore(nilai)}</span>
        <span class="rincian-skor-max">/ 1000</span>
      </div>
    `;
    rincianEl.appendChild(card);
  });

  // Detail per soal
  const detailEl = $('#detail-pembahasan');
  detailEl.innerHTML = '';
  subtestResults.forEach(({ st, stIdx }) => {
    const section = document.createElement('div');
    section.className = 'detail-subtest';
    const titleEl = document.createElement('div');
    titleEl.className = 'detail-subtest-title';
    titleEl.textContent = st.nama;
    section.appendChild(titleEl);

    st.soal.forEach((soal, i) => {
      const userAns = state.answers[stIdx][i].jawaban;
      const isEmpty = userAns === null || userAns === '';
      let isCorrect = false;
      if (!isEmpty) {
        isCorrect = soal.tipe === 'isian_singkat'
          ? stripSpaces(userAns) === stripSpaces(soal.jawaban)
          : userAns === soal.jawaban;
      }

      const item = document.createElement('div');
      const statusClass = isEmpty ? 'kosong' : (isCorrect ? 'benar' : 'salah');
      item.className = `detail-soal-item ${statusClass}`;

      const icon = isEmpty ? '—' : (isCorrect ? '✔' : '✘');
      const iconColor = isEmpty ? '#64748b' : (isCorrect ? '#4ade80' : '#f87171');

      let userDisplay = isEmpty ? '<em style="color:var(--gray-500)">tidak dijawab</em>' : userAns;
      let correctDisplay = soal.jawaban;

      // For PG, show letter + text
      if (soal.tipe === 'pilihan_ganda') {
        if (!isEmpty) userDisplay = `${userAns}: ${soal.opsi[userAns] || '?'}`;
        correctDisplay = `${soal.jawaban}: ${soal.opsi[soal.jawaban] || '?'}`;
      }

      const skorDapat = isCorrect ? `+${soal.bobot}` : (isEmpty ? '0' : '0');

      item.innerHTML = `
        <span class="detail-icon" style="color:${iconColor}">${icon}</span>
        <div>
          <span class="detail-num">No. ${i + 1} · Bobot ${soal.bobot}</span>
          <div class="detail-pertanyaan">${truncate(soal.pertanyaan, 120)}</div>
        </div>
        <div class="detail-jawaban">
          <div class="dj-kamu">Jawaban: ${userDisplay}</div>
          <div class="dj-benar">Kunci: ${correctDisplay}</div>
          <div class="dj-bobot">Skor: ${skorDapat}</div>
        </div>
      `;
      section.appendChild(item);
    });

    detailEl.appendChild(section);
  });

  showPage('page-hasil');
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.substring(0, max) + '…';
}

/* ─── REVIEW MODE ───────────────────────────────────────── */
function reviewQuestion(subtestIdx, soalIdx) {
  showPage('page-ujian');

  clearInterval(state.timerInterval);

  state.currentSubtestIdx = subtestIdx;
  state.currentSoalIdx = soalIdx;

  const st = state.data.subtests[subtestIdx];

  $('#subtest-label').textContent = `${st.nama} (Review)`;
  $('#subtest-progress').textContent = `Review`;

  $('#timer-display').textContent = '--:--';

  renderSoal(soalIdx);

  // disable answer editing
  const opsiItems = $$('.opsi-item');
  opsiItems.forEach(item => {
    item.style.pointerEvents = 'none';
  });

  const input = $('.isian-input');
  if (input) {
    input.disabled = true;
  }

  $('#btn-selesai-subtes').onclick = () => {
    showResults();
  };
}

/* ─── RESTART TRYOUT ────────────────────────────────────── */
function restartExam() {
  clearInterval(state.timerInterval);

  state.currentSubtestIdx = 0;
  state.currentSoalIdx = 0;

  state.answers = state.data.subtests.map(st =>
    st.soal.map(() => ({
      jawaban: null,
      ragu: false
    }))
  );

  showPage('page-start');
}

/* ─── EXPORT RESULT ─────────────────────────────────────── */
function exportResult() {
  const subtests = state.data.subtests;

  let text = '';
  text += 'HASIL TRYOUT UTBK\n';
  text += '============================\n\n';

  let totalAverage = 0;
  subtests.forEach((st, stIdx) => {
    let benar = 0, salah = 0, kosong = 0;

    st.soal.forEach((soal, i) => {
      const userAns = state.answers[stIdx][i].jawaban;

      if (userAns === null || userAns === '') {
        kosong++;
      } else {
        const correct =
          soal.tipe === 'isian_singkat'
            ? stripSpaces(userAns) === stripSpaces(soal.jawaban)
            : userAns === soal.jawaban;

        if (correct) {
          benar++;
        } else {
          salah++;
        }
      }
    });

    const nilai = convertScore(st.id, benar);
    totalAverage += nilai;

    text += `${st.nama}\n`;
    text += `Benar: ${benar}\n`;
    text += `Salah: ${salah}\n`;
    text += `Kosong: ${kosong}\n`;
    text += `Nilai: ${formatScore(nilai)} / 1000\n`;
    text += '\n';
  });

  text += '============================\n';
  text += `NILAI AKHIR : ${formatScore(totalAverage / subtests.length)} / 1000\n`;
  text += `PERSENTASE : ${Math.round((totalAverage / subtests.length / 1000) * 100)}%\n`;

  const blob = new Blob([text], {
    type: 'text/plain'
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'hasil-tryout.txt';
  a.click();

  URL.revokeObjectURL(url);
}

/* ─── RESULT BUTTONS ────────────────────────────────────── */
document.addEventListener('click', (e) => {

  if (e.target.id === 'btn-ulangi') {
    restartExam();
  }

  if (e.target.id === 'btn-export') {
    exportResult();
  }

});
