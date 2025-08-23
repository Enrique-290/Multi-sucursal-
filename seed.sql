INSERT OR REPLACE INTO products (id,name,sku,price,cost,min_stock,has_lot,active) VALUES
('P-001','Paracetamol 500mg 10 tabs','PARA500',35,18,20,1,1),
('P-002','Vitamina C 1g 10 tabs','VITC1G',55,28,15,1,1),
('P-100','Consulta médica general','CONS-GEN',80,0,0,0,1),
('P-200','Perfil básico (Laboratorio)','LAB-PB',220,80,0,0,1);

-- Compras (IN)
INSERT OR REPLACE INTO inventory_moves (id,dt,product_id,type,qty,lot,expiry,ref) VALUES
('M-001',datetime('now','localtime'),'P-001','IN',100,'A123','2026-01-31','COMP-001'),
('M-002',datetime('now','localtime'),'P-002','IN',60,'B456','2026-03-31','COMP-001');

-- Ventas de ejemplo (hoy)
INSERT OR REPLACE INTO sales (id,dt,subtotal,tax,discount,total,status,origin) VALUES
('V-001',datetime('now','localtime'),70,0,0,70,'PAID','Farmacia'),
('V-002',datetime('now','localtime'),80,0,0,80,'PAID','Consultorio'),
('V-003',datetime('now','localtime'),220,0,0,220,'PAID','Laboratorio');

INSERT OR REPLACE INTO sale_lines (id,sale_id,product_id,qty,price,cost,total_line) VALUES
('L-001','V-001','P-001',2,35,18,70),
('L-002','V-002','P-100',1,80,0,80),
('L-003','V-003','P-200',1,220,80,220);

-- Movimientos OUT por ventas
INSERT OR REPLACE INTO inventory_moves (id,dt,product_id,type,qty,lot,expiry,ref) VALUES
('M-003',datetime('now','localtime'),'P-001','OUT',2,'A123','2026-01-31','V-001');

-- Pagos
INSERT OR REPLACE INTO payments (id,sale_id,dt,method,amount,ref) VALUES
('PA-001','V-001',datetime('now','localtime'),'Efectivo',70,''),
('PA-002','V-002',datetime('now','localtime'),'Efectivo',80,''),
('PA-003','V-003',datetime('now','localtime'),'Transferencia',220,'TR-789');
