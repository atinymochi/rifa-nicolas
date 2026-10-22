import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBlS7m6Wqt1BHwcILHPyF7CvDos9fgHo5A",
  authDomain: "rifa-nicolas.firebaseapp.com",
  databaseURL: "https://rifa-nicolas-default-rtdb.firebaseio.com",
  projectId: "rifa-nicolas",
  storageBucket: "rifa-nicolas.firebasestorage.app",
  messagingSenderId: "1016349889714",
  appId: "1:1016349889714:web:015dc688aabf340c4f25ab"
};

const PASS = "2908";
let isAdmin = false;
let sold = {};
let pendingNum = null;

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const rifaRef = ref(db, "rifa/sold");

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

function getItemData(item) {
  if (!item) return null;
  if (typeof item === "string") {
    return { name: item, status: "paid" };
  }
  return item;
}

function updateStats() {
  const count = Object.keys(sold).filter(k => {
    if (k.trim() === "" || isNaN(k)) return false;
    const num = Number(k);
    return num >= 1 && num <= 300 && sold[k];
  }).length;
  
  document.getElementById("stat-sold").textContent = count;
  document.getElementById("stat-avail").textContent = 300 - count;
}

function renderGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  for (let i = 1; i <= 300; i++) {
    const el = document.createElement("div");
    const item = getItemData(sold[i]);
    
    let classNames = "num";
    if (item) {
      classNames += item.status === "pending" ? " pending" : " paid";
    }
    if (isAdmin) {
      classNames += " admin-mode";
    }

    el.className = classNames;
    el.textContent = i;

    if (item) {
      const stateTag = item.status === "pending" ? "(Pendiente)" : "(Pagado)";
      el.setAttribute("data-owner", `${item.name} ${stateTag}`);
    }

    el.addEventListener("click", () => handleClick(i));
    grid.appendChild(el);
  }
  updateStats();
}

function handleClick(n) {
  if (!isAdmin) return;
  pendingNum = n;
  const item = getItemData(sold[n]);

  if (item) {
    document.getElementById("release-num").textContent = n;
    document.getElementById("release-owner").textContent = item.name;
    
    const isPending = item.status === "pending";
    document.getElementById("release-status-text").textContent = isPending ? "Pendiente" : "Pagado";
    
    const btnToggle = document.getElementById("btn-toggle-status");
    btnToggle.textContent = isPending ? "Marcar como Pagado" : "Marcar como Pendiente";
    btnToggle.className = `btn ${isPending ? 'success' : 'warning'}`;

    document.getElementById("modal-release").classList.add("open");
  } else {
    document.getElementById("modal-num").textContent = n;
    document.getElementById("modal-name").value = "";
    document.getElementById("modal-status").value = "paid";
    document.getElementById("modal-sell").classList.add("open");
    setTimeout(() => document.getElementById("modal-name").focus(), 100);
  }
}

function closeModal() {
  document.getElementById("modal-sell").classList.remove("open");
  document.getElementById("modal-release").classList.remove("open");
  pendingNum = null;
}

async function confirmSell() {
  const name = document.getElementById("modal-name").value.trim();
  const status = document.getElementById("modal-status").value;
  if (!name) { document.getElementById("modal-name").focus(); return; }
  
  sold[pendingNum] = { name, status };
  closeModal();
  showToast(`Número ${pendingNum} → ${name}`);
  updateStats();
  renderGrid();
  await set(rifaRef, sold);
}

async function toggleStatus() {
  const item = getItemData(sold[pendingNum]);
  if (!item) return;

  item.status = item.status === "pending" ? "paid" : "pending";
  sold[pendingNum] = item;

  closeModal();
  showToast(`Número ${pendingNum} marcado como ${item.status === 'pending' ? 'Pendiente' : 'Pagado'}`);
  updateStats();
  renderGrid();
  await set(rifaRef, sold);
}

async function confirmRelease() {
  const n = pendingNum;
  delete sold[n];
  closeModal();
  showToast(`Número ${n} liberado`);
  updateStats();
  renderGrid();
  await set(rifaRef, sold);
}

function tryLogin() {
  const val = document.getElementById("pwd").value;
  if (val === PASS) {
    isAdmin = true;
    document.getElementById("login-section").style.display = "none";
    document.getElementById("admin-section").style.display = "block";
    renderGrid();
    showToast("✓ Acceso concedido");
  } else {
    showToast("Clave incorrecta");
    document.getElementById("pwd").value = "";
  }
}

function toggleLogin() {
  if (isAdmin) return;
  const s = document.getElementById("login-section");
  s.style.display = s.style.display === "none" ? "block" : "none";
  if (s.style.display === "block") setTimeout(() => document.getElementById("pwd").focus(), 100);
}

// Event Listeners
document.getElementById("admin-trigger").addEventListener("click", toggleLogin);
document.getElementById("btn-login").addEventListener("click", tryLogin);

document.getElementById("pwd").addEventListener("keydown", e => {
  if (e.key === "Enter") tryLogin();
});

document.getElementById("btn-confirm-sell").addEventListener("click", confirmSell);
document.getElementById("btn-toggle-status").addEventListener("click", toggleStatus);
document.getElementById("btn-confirm-release").addEventListener("click", confirmRelease);

document.querySelectorAll(".btn-close-modal").forEach(btn => {
  btn.addEventListener("click", closeModal);
});

document.getElementById("modal-sell").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

document.getElementById("modal-release").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

document.getElementById("modal-name").addEventListener("keydown", e => {
  if (e.key === "Enter") confirmSell();
  if (e.key === "Escape") closeModal();
});

// Firebase Listener
onValue(rifaRef, snapshot => {
  const data = snapshot.val();
  sold = data && typeof data === "object" ? data : {};
  renderGrid();
});