# Farmacia Multisucursal — Kit HTML + Node (Express + SQLite)

**Objetivo:** cada sucursal corre su propio mini-servidor (DB independiente). Mide ventas del día, detecta stock crítico y **envía reporte diario por email** automáticamente a la hora configurada (CDMX).

## 1) Requisitos
- Node.js 18+
- (Opcional) Docker
- SMTP válido para enviar correos (o App Password de Gmail)

## 2) Instalación (por sucursal)
```bash
npm i
cp .env.example .env
# Edita .env (BRANCH_ID, SMTP, REPORT_EMAILS, API_KEY, etc.)
npm run seed     # crea DB y datos ejemplo
npm start
```
Visita: http://localhost:3000

## 3) ¿Qué hace?
- `/api/stats/today` : ventas totales, tickets, ticket promedio y mix por origen.
- `/api/stock/low`   : productos con stock <= mínimo.
- `/api/email/daily` : envía reporte al correo (requiere header `x-api-key`).  
- **CRON diario** (21:00 CDMX por defecto) envía el correo sin intervención.

## 4) Esquema de datos
- `products` : catálogo (min_stock controla alertas).
- `inventory_moves` : entradas (IN) y salidas (OUT).
- `sales` + `sale_lines` + `payments` : ventas por origen (Farmacia/Consultorio/Lab).

> El stock se calcula como **IN - OUT** por producto.

## 5) Flujo recomendado
- **Compra**: inserta `inventory_moves` tipo `IN`.
- **Venta**: inserta `sales`, `sale_lines` y `inventory_moves` tipo `OUT` con referencia de la venta.
- **Reporte diario**: se envía automático (CRON) y también manual desde botón del dashboard.

## 6) Multi-sucursal
- Cada sucursal despliega este mismo proyecto con su propio `.env` y DB.
- Si luego quieres **centralizar** reportes, podemos crear un **colector** que reciba (vía `POST`) el JSON de cada sucursal.

## 7) Seguridad
- Endpoints de lectura son públicos dentro de la LAN de la sucursal (puedes activar CORS restringido).
- Los endpoints de acciones (como `/api/email/daily`) piden `x-api-key` (configura `API_KEY` en `.env`).

## 8) Personalización
- Ajusta `REPORT_CRON_HOUR` y `REPORT_CRON_MINUTE` en `.env`.
- Cambia los estilos en `public/styles.css` y el HTML en `public/index.html`.
- Agrega endpoints para corte de caja, top productos, export CSV/PDF, etc.

---

**Hecho para: App Farmacia / Consultorio / Laboratorio** — listo para crecer a Firestore/BigQuery cuando haya 5+ sucursales.
