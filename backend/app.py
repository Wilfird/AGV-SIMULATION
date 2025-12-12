# app.py
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pathlib import Path
from astar import astar
from models import (
    init_db,
    create_order,
    list_orders,
    update_order_status,
    add_product,
    list_products,
    update_product_qty,
)
from config import GRID, AGV_START
import threading
import time

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

app = Flask(__name__, static_folder=str(STATIC_DIR))
CORS(app)

# AGV memory state
agv_state = {"r": AGV_START[0], "c": AGV_START[1], "status": "idle"}

# Initialize DB
init_db()


# ----------------------
# Static Routes
# ----------------------
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(app.static_folder, filename)


# ----------------------
# GRID & PATH PLANNING
# ----------------------
@app.route("/api/grid", methods=["GET"])
def get_grid():
    return jsonify(GRID)


@app.route("/api/plan", methods=["POST"])
def plan():
    data = request.json or {}
    start = data.get("start")
    goal = data.get("goal")
    if not start or not goal:
        return jsonify({"error": "start and goal required"}), 400

    path = astar(GRID, start, goal)
    return jsonify({"path": path})


# ----------------------
# ORDERS
# ----------------------
@app.route("/api/orders", methods=["POST"])
def api_create_order():
    data = request.json or {}
    pickup = data.get("pickup")
    delivery = data.get("delivery")

    if not pickup or not delivery:
        return jsonify({"error": "pickup and delivery required"}), 400

    order_id = create_order(pickup, delivery)
    return jsonify({"message": "created", "order_id": order_id})


@app.route("/api/orders", methods=["GET"])
def api_list_orders():
    rows = list_orders()
    return jsonify(rows)


# ----------------------
# AGV EXECUTION
# ----------------------
@app.route("/api/agv", methods=["GET"])
def api_agv():
    return jsonify(agv_state)


def run_agv_path(path, order_id=None):
    global agv_state
    agv_state["status"] = "moving"
    try:
        for node in path[1:]:
            agv_state["r"], agv_state["c"] = node
            time.sleep(0.15)
    finally:
        agv_state["status"] = "idle"
        if order_id:
            update_order_status(order_id, "completed")


@app.route("/api/execute", methods=["POST"])
def api_execute():
    data = request.json or {}
    path = data.get("path")
    order_id = data.get("order_id")

    if not path:
        return jsonify({"error": "path required"}), 400

    t = threading.Thread(target=run_agv_path, args=(path, order_id), daemon=True)
    t.start()

    return jsonify({"message": "execution started"})


# ----------------------
# INVENTORY (NOW WITH ZONES + RACKS)
# ----------------------
@app.route("/api/inventory", methods=["GET"])
def api_list_inventory():
    return jsonify(list_products())


@app.route("/api/inventory", methods=["POST"])
def api_add_inventory():
    data = request.json or {}

    name = data.get("product_name")
    qty = data.get("quantity")
    zone = data.get("zone")
    rack = data.get("rack")
    row_loc = data.get("row_loc")
    col_loc = data.get("col_loc")

    # Validate fields
    if None in (name, qty, zone, rack, row_loc, col_loc):
        return jsonify({"error": "product_name, quantity, zone, rack, row_loc, col_loc required"}), 400

    # Convert to correct types
    try:
        qty = int(qty)
        row_loc = int(row_loc)
        col_loc = int(col_loc)
    except:
        return jsonify({"error": "quantity, row_loc and col_loc must be integers"}), 400

    # Add to DB
    add_product(name, qty, zone, rack, row_loc, col_loc)
    return jsonify({"message": "Product added"})


@app.route("/api/inventory/<int:pid>", methods=["PUT"])
def api_update_inventory(pid):
    data = request.json or {}
    qty = data.get("quantity")

    if qty is None:
        return jsonify({"error": "quantity required"}), 400

    try:
        qty = int(qty)
    except:
        return jsonify({"error": "quantity must be integer"}), 400

    update_product_qty(pid, qty)
    return jsonify({"message": "Quantity updated"})


# ----------------------
# RUN SERVER
# ----------------------
if __name__ == "__main__":
    app.run(port=5000, debug=True)
