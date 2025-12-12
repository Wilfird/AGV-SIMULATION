🚗 AGV System with Smart Warehouse Management (Python + HTML/JS)
Autonomous Navigation • Zone-Based Warehouse • Inventory Tracking • A* Pathfinding
📌 Project Overview

This project simulates an Automated Guided Vehicle (AGV) inside a warehouse environment.
The AGV can:

Navigate a 9×9 grid

Avoid obstacles

Find shortest paths using A*

Pick & deliver materials

Update status live

Integrate with a smart Warehouse Management System (WMS)

The WMS includes:

Inventory management

Zone & Rack mapping

Product coordinate system

Real-time stock updates

This project is built for hackathon demonstration and modular team development.

🛠️ Tech Stack
Frontend

HTML

CSS

JavaScript

DOM Grid Rendering

Backend

Python (Flask)

SQLite Database

A* Pathfinding Algorithm

Version Control

Git + GitHub

📁 Folder Structure
agv-sim/
│── backend/
│   ├── app.py                # Flask backend
│   ├── models.py             # SQLite DB functions
│   ├── astar.py              # A* pathfinding code
│   ├── config.py             # Grid + AGV position
│   ├── static/
│       ├── index.html        # AGV simulation UI
│       ├── inventory.html    # Warehouse inventory UI
│       ├── inventory.js      # Frontend logic
│       ├── simulation.js     # AGV movement
│       ├── styles.css
│── venv/
│── README.md

🚀 Features
🔹 1. AGV Simulation

9×9 grid map

Obstacles (walls)

Pickup (green)

Delivery point (orange)

AGV icon moves tile-by-tile

Smooth animation

Realtime AGV status

A* shortest path planning

🔹 2. Warehouse Management System (WMS)
Zone-Based Smart Inventory

Each zone contains racks:

Zone A → Rack 1, Rack 2
Zone B → Rack 1, Rack 2
Zone C → Rack 1, Rack 2


Every product stores:

zone

rack

row_loc

col_loc

Example:

Product: Motor
Zone: A
Rack: 1
Location: (3, 4)
Quantity: 20

🔹 3. Inventory CRUD

✔ Add Product
✔ Update Quantity
✔ List Products
✔ Automatic database update in SQLite

🌐 Backend API Endpoints
1. Get Grid
GET /api/grid

2. Plan Path (A)*
POST /api/plan
{
  "start": [r,c],
  "goal": [r,c]
}

3. Execute AGV Movement
POST /api/execute
{
  "path": [...],
  "order_id": 1
}

4. Inventory

Add:

POST /api/inventory
{
  "product_name": "Motor",
  "quantity": 20,
  "zone": "A",
  "rack": "1",
  "row_loc": 3,
  "col_loc": 4
}


List:

GET /api/inventory


Update:

PUT /api/inventory/<id>
{
  "quantity": 12
}

🖥️ How to Run the Project (For Teammates)
1. Clone the Repository
git clone https://github.com/your-repo/agv-sim.git
cd agv-sim/backend

2. Create Virtual Env
python -m venv venv
venv\Scripts\activate

3. Install Requirements
pip install -r requirements.txt

4. Run the Backend
python app.py

5. Open Simulation

AGV UI
👉 http://127.0.0.1:5000/

Inventory System
👉 http://127.0.0.1:5000/static/inventory.html
