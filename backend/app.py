# app.py

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
import threading
import time

from astar import astar
from config import GRID, AGV_START

from models import (
    init_db,
    create_order,
    list_orders,
    update_order_status,
    add_product,
    list_products,
    update_product_qty,
    rack_location_exists,
    get_order_by_id
)

# --------------------------------
# APP SETUP
# --------------------------------
BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

app = Flask(__name__, static_folder=str(STATIC_DIR))
CORS(app)

# --------------------------------
# AGV STATE
# --------------------------------
agv_state = {
    "r": AGV_START[0],
    "c": AGV_START[1],
    "status": "idle",   # idle | moving_to_pickup | loading | moving_to_delivery | unloading
    "current_order": None
}

# Initialize database
init_db()

# --------------------------------
# STATIC ROUTES
# --------------------------------
@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/erp")
def erp():
    return send_from_directory(STATIC_DIR, "erp.html")


@app.route("/inventory")
def inventory():
    return send_from_directory(STATIC_DIR, "inventory.html")


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(STATIC_DIR, filename)

# --------------------------------
# GRID & PATH
# --------------------------------
@app.route("/api/grid")
def api_grid():
    return jsonify(GRID)


@app.route("/api/plan", methods=["POST"])
def api_plan():
    data = request.json
    path = astar(GRID, data["start"], data["goal"])
    return jsonify({"path": path})

# --------------------------------
# INVENTORY
# --------------------------------
@app.route("/api/inventory", methods=["GET"])
def inventory_list():
    return jsonify(list_products())


@app.route("/api/inventory", methods=["POST"])
def inventory_add():
    data = request.json

    if rack_location_exists(
        data["zone"],
        data["rack"],
        data["row_loc"],
        data["col_loc"]
    ):
        return jsonify({"error": "Rack already occupied"}), 400

    add_product(
        data["product_name"],
        int(data["quantity"]),
        data["zone"],
        data["rack"],
        int(data["row_loc"]),
        int(data["col_loc"])
    )

    return jsonify({"message": "Product added"})


@app.route("/api/inventory/<int:pid>", methods=["PUT"])
def inventory_update(pid):
    update_product_qty(pid, int(request.json["quantity"]))
    return jsonify({"message": "Quantity updated"})

# --------------------------------
# ORDERS
# --------------------------------
@app.route("/api/orders", methods=["GET"])
def orders_list():
    return jsonify(list_orders())


@app.route("/api/orders", methods=["POST"])
def orders_create():
    data = request.json
    order_id = create_order(data["pickup"], data["delivery"])
    return jsonify({"order_id": order_id})

# --------------------------------
# AGV STATUS
# --------------------------------
@app.route("/api/agv")
def agv_status():
    return jsonify(agv_state)

# --------------------------------
# AGV MOVEMENT ENGINE
# --------------------------------
def run_agv(path_to_pickup, path_to_delivery, order_id):

    agv_state["status"] = "moving_to_pickup"
    agv_state["current_order"] = order_id

    # Move to pickup
    for r, c in path_to_pickup[1:]:
        agv_state["r"] = r
        agv_state["c"] = c
        time.sleep(0.15)

    # Simulate loading
    agv_state["status"] = "loading"
    time.sleep(1)

    # Move to delivery
    agv_state["status"] = "moving_to_delivery"
    for r, c in path_to_delivery[1:]:
        agv_state["r"] = r
        agv_state["c"] = c
        time.sleep(0.15)

    # Simulate unloading
    agv_state["status"] = "unloading"
    time.sleep(1)

    # Finish
    agv_state["status"] = "idle"
    agv_state["current_order"] = None

    update_order_status(order_id, "completed")

# --------------------------------
# EXECUTE ORDER
# --------------------------------
@app.route("/api/execute-order/<int:order_id>", methods=["POST"])
def execute_order(order_id):

    order = get_order_by_id(order_id)

    if not order:
        return jsonify({"error": "Order not found"}), 404

    if order["status"] != "pending":
        return jsonify({"error": "Order already processed"}), 400

    if agv_state["status"] != "idle":
        return jsonify({"error": "AGV is busy"}), 400

    update_order_status(order_id, "in_progress")

    start = (agv_state["r"], agv_state["c"])
    pickup = (order["pickup_r"], order["pickup_c"])
    delivery = (order["delivery_r"], order["delivery_c"])

    # Plan path to pickup
    path1 = astar(GRID, start, pickup)

    # Plan path to delivery
    path2 = astar(GRID, pickup, delivery)

    if not path1 or not path2:
        update_order_status(order_id, "failed")
        return jsonify({"error": "Path planning failed"}), 500

    # Start AGV movement thread
    t = threading.Thread(
        target=run_agv,
        args=(path1, path2, order_id),
        daemon=True
    )
    t.start()

    return jsonify({"message": "Order sent to AGV"})

# --------------------------------
# RUN SERVER
# --------------------------------
if __name__ == "__main__":
    app.run(debug=True)
