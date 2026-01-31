// =====================================
// ERP DASHBOARD CONTROLLER
// =====================================

const REFRESH_INTERVAL = 3000;

// On page load
window.onload = () => {
    loadAll();
    setInterval(loadAll, REFRESH_INTERVAL);
};

// Load all KPIs
function loadAll() {
    loadInventoryKPI();
    loadOrderCount();
    loadAgvStatus();
}

// =====================================
// INVENTORY KPI
// =====================================
async function loadInventoryKPI() {
    const el = document.getElementById("inventoryCount");

    try {
        const res = await fetch("/api/inventory");
        const data = await res.json();

        const totalQty = data.reduce(
            (sum, item) => sum + Number(item.quantity),
            0
        );

        el.innerText = `${totalQty} Units`;
        el.className = "kpi-value success";

    } catch {
        el.innerText = "Unavailable";
        el.className = "kpi-value error";
    }
}

// =====================================
// ORDERS KPI
// =====================================
async function loadOrderCount() {
    const el = document.getElementById("kpiOrders");

    try {
        const res = await fetch("/api/orders");
        const data = await res.json();

        const active = data.filter(
            o => o.status !== "completed" && o.status !== "failed"
        ).length;

        el.innerText = `${active} Active Orders`;

    } catch {
        el.innerText = "Unavailable";
    }
}

// =====================================
// AGV STATUS KPI
// =====================================
async function loadAgvStatus() {
    const el = document.getElementById("kpiAgv");

    try {
        const res = await fetch("/api/agv");
        const data = await res.json();

        el.innerText = data.status.toUpperCase();

    } catch {
        el.innerText = "Unavailable";
    }
}

// =====================================
// INVENTORY TABLE
// =====================================
async function loadInventoryTable() {
    const tbody = document.getElementById("inventoryTable");

    try {
        const res = await fetch("/api/inventory");
        const data = await res.json();

        tbody.innerHTML = "";

        if (data.length === 0) {
            tbody.innerHTML =
                `<tr><td colspan="6">No inventory available</td></tr>`;
            return;
        }

        data.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.id}</td>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>${item.zone}</td>
                <td>${item.rack}</td>
                <td>(${item.row_loc}, ${item.col_loc})</td>
            `;
            tbody.appendChild(row);
        });

    } catch {
        tbody.innerHTML =
            `<tr><td colspan="6">Failed to load inventory</td></tr>`;
    }
}

// =====================================
// SECTION SWITCHER
// =====================================
function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(sec =>
        sec.classList.add("hidden")
    );

    document.getElementById(sectionId).classList.remove("hidden");

    if (sectionId === "orders") {
        loadOrdersTable();
    }
}

// =====================================
// CREATE ORDER
// =====================================
async function createOrderERP() {
    const pr = document.getElementById("pickupRow").value;
    const pc = document.getElementById("pickupCol").value;
    const dr = document.getElementById("deliveryRow").value;
    const dc = document.getElementById("deliveryCol").value;

    const msg = document.getElementById("orderMsg");

    if (pr === "" || pc === "" || dr === "" || dc === "") {
        msg.innerText = "❌ Please fill all fields";
        msg.style.color = "red";
        return;
    }

    try {
        const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pickup: [Number(pr), Number(pc)],
                delivery: [Number(dr), Number(dc)]
            })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        msg.innerText = `✅ Order Created (ID: ${data.order_id})`;
        msg.style.color = "green";

        // Clear form
        ["pickupRow","pickupCol","deliveryRow","deliveryCol"]
            .forEach(id => document.getElementById(id).value = "");

    } catch (err) {
        msg.innerText = "❌ Failed to create order";
        msg.style.color = "red";
        console.error(err);
    }
}

// =====================================
// LOAD ORDERS TABLE
// =====================================
async function loadOrdersTable() {
    const tbody = document.getElementById("ordersTable");

    try {
        const res = await fetch("/api/orders");
        const orders = await res.json();

        tbody.innerHTML = "";

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">No orders</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const tr = document.createElement("tr");

            const canExecute = order.status === "pending";

            tr.innerHTML = `
                <td>${order.id}</td>
                <td>(${order.pickup_r}, ${order.pickup_c})</td>
                <td>(${order.delivery_r}, ${order.delivery_c})</td>
                <td>${order.status}</td>
                <td>
                    ${
                        canExecute
                        ? `<button onclick="executeOrder(${order.id})">▶ Execute</button>`
                        : "—"
                    }
                </td>
            `;

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5">Error loading orders</td></tr>`;
    }
}

// =====================================
// EXECUTE ORDER
// =====================================
async function executeOrder(orderId) {
    if (!confirm("Execute this order?")) return;

    try {
        const res = await fetch(`/api/execute-order/${orderId}`, {
            method: "POST"
        });

        const result = await res.json();

        if (!res.ok) throw new Error(result.error);

        alert(result.message);

        loadOrdersTable();
        loadAgvStatus();

    } catch (err) {
        alert("Execution failed");
        console.error(err);
    }
}
