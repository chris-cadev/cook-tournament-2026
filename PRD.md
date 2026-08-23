# PRD: PLATAFORMA DIGITAL "SANDWICH CHAMPIONSHIP & BIRTHDAY"

## 1. OBJETIVO GENERAL

Crear una plataforma web todo-en-uno para gestionar el **Campeonato de Sándwiches**, que permita desde el registro de participantes y la comunicación automatizada, hasta la interacción en vivo durante el evento (chats segmentados, revelación de puntuaciones) y la administración interna del presupuesto.

---

## 2. ROLES DE USUARIO

- **Administrador (Host/Organizador):** Control total del sistema. Gestiona configuración, envía correos, controla revelación de puntuaciones, edita la lista de tareas y modera todos los chats.
- **Cocineros / Equipos:** Se registran con su equipo, reciben correos de recordatorio, acceden a su chat privado de equipo y ven información del evento.
- **Jueces:** Acceden a área secreta con contraseña para ver rúbricas de puntuación y acceder a su chat privado de jueces.
- **Invitados / Público General:** Visualizan info del evento y participan en el chat global.

---

## 3. REQUISITOS FUNCIONALES

### MÓDULO 1: PÁGINA PRINCIPAL Y ESTÁTICA (Landing Page)

**Descripción:** Página pública de acceso libre.

**Contenido:**
- Banner principal con nombre del evento y cuenta regresiva.
- Sección "¿Qué es esto?" (Descripción del torneo).
- Reglas básicas (destacar: **NO HAMBURGUESAS**).
- Cronograma del día del evento (horarios).
- Preguntas Frecuentes (FAQ) sobre qué traer, cómo funciona la degustación, etc.
- Botón de acceso al **Chat Global**.
- Botones de acceso a los chats privados (requieren autenticación).

---

### MÓDULO 2: CUENTA REGRESIVA (Countdown)

**Ubicación:** Visible en el header de toda la página (y destacada en el inicio).

**Funcionalidad:**
- Temporizador en JavaScript que cuenta días, horas, minutos y segundos hasta la fecha y hora fijada del evento.
- Configurable desde el panel de admin.

---

### MÓDULO 3: REGISTRO DE COCINEROS Y EQUIPOS

**Formulario público:**
- Nombre del Equipo (obligatorio).
- Nombre del Sándwich (opcional, pueden cambiarlo después).
- Integrantes (máximo 3): Nombre completo, correo electrónico y teléfono de cada uno.
- Contraseña de acceso al **Chat de Cocineros** (será la misma para todo el equipo).
- Equipo necesario: Checkbox para seleccionar si necesitan enchufe, freidora de aire, o si traen su propia plancha.

**Validación:**
- No se permiten equipos duplicados.
- El correo del capitán será el identificador principal.

---

### MÓDULO 4: REGISTRO Y ACCESO DE JUECES (Área Protegida)

**Ubicación:** Página oculta (ej. `/jueces/login`).

**Protección:**
- Acceso mediante **una sola contraseña global** (configurable por el Admin).
- No hay cuentas individuales.
- Al ingresar, el juez tiene acceso a:
  1. **Panel del Juez:** Guía de degustación y rúbrica de puntuación.
  2. **Chat de Jueces:** Canal privado para comunicarse entre ellos y con el admin.

---

### MÓDULO 5: SISTEMA DE CHATS (Mensajería en Tiempo Real)

Se implementarán **tres canales de chat completamente independientes**.

| Chat | Acceso | Propósito |
|------|--------|-----------|
| **Chat Global** | Público (sin autenticación) | Interacción general entre todos los asistentes, público e invitados. |
| **Chat de Cocineros** | Requiere autenticación (correo del capitán + contraseña del equipo) | Comunicación interna entre los integrantes de un mismo equipo. Útil si no usan WhatsApp. |
| **Chat de Jueces** | Requiere la contraseña global de jueces | Comunicación privada entre los 3 jueces y el administrador para coordinar la degustación. |

**Funcionalidades comunes a todos los chats:**
- Envío de **mensajes de texto**.
- Envío de **enlaces (links)**.
- Envío de **imágenes** (formatos JPG, PNG, GIF).
- Envío de **notas de audio** (formato MP3 / AAC, máximo 2 minutos por nota).
- **No se permite** el envío de videos.
- Historial persistente (los mensajes se guardan en la base de datos SQLite).
- Los mensajes se actualizan en tiempo real sin necesidad de recargar la página.
- El administrador tiene permisos para **eliminar mensajes** en todos los canales.

---

### MÓDULO 6: SISTEMA DE CORREOS AUTOMÁTICOS (Email Engine)

**Requisito técnico:**
- Conexión con SMTP (Gmail, SendGrid, o similar).
- El admin debe poder configurar el remitente.

**Tipos de correos (plantillas editables por el admin desde el panel):**

