// main.js - frontend that integrates with Flask backend
const gridEl = document.getElementById('grid');
const ordersListEl = document.getElementById('ordersList');
const statusBox = document.getElementById('statusBox');
const createOrderBtn = document.getElementById('createOrder');
const resetBtn = document.getElementById('resetBtn');
const pickupInput = document.getElementById('pickup');
const deliveryInput = document.getElementById('delivery');

let GRID = []; // fetched from /api/grid
const ROWS = 9; const COLS = 9;
let agv = {r:8, c:0, element:null, busy:false};

async function fetchGrid(){
  const res = await fetch('/api/grid');
  GRID = await res.json();
}

function renderGrid(){
  gridEl.innerHTML = '';
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const val = GRID[r][c];
      const cell = document.createElement('div');
      cell.className = 'cell';
      if(val === 1) cell.classList.add('obstacle');
      else if(val === 2) cell.classList.add('pickup');
      else if(val === 3) cell.classList.add('delivery');
      else cell.classList.add('free');
      cell.dataset.r = r; cell.dataset.c = c;
      cell.textContent = `${r},${c}`;
      gridEl.appendChild(cell);
      cell.addEventListener('click', ()=>{
        if(!pickupInput.value) pickupInput.value = `${r},${c}`;
        else if(!deliveryInput.value) deliveryInput.value = `${r},${c}`;
      });
    }
  }
  if(!agv.element){
    const el = document.createElement('div'); el.className = 'agv'; el.textContent='A';
    agv.element = el; gridEl.appendChild(el);
  }
  placeAgvAt(agv.r, agv.c);
}

function placeAgvAt(r,c){
  const index = r * COLS + c;
  const cellNode = gridEl.children[index];
  if(!cellNode) return;
  const cellRect = cellNode.getBoundingClientRect();
  const gridRect = gridEl.getBoundingClientRect();
  const left = cellRect.left - gridRect.left + cellRect.width/2;
  const top = cellRect.top - gridRect.top + cellRect.height/2;
  agv.element.style.left = left + 'px';
  agv.element.style.top = top + 'px';
}

window.addEventListener('resize', ()=>placeAgvAt(agv.r, agv.c));

function parseInputCoord(str){
  const parts = str.split(',').map(s=>s.trim());
  if(parts.length !== 2) return null;
  const r = parseInt(parts[0],10), c = parseInt(parts[1],10);
  if(Number.isNaN(r) || Number.isNaN(c)) return null;
  if(r<0 || r>=ROWS || c<0 || c>=COLS) return null;
  return {r,c};
}

async function createOrderFromInputs(){
  const p = parseInputCoord(pickupInput.value || '');
  const d = parseInputCoord(deliveryInput.value || '');
  if(!p || !d){ alert('Enter valid coords like 3,2'); return; }
  logStatus('Requesting plan to pickup...');
  const planRes = await fetch('/api/plan', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({start:[agv.r,agv.c], goal:[p.r,p.c]})
  });
  const planJson = await planRes.json();
  if(!planJson.path || planJson.path.length===0){ logStatus('No path to pickup'); return; }
  const planRes2 = await fetch('/api/plan', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({start:[p.r,p.c], goal:[d.r,d.c]})
  });
  const planJson2 = await planRes2.json();
  if(!planJson2.path || planJson2.path.length===0){ logStatus('No path to delivery'); return; }

  const createRes = await fetch('/api/orders', {
    method: 'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({pickup:[p.r,p.c], delivery:[d.r,d.c]})
  });
  const createJson = await createRes.json();
  logStatus(`Order created (id: ${createJson.order_id || '?'})`);

  await animatePath(planJson.path);
  logStatus('Reached pickup. Simulating pickup (1s)');
  await sleep(1000);
  await animatePath(planJson2.path);
  logStatus('Reached delivery. Marking order complete (frontend)');

  if(createJson.order_id){
    await fetch('/api/execute', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({path: planJson2.path, order_id: createJson.order_id})
    });
  }

  await refreshOrders();
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function animatePath(path){
  for(let i=1;i<path.length;i++){
    const node = path[i];
    agv.r = node[0]; agv.c = node[1];
    placeAgvAt(agv.r, agv.c);
    await sleep(250);
  }
}

function logStatus(msg){
  const t = new Date().toLocaleTimeString();
  statusBox.textContent = `[${t}] ${msg}\n` + statusBox.textContent;
}

async function refreshOrders(){
  const res = await fetch('/api/orders');
  const rows = await res.json();
  ordersListEl.innerHTML = '';
  rows.forEach(r=>{
    const li = document.createElement('li');
    li.className = 'order-item';
    li.innerHTML = `<strong>#${r.id}</strong> Pickup:${r.pickup_r},${r.pickup_c} → Delivery:${r.delivery_r},${r.delivery_c} <br>Status: ${r.status}`;
    ordersListEl.appendChild(li);
  });
}

createOrderBtn.addEventListener('click', createOrderFromInputs);
resetBtn.addEventListener('click', async ()=>{
  agv.r = 8; agv.c = 0; placeAgvAt(agv.r,agv.c); await refreshOrders(); logStatus('Reset AGV position');
});

(async function init(){
  await fetchGrid();
  renderGrid();
  await refreshOrders();
  logStatus('Ready — create order using inputs or click cells');
})();
