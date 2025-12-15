// =====================================
// ERP DASHBOARD CONTROLLER
// =====================================

// Auto refresh interval (ms)
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
    loadInventoryTable(); 
}

// =====================================
// INVENTORY (WMS KPI)
// =====================================
async function loadInventoryKPI() {
    const el = document.getElementById("inventoryCount");

    try {
        const res = await fetch("/api/inventory");
        if (!res.ok) throw new Error("Inventory API error");

        const data = await res.json();

        // Total SKUs
        const totalProducts = data.length;

        // Total quantity
        const totalQuantity = data.reduce(
            (sum, item) => sum + Number(item.quantity),
            0
        );

        el.innerText = `${totalQuantity} Units`;
        el.className = "kpi-value success";

    } catch (err) {
        console.error("Inventory error:", err);
        el.innerText = "Unavailable";
        el.className = "kpi-value error";
    }
}

// =====================================
// ORDERS KPI
// =====================================
async function loadOrderCount() {
    const el = document.getElementById("orderCount");

    try {
        const res = await fetch("/api/orders");
        if (!res.ok) throw new Error("Orders API error");

        const data = await res.json();

        const active = data.filter(o => o.status !== "completed").length;
        el.innerText = `${active} Active Orders`;
        el.className = "kpi-value warning";

    } catch (err) {
        console.error("Order error:", err);
        el.innerText = "Unavailable";
        el.className = "kpi-value error";
    }
}

// =====================================
// AGV STATUS KPI
// =====================================
async function loadAgvStatus() {
    const el = document.getElementById("agvStatus");

    try {
        const res = await fetch("/api/agv");
        if (!res.ok) throw new Error("AGV API error");

        const data = await res.json();
        el.innerText = data.status.toUpperCase();

        el.className =
            data.status === "moving"
                ? "kpi-value moving"
                : "kpi-value idle";

    } catch (err) {
        console.error("AGV error:", err);
        el.innerText = "Unavailable";
        el.className = "kpi-value error";
    }
}


// // =====================================
// // INVENTORY TABLE (ERP VIEW)
// // =====================================
// async function loadInventoryTable() {
//     const tbody = document.getElementById("inventoryTable");

//     try {
//         const res = await fetch("/api/inventory");
//         if (!res.ok) throw new Error("Inventory API error");

//         const data = await res.json();
//         tbody.innerHTML = "";

//         if (data.length === 0) {
//             tbody.innerHTML = `<tr><td colspan="6">No inventory available</td></tr>`;
//             return;
//         }

//         data.forEach(item => {
//             const row = document.createElement("tr");

//             row.innerHTML = `
//                 <td>${item.id}</td>
//                 <td>${item.product_name}</td>
//                 <td>${item.quantity}</td>
//                 <td>${item.zone}</td>
//                 <td>${item.rack}</td>
//                 <td>(${item.row_loc}, ${item.col_loc})</td>
//             `;

//             tbody.appendChild(row);
//         });

//     } catch (err) {
//         console.error("Inventory table error:", err);
//         tbody.innerHTML =
//             `<tr><td colspan="6">Failed to load inventory</td></tr>`;
//     }
// }


// -----------------------------
// SECTION SWITCHER
// -----------------------------
function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(sec => {
        sec.classList.add("hidden");
    });

    const section = document.getElementById(sectionId);
    section.classList.remove("hidden");

    // Load data only when needed
    if (sectionId === "inventorySection") {
        loadInventoryTable();
    }
}
