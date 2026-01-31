import sqlite3
from pathlib import Path

# -----------------------------------
# DATABASE PATH
# -----------------------------------
DB_PATH = Path(__file__).parent / "agv.sqlite3"


# -----------------------------------
# DB HELPER
# -----------------------------------
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


# -----------------------------------
# INIT TABLES
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
            pickup_r INTEGER NOT NULL,
            pickup_c INTEGER NOT NULL,
            delivery_r INTEGER NOT NULL,
            delivery_c INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
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
            col_loc INTEGER NOT NULL,
            UNIQUE(zone, rack, row_loc, col_loc)
        )
    """)

    conn.commit()
    cur.close()
    conn.close()


# -----------------------------------
# ORDERS FUNCTIONS
# -----------------------------------
def create_order(pickup, delivery):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO orders (pickup_r, pickup_c, delivery_r, delivery_c, status)
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

    cur.execute("SELECT * FROM orders ORDER BY id DESC")
    rows = [dict(row) for row in cur.fetchall()]

    cur.close()
    conn.close()
    return rows


def get_order_by_id(order_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    row = cur.fetchone()

    cur.close()
    conn.close()

    return dict(row) if row else None


def update_order_status(order_id, status):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "UPDATE orders SET status = ? WHERE id = ?",
        (status, order_id)
    )

    conn.commit()
    cur.close()
    conn.close()


# -----------------------------------
# INVENTORY FUNCTIONS
# -----------------------------------
def add_product(name, qty, zone, rack, r, c):
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO inventory
            (product_name, quantity, zone, rack, row_loc, col_loc)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (name, qty, zone, rack, r, c))

        conn.commit()

    except sqlite3.IntegrityError:
        cur.close()
        conn.close()
        return False

    cur.close()
    conn.close()
    return True


def list_products():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM inventory")
    rows = [dict(row) for row in cur.fetchall()]

    cur.close()
    conn.close()
    return rows


def update_product_qty(product_id, qty):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        UPDATE inventory
        SET quantity = ?
        WHERE id = ?
    """, (qty, product_id))

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

    exists = cur.fetchone() is not None

    cur.close()
    conn.close()
    return exists


# -----------------------------------
# EXTRA HELPERS
# -----------------------------------
def get_product(product_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM inventory WHERE id = ?", (product_id,))
    row = cur.fetchone()

    cur.close()
    conn.close()
    return dict(row) if row else None


def get_products_by_zone(zone):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM inventory WHERE zone = ?", (zone,))
    rows = [dict(row) for row in cur.fetchall()]

    cur.close()
    conn.close()
    return rows


def get_products_in_rack(zone, rack):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM inventory
        WHERE zone = ? AND rack = ?
    """, (zone, rack))

    rows = [dict(row) for row in cur.fetchall()]

    cur.close()
    conn.close()
    return rows
