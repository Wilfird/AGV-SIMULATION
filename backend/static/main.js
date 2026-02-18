// main.js - WAREHOUSE AGV PROFESSIONAL VERSION

const gridEl = document.getElementById('grid');
const ordersListEl = document.getElementById('ordersList');
const statusBox = document.getElementById('statusBox');
const createOrderBtn = document.getElementById('createOrder');
const resetBtn = document.getElementById('resetBtn');
const pickupInput = document.getElementById('pickup');
const deliveryInput = document.getElementById('delivery');

let GRID = [];
const ROWS = 9;
const COLS = 9;

// Define warehouse zones
const WMS_ZONE = { startCol: 0, endCol: 2 };      // Rack area
const DELIVERY_ZONE = { startCol: 6, endCol: 8 }; // Delivery area

let agv = { r: 8, c: 0, element: null, status: "IDLE" };

// --------------------------------------------------
// FETCH GRID
// --------------------------------------------------
async function fetchGrid() {
  const res = await fetch('/api/grid');
  GRID = await res.json();
}

// --------------------------------------------------
// RENDER GRID
// --------------------------------------------------
function renderGrid() {
  gridEl.innerHTML = '';

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {

      const cell = document.createElement('div');
      cell.className = 'cell free';

      // Warehouse rack zone
      if (c >= WMS_ZONE.startCol && c <= WMS_ZONE.endCol && r <= 6) {
        cell.classList.add('pickup'); // green racks
      }

      // Delivery zone
      if (c >= DELIVERY_ZONE.startCol && r >= 6) {
        cell.classList.add('delivery');
      }

      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.textContent = `${r},${c}`;

      gridEl.appendChild(cell);

      // Auto fill pickup/delivery inputs
      cell.addEventListener('click', () => {
        if (!pickupInput.value) pickupInput.value = `${r},${c}`;
        else if (!deliveryInput.value) deliveryInput.value = `${r},${c}`;
      });
    }
  }

  if (!agv.element) {
    const el = document.createElement('div');
    el.className = 'agv';
    el.textContent = 'A';
    agv.element = el;
    gridEl.appendChild(el);
  }

  placeAgvAt(agv.r, agv.c);
}

// --------------------------------------------------
// PLACE AGV
// --------------------------------------------------
function placeAgvAt(r, c) {
  const index = r * COLS + c;
  const cellNode = gridEl.children[index];
  if (!cellNode) return;

  const cellRect = cellNode.getBoundingClientRect();
  const gridRect = gridEl.getBoundingClientRect();

  const left = cellRect.left - gridRect.left + cellRect.width / 2;
  const top = cellRect.top - gridRect.top + cellRect.height / 2;

  agv.element.style.left = left + 'px';
  agv.element.style.top = top + 'px';
}

window.addEventListener('resize', () => placeAgvAt(agv.r, agv.c));

// --------------------------------------------------
// CREATE ORDER
// --------------------------------------------------
createOrderBtn.addEventListener('click', createOrderFromInputs);

async function createOrderFromInputs() {

  const p = parseInputCoord(pickupInput.value || '');
  const d = parseInputCoord(deliveryInput.value || '');

  if (!p || !d) {
    alert('Enter valid coords like 3,2');
    return;
  }

  const createRes = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pickup: [p.r, p.c],
      delivery: [d.r, d.c]
    })
  });

  const createJson = await createRes.json();

  logStatus(`Order #${createJson.order_id} created`);
  pickupInput.value = '';
  deliveryInput.value = '';
  await refreshOrders();
}

// --------------------------------------------------
// EXECUTE ORDER
// --------------------------------------------------
window.executeOrder = async function(orderId) {

  logStatus(`Sending Order #${orderId} to AGV`);
  updateAgvStatus("MOVING TO PICKUP");

  const res = await fetch(`/api/execute-order/${orderId}`, {
    method: 'POST'
  });

  const data = await res.json();

  if (data.error) {
    logStatus(`Error: ${data.error}`);
    updateAgvStatus("IDLE");
  } else {
    logStatus(`Order #${orderId} executing`);
  }

  await refreshOrders();
}

// --------------------------------------------------
// POLL AGV
// --------------------------------------------------
async function pollAgv() {
  const res = await fetch('/api/agv');
  const data = await res.json();

  // Update position
  if (data.r !== agv.r || data.c !== agv.c) {
    agv.r = data.r;
    agv.c = data.c;
    placeAgvAt(agv.r, agv.c);
  }

  // Update status ONLY if changed
  if (data.status && data.status !== agv.status) {
    agv.status = data.status;
    showAgvStatus(data.status);
  }
}

// --------------------------------------------------
// PARSE COORD
// --------------------------------------------------
function parseInputCoord(str) {
  const parts = str.split(',').map(s => s.trim());
  if (parts.length !== 2) return null;

  const r = parseInt(parts[0], 10);
  const c = parseInt(parts[1], 10);

  if (Number.isNaN(r) || Number.isNaN(c)) return null;
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;

  return { r, c };
}

// --------------------------------------------------
// REFRESH ORDERS
// --------------------------------------------------
async function refreshOrders() {
  const res = await fetch('/api/orders');
  const rows = await res.json();

  ordersListEl.innerHTML = '';

  rows.forEach(r => {
    const li = document.createElement('li');
    li.className = 'order-item';

    li.innerHTML = `
      <strong>Order #${r.id}</strong><br>
      From: ${r.pickup_r},${r.pickup_c}
      → To: ${r.delivery_r},${r.delivery_c}<br>
      Status: <b>${r.status.toUpperCase()}</b><br>
      ${r.status === 'pending'
        ? `<button onclick="executeOrder(${r.id})">▶ Execute</button>`
        : ''}
    `;

    ordersListEl.appendChild(li);
  });
}

// --------------------------------------------------
// STATUS
// --------------------------------------------------
function logStatus(msg) {
  const t = new Date().toLocaleTimeString();
  statusBox.textContent = `[${t}] ${msg}\n` + statusBox.textContent;
}

function showAgvStatus(status) {
  document.getElementById("statusBox").textContent =
    `AGV STATUS: ${status}`;
}

// --------------------------------------------------
// RESET
// --------------------------------------------------
resetBtn.addEventListener('click', () => {
  agv.r = 8;
  agv.c = 0;
  placeAgvAt(agv.r, agv.c);
  updateAgvStatus("IDLE");
  logStatus('AGV reset to parking position');
});

// --------------------------------------------------
// INIT
// --------------------------------------------------
(async function init() {
  await fetchGrid();
  renderGrid();
  await refreshOrders();
  showAgvStatus("IDLE");
  logStatus('Warehouse AGV system ready');
})();
