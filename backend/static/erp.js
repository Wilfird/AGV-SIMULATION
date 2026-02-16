// =====================================
// ERP DASHBOARD CONTROLLER
// =====================================

const REFRESH_INTERVAL = 3000;

// On page load
window.onload = () => {
    loadAll();
    loadWMSProducts();
    loadOrdersTable();
    setInterval(refreshLiveData, REFRESH_INTERVAL);
};

// Only refresh dynamic things
function refreshLiveData() {
    loadAll();
    loadOrdersTable();
}

// =====================================
// LOAD ALL KPIs
// =====================================
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
            o => o.status !== "COMPLETED" && o.status !== "FAILED"
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
// SECTION SWITCHER
// =====================================
function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(sec =>
        sec.classList.add("hidden")
    );

    document.getElementById(sectionId).classList.remove("hidden");

    if (sectionId === "orders") {
        loadOrdersTable();
        loadWMSProducts();
    }
}

// =====================================
// LOAD WMS PRODUCTS
// =====================================
async function loadWMSProducts() {
    const select = document.getElementById("pickupSelect");
    const info = document.getElementById("productInfo");

    if (!select) return;

    try {
        const res = await fetch("/api/inventory");
        const products = await res.json();

        select.innerHTML = "";

        const available = products.filter(p => p.quantity > 0);

        if (available.length === 0) {
            select.innerHTML = `<option value="">No stock available</option>`;
            info.innerHTML = "<p>No available inventory</p>";
            return;
        }

        available.forEach(p => {
            const option = document.createElement("option");

            option.value = JSON.stringify({
                row: p.row_loc,
                col: p.col_loc,
                qty: p.quantity,
                rack: p.rack,
                zone: p.zone,
                name: p.product_name
            });

            option.textContent =
                `${p.product_name} | Qty: ${p.quantity} | Zone ${p.zone} Rack ${p.rack}`;

            select.appendChild(option);
        });

        showSelectedProductInfo();

    } catch (err) {
        console.error("Inventory load error:", err);
    }
}

// =====================================
// SHOW PRODUCT DETAILS
// =====================================
function showSelectedProductInfo() {

    const select = document.getElementById("pickupSelect");
    const info = document.getElementById("productInfo");

    if (!select || !select.value) {
        info.innerHTML = "";
        return;
    }

    const data = JSON.parse(select.value);

    info.innerHTML = `
        <p><b>Product:</b> ${data.name}</p>
        <p><b>Available:</b> ${data.qty}</p>
        <p><b>Rack:</b> Zone ${data.zone} - Rack ${data.rack}</p>
        <p><b>Grid Location:</b> (${data.row}, ${data.col})</p>
    `;
}

// Auto update product info
document.addEventListener("change", function(e){
    if (e.target.id === "pickupSelect") {
        showSelectedProductInfo();
    }
});

// =====================================
// CREATE ORDER
// =====================================
async function createOrderERP() {

    const select = document.getElementById("pickupSelect");
    const msg = document.getElementById("orderMsg");

    if (!select || !select.value) {
        msg.innerText = "❌ No product selected";
        msg.style.color = "red";
        return;
    }

    const pickupData = JSON.parse(select.value);

    const dr = document.getElementById("deliveryRow").value;
    const dc = document.getElementById("deliveryCol").value;

    if (!dr || !dc) {
        msg.innerText = "❌ Enter delivery location";
        msg.style.color = "red";
        return;
    }

    try {
        const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pickup: [pickupData.row, pickupData.col],
                delivery: [Number(dr), Number(dc)]
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        msg.innerText = `✅ Order Created (ID: ${data.order_id})`;
        msg.style.color = "green";

        document.getElementById("deliveryRow").value = "";
        document.getElementById("deliveryCol").value = "";

        loadOrdersTable();
        loadWMSProducts();

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

        if (!orders || orders.length === 0) {
            tbody.innerHTML =
                `<tr><td colspan="5">No orders available</td></tr>`;
            return;
        }

        orders.forEach(order => {

            const canExecute = order.status === "CREATED";

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${order.id}</td>
                <td>(${order.pickup_row || order.pickup_r}, ${order.pickup_col || order.pickup_c})</td>
                <td>(${order.delivery_row || order.delivery_r}, ${order.delivery_col || order.delivery_c})</td>
                <td>${order.status}</td>
                <td>
                    ${
                        order.status === "CREATED"
                        ? `<button onclick="executeOrder(${order.id})">▶ Execute</button>`
                        : "—"
                    }
                </td>
            `;

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Order load error:", err);
        tbody.innerHTML =
            `<tr><td colspan="5">Error loading orders</td></tr>`;
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
