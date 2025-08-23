PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Productos
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  has_lot INTEGER NOT NULL DEFAULT 0, -- 0/1
  active INTEGER NOT NULL DEFAULT 1   -- 0/1
);

-- Movimientos de inventario (IN/OUT)
CREATE TABLE IF NOT EXISTS inventory_moves (
  id TEXT PRIMARY KEY,
  dt TEXT NOT NULL,               -- ISO string local o UTC
  product_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('IN','OUT')),
  qty REAL NOT NULL,
  lot TEXT,
  expiry TEXT,
  ref TEXT,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Ventas
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  dt TEXT NOT NULL,              -- fecha/hora ISO
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PAID', -- 'PAID','CANCELLED'
  origin TEXT NOT NULL DEFAULT 'Farmacia' -- Farmacia | Consultorio | Laboratorio
);

-- Líneas de venta
CREATE TABLE IF NOT EXISTS sale_lines (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  qty REAL NOT NULL,
  price REAL NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  total_line REAL NOT NULL,
  FOREIGN KEY(sale_id) REFERENCES sales(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Pagos de venta
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  dt TEXT NOT NULL,
  method TEXT NOT NULL, -- Efectivo | Tarjeta | Transferencia | Mixto
  amount REAL NOT NULL,
  ref TEXT,
  FOREIGN KEY(sale_id) REFERENCES sales(id)
);
