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
    rack_location_exists
)

from config import GRID, AGV_START
import threading
import time

BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"

app = Flask(__name__, static_folder=str(STATIC_DIR))
CORS(app)

# AGV state memory
agv_state = {"r": AGV_START[0], "c": AGV_START[1], "status": "idle"}

# Initialize DB
init_db()


# -----------------------------------------------------
# STATIC ROUTES
# -----------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(app.static_folder, filename)


# -----------------------------------------------------
# GRID + PATH PLANNING
# -----------------------------------------------------
@app.route("/api/grid", methods=["GET"])
def api_grid():
    return jsonify(GRID)


@app.route("/api/plan", methods=["POST"])
def api_plan():
    data = request.json or {}
    start = data.get("start")
    goal = data.get("goal")

    if not start or not goal:
        return jsonify({"error": "start and goal required"}), 400

    path = astar(GRID, start, goal)
    return jsonify({"path": path})


# -----------------------------------------------------
# ORDERS
# -----------------------------------------------------
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
    return jsonify(list_orders())


# -----------------------------------------------------
# AGV CONTROLS
# -----------------------------------------------------
@app.route("/api/agv", methods=["GET"])
def api_agv():
    return jsonify(agv_state)


def run_agv_path(path, order_id=None):
    agv_state["status"] = "moving"

    for node in path[1:]:
        agv_state["r"], agv_state["c"] = node
        time.sleep(0.15)

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


# -----------------------------------------------------
# INVENTORY (ZONES + RACKS)
# -----------------------------------------------------
@app.route("/api/inventory", methods=["GET"])
def api_inventory_list():
    return jsonify(list_products())


@app.route("/api/inventory", methods=["POST"])
def api_inventory_add():
    data = request.json or {}

    name = data.get("product_name")
    qty = data.get("quantity")
    zone = data.get("zone")
    rack = data.get("rack")
    row_loc = data.get("row_loc")
    col_loc = data.get("col_loc")

    # Validate
    if None in (name, qty, zone, rack, row_loc, col_loc):
        return jsonify({"error": "All fields are required"}), 400

    try:
        qty = int(qty)
        row_loc = int(row_loc)
        col_loc = int(col_loc)
    except ValueError:
        return jsonify({"error": "qty, row_loc, col_loc must be integers"}), 400

    # 🚫 Prevent duplicate rack location
    if rack_location_exists(zone, rack, row_loc, col_loc):
        return jsonify({
            "error": f"Rack {zone}-{rack} at ({row_loc},{col_loc}) is already occupied"
        }), 400

    # ✅ Insert product
    add_product(name, qty, zone, rack, row_loc, col_loc)

    return jsonify({"message": "Product added successfully"}), 200


@app.route("/api/inventory/<int:pid>", methods=["PUT"])
def api_inventory_update(pid):
    data = request.json or {}
    qty = data.get("quantity")

    if qty is None:
        return jsonify({"error": "quantity required"}), 400

    try:
        qty = int(qty)
    except ValueError:
        return jsonify({"error": "quantity must be integer"}), 400

    update_product_qty(pid, qty)
    return jsonify({"message": "Quantity updated"})

@app.route("/erp")
def erp_dashboard():
    return send_from_directory(app.static_folder, "erp.html")



# -----------------------------------------------------
# RUN SERVER
# -----------------------------------------------------
if __name__ == "__main__":
    app.run(port=5000, debug=True)
