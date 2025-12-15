// -----------------------------
// ERP Dashboard Loader
// -----------------------------
window.onload = () => {
    loadInventoryCount();
    loadOrderCount();
    loadAgvStatus();
};

// -----------------------------
// Inventory (WMS)
// -----------------------------
async function loadInventoryCount() {
    try {
        const res = await fetch("/api/inventory");
        const data = await res.json();

        document.getElementById("inventoryCount").innerText =
            data.length + " Products";
    } catch (err) {
        document.getElementById("inventoryCount").innerText = "Error";
        console.error("Inventory load error:", err);
    }
}

// -----------------------------
// Orders
// -----------------------------
async function loadOrderCount() {
    try {
        const res = await fetch("/api/orders");
        const data = await res.json();

        document.getElementById("orderCount").innerText =
            data.length + " Orders";
    } catch (err) {
        document.getElementById("orderCount").innerText = "Error";
        console.error("Order load error:", err);
    }
}

// -----------------------------
// AGV Status
// -----------------------------
async function loadAgvStatus() {
    try {
        const res = await fetch("/api/agv");
        const data = await res.json();

        document.getElementById("agvStatus").innerText =
            data.status.toUpperCase();
    } catch (err) {
        document.getElementById("agvStatus").innerText = "Error";
        console.error("AGV load error:", err);
    }
}
