# Farmacia Multisucursal — Kit HTML + Node (Express + SQLite) con **Chat**

**Objetivo:** cada sucursal corre su propio mini-servidor (DB independiente). Mide ventas del día, detecta stock crítico y **envía reporte diario por email** automáticamente. Incluye **chat en tiempo real** por canales (General, Farmacia, Consultorio, Lab).

## 1) Requisitos
- Node.js 18+
- (Opcional) Docker
- SMTP válido para enviar correos (o App Password de Gmail)

## 2) Instalación (por sucursal)
```bash
npm i
cp .env.example .env
# Edita .env (BRANCH_ID, SMTP, REPORT_EMAILS, API_KEY, etc.)
npm run seed     # crea DB y datos ejemplo (incluye canales de chat)
npm start
```
Visita: http://localhost:3000  (dashboard)  
Chat: http://localhost:3000/chat.html

## 3) API y funciones
- `/api/stats/today` : ventas totales, tickets, ticket promedio y mix por origen.
- `/api/stock/low`   : productos con stock <= mínimo.
- `/api/email/daily` : envía reporte al correo (requiere header `x-api-key`).  
- **CRON diario** (21:00 CDMX por defecto) envía el correo sin intervención.

### Chat (Socket.IO, persistencia SQLite)
- Página: `/chat.html` (UI simple).
- Endpoints:
  - `GET /api/chat/threads`
  - `GET /api/chat/history/:thread_id`
- Eventos Socket.IO:
  - `join` { thread_id }
  - `chat:send` { thread_id, user_id, user_name, body }
  - `chat:new` (broadcast a los clientes del canal)
- Seed crea canales: `General`, `Farmacia`, `Consultorio`, `Laboratorio`.

## 4) Esquema de datos
- `products` / `inventory_moves` / `sales` / `sale_lines` / `payments`.
- `chat_threads` / `chat_participants` / `chat_messages` / `chat_receipts`.

> Stock = **IN - OUT** por producto.

## 5) Multi-sucursal
- Cada sucursal despliega este mismo proyecto con su propio `.env` y BD.
- Para chat entre sucursales, montamos un **Chat Hub** central y cada sucursal se conecta con Socket.IO (opcional).

## 6) Seguridad
- Activa TLS con Nginx/Caddy si expones a Internet.
- Añade auth con JWT para producción; aquí el demo usa `USER_NAME` localStorage.
- Limita puertos por firewall / VPN site-to-site si es intranet.

## 7) Personalización rápida
- Ajusta `REPORT_CRON_HOUR`/`MINUTE` en `.env`.
- Cambia estilos en `public/styles.css`.
- Agrega adjuntos en chat, permisos por rol, y notificaciones push (FCM).
