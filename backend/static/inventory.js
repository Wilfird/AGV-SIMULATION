// Load inventory on page load
window.onload = () => {
    loadInventory();
};

async function loadInventory() {
    const res = await fetch("/api/inventory");
    const data = await res.json();

    const tbody = document.querySelector("#inventoryTable tbody");
    tbody.innerHTML = "";

    data.forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.product_name}</td>
            <td>${item.quantity}</td>
            <td>${item.zone}</td>
            <td>${item.rack}</td>
            <td>(${item.row_loc}, ${item.col_loc})</td>

            <td>
                <input type="number" id="qty_${item.id}" value="${item.quantity}">
                <button class="update-btn" onclick="updateQty(${item.id})">Update</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

async function addProduct() {
    const name = document.getElementById("pname").value;
    const qty = document.getElementById("pqty").value;

    const zone = document.getElementById("zone").value;
    const rack = document.getElementById("rack").value;

    const row = document.getElementById("prow").value;
    const col = document.getElementById("pcol").value;

    if (!name || !qty || !zone || !rack || row === "" || col === "") {
        alert("Please fill all fields!");
        return;
    }

    const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            product_name: name,
            quantity: +qty,
            zone: zone,
            rack: rack,
            row_loc: +row,
            col_loc: +col
        })
    });

    const data = await res.json();

    // ❗ Show backend validation errors (duplicate slot)
    if (!res.ok) {
        alert("❌ ERROR: " + data.error);
        return;
    }

    alert("✅ Product Added Successfully!");
    loadInventory();
}

async function updateQty(id) {
    const newQty = document.getElementById(`qty_${id}`).value;

    const res = await fetch(`/api/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: +newQty })
    });

    const data = await res.json();

    if (!res.ok) {
        alert("❌ ERROR: " + data.error);
        return;
    }

    alert("✔ Quantity Updated");
    loadInventory();
}