| Correo | Destinatarios | Momento | Contenido |
|--------|---------------|---------|-----------|
| **Confirmación** | Cocineros y Jueces | Inmediato al registrarse | Confirmación de registro + credenciales de acceso a los chats. |
| **Recordatorio de Preparación** | Solo Cocineros | 3 semanas antes | Traer TODOS los ingredientes, proteínas pre-marinadas, utensilios propios. |
| **Recordatorio Final** | Todos (cocineros, jueces, invitados) | 1 semana antes | Cronograma, dirección, regla "No Burgers", enlace al evento. |
| **Invitación** | Cualquier persona | Manual (desde panel) | Invitación a ser espectador, cocinero o unirse a equipo. |

---

### MÓDULO 7: PANEL DE ADMINISTRACIÓN (Host Dashboard)

**Acceso:** Exclusivo para el organizador (login con usuario/contraseña fijo).

**Secciones del Dashboard:**

| Sección | Funcionalidad |
|---------|---------------|
| **Ver equipos** | Tabla con todos los inscritos, editar o eliminar. |
| **Ver jueces** | Lista de jueces registrados. |
| **Configuración de correos** | Editar plantillas y enviar correos masivos (manual o programado). |
| **Moderación de Chats** | Visor unificado de todos los chats. Capacidad de eliminar mensajes ofensivos en cualquier canal. |
| **Control de Puntuaciones** | Botón para revelar puntuaciones públicamente (por categorías o total). |
| **To-Do List** | Editar lista de tareas en Markdown. |

---

### MÓDULO 8: TABLA DE REVELACIÓN DE PUNTUACIONES (Suspense)

**Visibilidad:** Pública, pero **bloqueada** por defecto.

**Control (Admin):**
- El administrador tiene un botón en el panel: **"Revelar puntuaciones"**.

**Mecanismo de tensión:**
- Muestra una tabla con columnas: Equipo (oculto hasta el final) | Sabor | Textura | Creatividad | Presentación | Total.
- El admin puede revelar las categorías una por una (ej. primero "Textura", luego "Creatividad", etc.) para generar emoción.
- La tabla final muestra los nombres de los equipos.

---

### MÓDULO 9: TO-DO LIST (Editable en Markdown)

**Ubicación:** Dentro del Dashboard del Admin.

**Funcionalidad:**
- Área de texto enriquecida que soporta **Markdown** (para hacer listas, tachados, negritas).
- Guardado automático en la base de datos (SQLite).
- **Uso sugerido:** Llevar el control de compras (ej. `- [ ] Comprar tostadora ($250)`), presupuesto gastado y tareas pendientes.

---

### MÓDULO 10: PÁGINA PARA INVITAR A OTROS (Sistema de Referidos)

**Funcionalidad:**
- Generación de enlaces únicos o uso de un formulario simple.
- Opciones al invitar:
    1.  **Invitado / Espectador:** Solo verá la info y el chat global.
    2.  **Cocinero (Nuevo equipo):** Se le redirige al registro de equipos.
    3.  **Unirse a equipo existente:** Enviar invitación para que alguien se una a un equipo que ya está formado pero le falta gente (el capitán genera el enlace).
- **Correo:** El sistema envía un correo con el enlace personalizado a la persona invitada.

---

## 4. REQUISITOS NO FUNCIONALES (Técnicos)

| Requisito | Especificación |
|-----------|----------------|
| **Base de Datos** | SQLite (ligera, fácil de respaldar). |
| **Backend** | Node.js con Express. |
| **Frontend** | React (con Vite para construcción rápida). |
| **Comunicación en Tiempo Real** | **WebSockets** (Socket.io) para los tres chats. Permite manejar eficientemente texto, imágenes y audio en tiempo real. *Nota: No se usará Server-Sent Events (SSE) por la complejidad de manejar datos binarios como imágenes y audios.* |
| **Almacenamiento de Archivos (Imágenes y Audios)** | **MinIO** (S3-compatible). Se utilizará un bucket dedicado para almacenar las imágenes y audios subidos en los chats. Las URLs generadas serán pre-firmadas (*presigned URLs*) o públicas según configuración, y se guardarán en la base de datos SQLite. Esto permite escalabilidad y separación del almacenamiento del servidor principal. |
| **Analíticas y Seguimiento** | **Umami** (self-hosted o versión cloud). Se implementará para rastrear métricas clave del sitio: número de visitas, páginas más vistas, tiempo de sesión, y comportamiento de los usuarios sin comprometer su privacidad (cumple con GDPR/CCPA). El administrador podrá visualizar el dashboard de Umami para medir el alcance del evento. |
| **Seguridad** | Contraseñas hasheadas (bcrypt). El panel de admin con autenticación robusta (JWT o sesiones). |
| **Diseño (Responsive)** | **Mobile-First**: La interfaz está diseñada primordialmente para teléfonos celulares (tamaños de fuente grandes, botones táctiles, layout vertical). Debe ser completamente funcional y adaptarse a pantallas de escritorio (web). |
| **Rendimiento** | Los archivos de audio e imágenes deben tener límite de tamaño (ej. imagen < 5MB, audio < 2MB) para no saturar el servidor ni el bucket de MinIO. |

