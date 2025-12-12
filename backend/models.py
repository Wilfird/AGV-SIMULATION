# models.py
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "agv.sqlite3"


# -----------------------------------
# Database Connection Helper
# -----------------------------------
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


# -----------------------------------
# Init Database
# -----------------------------------
def init_db():
    init_orders_table()
    init_inventory_table()


def init_orders_table():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pickup_r INTEGER,
        pickup_c INTEGER,
        delivery_r INTEGER,
        delivery_c INTEGER,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    cur.close()
    conn.close()


def init_inventory_table():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        zone TEXT NOT NULL,
        rack TEXT NOT NULL,
        row_loc INTEGER NOT NULL,
        col_loc INTEGER NOT NULL
    )
    """)

    conn.commit()
    cur.close()
    conn.close()


# -----------------------------------
# ORDERS
# -----------------------------------
def create_order(pickup, delivery):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO orders 
        (pickup_r, pickup_c, delivery_r, delivery_c, status)
        VALUES (?, ?, ?, ?, 'pending')
    """, (pickup[0], pickup[1], delivery[0], delivery[1]))

    conn.commit()
    order_id = cur.lastrowid

    cur.close()
    conn.close()
    return order_id


def list_orders():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, pickup_r, pickup_c, delivery_r, delivery_c, status, created_at
        FROM orders 
        ORDER BY id DESC
    """)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    keys = ["id", "pickup_r", "pickup_c", "delivery_r", "delivery_c", "status", "created_at"]
    return [dict(zip(keys, row)) for row in rows]


def update_order_status(order_id, status):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))

    conn.commit()
    cur.close()
    conn.close()


# -----------------------------------
# INVENTORY
# -----------------------------------
def add_product(name, qty, zone, rack, r, c):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO inventory (product_name, quantity, zone, rack, row_loc, col_loc)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (name, qty, zone, rack, r, c))

    conn.commit()
    cur.close()
    conn.close()


def list_products():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, product_name, quantity, zone, rack, row_loc, col_loc
        FROM inventory
    """)

    rows = cur.fetchall()
    cur.close()
    conn.close()

    keys = ["id", "product_name", "quantity", "zone", "rack", "row_loc", "col_loc"]
    return [dict(zip(keys, row)) for row in rows]


def update_product_qty(product_id, qty):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("UPDATE inventory SET quantity = ? WHERE id = ?", (qty, product_id))

    conn.commit()
    cur.close()
    conn.close()
    
def rack_location_exists(zone, rack, r, c):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id FROM inventory
        WHERE zone = ? AND rack = ? AND row_loc = ? AND col_loc = ?
    """, (zone, rack, r, c))

    row = cur.fetchone()
    cur.close()
    conn.close()

    return row is not None
    


# -----------------------------------
# EXTRA FUNCTIONS (Future AGV + Zone System)
# -----------------------------------

def get_product(product_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, product_name, quantity, zone, rack, row_loc, col_loc
        FROM inventory
        WHERE id = ?
    """, (product_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return None

    keys = ["id", "product_name", "quantity", "zone", "rack", "row_loc", "col_loc"]
    return dict(zip(keys, row))


def get_products_by_zone(zone):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, product_name, quantity, zone, rack, row_loc, col_loc
        FROM inventory
        WHERE zone = ?
    """, (zone,))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    keys = ["id", "product_name", "quantity", "zone", "rack", "row_loc", "col_loc"]
    return [dict(zip(keys, row)) for row in rows]


def get_products_in_rack(zone, rack):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, product_name, quantity, zone, rack, row_loc, col_loc
        FROM inventory
        WHERE zone = ?
        AND rack = ?
    """, (zone, rack))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    keys = ["id", "product_name", "quantity", "zone", "rack", "row_loc", "col_loc"]
    return [dict(zip(keys, row)) for row in rows]
