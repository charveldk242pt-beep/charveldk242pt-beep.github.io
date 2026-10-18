/* =========================================================
   動きの仕組み（通常は編集不要です）
   作品や自己紹介の内容は、CMS（Pages CMS）か
   content フォルダの JSON ファイルで編集します。
   ========================================================= */

const grid = document.getElementById("grid");
const filters = document.getElementById("filters");
const modal = document.getElementById("modal");

let WORKS = [];
let currentIndex = 0;
let visibleIndexes = [];

// CMS から入力された文字を安全に表示するための変換
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

// 画像パスの先頭の「/」を外す（GitHub Pages のサブフォルダでも表示されるように）
function src(path) {
  return escapeHTML(String(path || "").replace(/^\/+/, ""));
}

function imagesOf(work) {
  const list = Array.isArray(work.images) ? work.images : work.images ? [work.images] : [];
  return list.length ? list : [work.thumbnail];
}

/* ---------- サイト情報（名前・自己紹介・連絡先） ---------- */
function renderSite(site) {
  const name = site.name || "";
  document.title = name ? `${name} — Portfolio` : "Portfolio";
  document.getElementById("site-logo").textContent = name.toUpperCase();
  document.getElementById("site-name").textContent = name;
  document.getElementById("site-title").textContent = site.title || "";
  document.getElementById("site-about").textContent = site.about || "";
  document.getElementById("site-skills").textContent = site.skills || "";
  document.getElementById("footer-name").textContent = name;

  const mail = document.getElementById("site-email");
  mail.textContent = site.email || "";
  mail.href = `mailto:${site.email || ""}`;
}

/* ---------- 作品タイルを並べる ---------- */
function renderGrid() {
  grid.innerHTML = WORKS.map(
    (work, i) => `
      <li class="tile" data-category="${escapeHTML(work.category)}">
        <button type="button" data-index="${i}" aria-label="${escapeHTML(work.title)}の詳細を見る">
          <img src="${src(work.thumbnail || imagesOf(work)[0])}" alt="${escapeHTML(work.title)}" loading="lazy">
          <span class="tile-caption">
            <strong>${escapeHTML(work.title)}</strong>
            <span>${escapeHTML(work.category)} — ${escapeHTML(work.year)}</span>
          </span>
        </button>
      </li>`
  ).join("");
  visibleIndexes = WORKS.map((_, i) => i);
}

/* ---------- 分類の絞り込みボタン ---------- */
function renderFilters() {
  const categories = ["All", ...new Set(WORKS.map((w) => w.category).filter(Boolean))];
  filters.innerHTML = categories
    .map(
      (c, i) =>
        `<button type="button" data-filter="${escapeHTML(c)}" class="${i === 0 ? "is-active" : ""}">${escapeHTML(c)}</button>`
    )
    .join("");
}

filters.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const selected = btn.dataset.filter;

  filters.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));

  visibleIndexes = [];
  grid.querySelectorAll(".tile").forEach((tile, i) => {
    const show = selected === "All" || tile.dataset.category === selected;
    tile.classList.toggle("is-hidden", !show);
    if (show) visibleIndexes.push(i);
  });
});

/* ---------- 詳細ウィンドウ ---------- */
function showWork(index) {
  const work = WORKS[index];
  currentIndex = index;

  document.getElementById("modal-meta").textContent = `${work.category || ""} — ${work.year || ""}`;
  document.getElementById("modal-title").textContent = work.title || "";
  document.getElementById("modal-desc").textContent = work.description || "";

  document.getElementById("modal-media").innerHTML = imagesOf(work)
    .map((path) => `<img src="${src(path)}" alt="${escapeHTML(work.title)}">`)
    .join("");

  document.getElementById("modal-details").innerHTML = (work.details || [])
    .filter((d) => d && d.label)
    .map((d) => `<div><dt>${escapeHTML(d.label)}</dt><dd>${escapeHTML(d.value)}</dd></div>`)
    .join("");

  modal.scrollTop = 0;
}

function openModal(index) {
  showWork(index);
  modal.showModal();
  document.body.classList.add("is-locked");
}

function closeModal() {
  modal.close();
}

function step(direction) {
  const pos = visibleIndexes.indexOf(currentIndex);
  const next = (pos + direction + visibleIndexes.length) % visibleIndexes.length;
  showWork(visibleIndexes[next]);
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-index]");
  if (btn) openModal(Number(btn.dataset.index));
});

document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal-prev").addEventListener("click", () => step(-1));
document.getElementById("modal-next").addEventListener("click", () => step(1));

// Escキーで閉じたときも含め、閉じたらスクロールを元に戻す
modal.addEventListener("close", () => document.body.classList.remove("is-locked"));

// キーボードの ← → で前後の作品へ
document.addEventListener("keydown", (e) => {
  if (!modal.open) return;
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});

/* ---------- 起動：content フォルダのデータを読み込む ---------- */
async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} を読み込めませんでした`);
  return res.json();
}

async function init() {
  document.getElementById("year").textContent = new Date().getFullYear();
  try {
    const [site, works] = await Promise.all([
      loadJSON("content/site.json"),
      loadJSON("content/works.json"),
    ]);
    WORKS = Array.isArray(works) ? works : [];
    renderSite(site);
    renderFilters();
    renderGrid();
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<li class="load-error">作品データを読み込めませんでした。</li>`;
  }
}

init();