---

## 5. FLUJO DE NAVEGACIÓN (Sitemap)

- **Público (Sin login):**
    - Inicio (Landing + Countdown)
    - Chat Global (acceso inmediato)
    - Registro de Cocineros
    - Página de Invitación
    - Login de Jueces
- **Cocineros (Login con credenciales del equipo):**
    - Dashboard del Equipo (información)
    - Chat de Cocineros (privado)
- **Jueces (Password global):**
    - Panel del Juez (Instrucciones + Rúbrica)
    - Chat de Jueces (privado)
- **Administrador (Login):**
    - Dashboard (Resumen)
    - Gestión de Equipos
    - Gestión de Correos
    - Moderación de Chats (todos los canales)
    - Control de Puntuaciones (Revelar)
    - To-Do List (Markdown)

---

## 6. CRITERIOS DE ACEPTACIÓN

- Un cocinero puede registrarse en menos de 2 minutos y recibe sus credenciales de chat por correo.
- Un juez ingresa con la contraseña global y accede inmediatamente al chat privado de jueces.
- Los tres chats (global, cocineros, jueces) funcionan simultáneamente y muestran los mensajes en tiempo real.
- Se pueden enviar imágenes y audios en todos los chats sin errores (almacenados en MinIO).
- Las analíticas de Umami registran correctamente las visitas y eventos de la página.
- La cuenta regresiva es precisa y visible.
- Los correos de recordatorio llegan a la bandeja de entrada en las fechas programadas.
- El admin puede presionar un botón y la tabla de puntuaciones se vuelve pública instantáneamente.
- La lista de tareas en Markdown guarda el formato correctamente al recargar la página.
- La interfaz se ve nítida y es fácil de usar en un teléfono móvil (botones grandes, texto legible).

---

## 7. ENTREGABLES PARA EL DESARROLLADOR

**Estructura de Proyectos:**
- `frontend/`: Aplicación React (mobile-first).
- `backend/`: API en Node.js + Express + Socket.io.

**Variables de entorno necesarias:**

| Variable | Propósito |
|----------|-----------|
| `DATABASE_URL` | Ruta al archivo `.db` de SQLite. |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` | Configuración del servidor SMTP para correos. |
| `SECRET_KEY` | Clave secreta para JWT/sesiones. |
| `EVENT_DATETIME` | Fecha y hora del evento (formato ISO). |
| `JUDGE_PASSWORD_HASH` | Hash (bcrypt) de la contraseña global para jueces. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` | Credenciales del panel de administración. |
| **MinIO** | |
| `MINIO_ENDPOINT` | Dirección del servidor MinIO (ej. `minio.midominio.com`). |
| `MINIO_PORT` | Puerto (ej. `9000`). |
| `MINIO_ACCESS_KEY` | Access Key de MinIO. |
| `MINIO_SECRET_KEY` | Secret Key de MinIO. |
| `MINIO_BUCKET` | Nombre del bucket para almacenar imágenes/audios (ej. `sandwich-chat`). |
| `MINIO_USE_SSL` | `true` o `false` según configuración. |
| **Umami** | |
| `UMAMI_WEBSITE_ID` | ID del sitio configurado en Umami. |
| `UMAMI_SCRIPT_URL` | URL del script de seguimiento de Umami (ej. `https://umami.midominio.com/script.js`). |

**Modelos de base de datos (SQLite):**
- `Team`: id, name, sandwich_name, captain_email, hashed_password, members (JSON), needs_outlet, needs_airfryer, created_at.
- `Judge`: id, full_name, email, registered_at.
- `ChatMessage`: id, room (global, cooks, judges), sender_name, message_type (text, image, audio), content (texto o URL del archivo en MinIO), timestamp, team_id (FK, nullable).
- `Score`: id, team_id (FK), judge_id (FK), taste, texture, creativity, presentation, bonus, total, revealed (boolean).
- `TodoItem`: id, content_markdown, updated_at.
- `EmailTemplate`: id, type (confirm, reminder_3w, reminder_1w, invite), subject, body_html.

**Implementación de Archivos Multimedia con MinIO:**
- El servidor backend generará **presigned URLs** (válidas por tiempo limitado) para que el frontend (React) suba los archivos directamente al bucket de MinIO, sin pasar por el servidor Node.js. Esto reduce la carga del servidor principal.
- Alternativamente, se puede implementar un proxy en el backend para subir a MinIO, pero la opción de *presigned URLs* es la recomendada por eficiencia.
- Una vez subido el archivo, el frontend envía la URL pública o la ruta del archivo a través de Socket.io para que se guarde en `ChatMessage.content`.
- Límites de tamaño: **Imagen ≤ 5MB**, **Audio ≤ 2MB** (validación tanto en frontend como en backend antes de generar la presigned URL).

