# 💪 Personalizados — PWA para Entrenador Personal (Perú)

App web **mobile-first** conectada a **Supabase** para que un entrenador personal en Perú gestione sus clientes: rutinas, planes de alimentación, progreso, check-ins, pagos (Yape/Plin) y un **asistente IA con Claude** que crea rutinas automáticamente.

---

## ✨ Features

### Para el entrenador
- 📊 Dashboard con KPIs (clientes activos, ingresos del mes, check-ins, pagos)
- 👥 Gestión de clientes con códigos de invitación
- 🏋️ Editor de rutinas y planes de alimentación
- ✨ **Chat con Claude AI** — "crea rutina hipertrofia para Juan, 4 días" → Claude genera JSON estructurado → revisas → publicas con 1 tap
- 💳 Cola de pagos Yape/Plin con validación de 1 tap

### Para el cliente
- 📅 "Hoy": rutina del día + comidas + CTA de check-in
- 🏋️ Rutina semanal completa
- 📊 Registro de peso y medidas con gráficas
- ✅ Check-in diario (agua, sueño, ánimo, energía, adherencia)
- 💳 Estado de pagos + datos Yape/Plin del coach

### General
- 🇵🇪 Idioma y moneda peruana (soles)
- 📱 PWA instalable en iOS y Android
- 🗄️ Datos en **Supabase Postgres** (gratis hasta 500MB)
- 🌱 Seed con datos demo (3 clientes + 60 ejercicios)

---

## 🚀 Setup (5 minutos)

### 0. Requisitos
- **Node.js 20 LTS** (Node 22+ puede dar problemas con dependencias nativas)
- Una cuenta de **Supabase** (gratis): https://supabase.com

### 1. Instalar dependencias

```bash
npm install --legacy-peer-deps
```

### 2. Configurar Supabase

Tu proyecto de Supabase ya está creado. Solo necesitas la **password de la DB**:

1. Ve a https://supabase.com/dashboard/project/icvlsomduevfnydwjnvl/settings/database
2. En **Connection string → URI**, copia el string (reemplaza `[YOUR-PASSWORD]` con tu password)
3. Pégalo en `.env` como `DATABASE_URL`

### 3. Configurar `.env`

```bash
cp .env.example .env
```

Edita `.env` y configura:

```env
# Tu API key de Anthropic (https://console.anthropic.com/)
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-sonnet-4-5-20250929"

# Connection string de tu Supabase (con la password)
DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.icvlsomduevfnydwjnvl.supabase.co:5432/postgres"

# Ya configurado para tu proyecto:
NEXT_PUBLIC_SUPABASE_URL="https://icvlsomduevfnydwjnvl.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_jUatnxtFmyYLM-AXAmHGBA_wvSJX1bU"
```

### 4. Crear tablas y sembrar datos

```bash
npm run db:migrate   # crea las tablas en Supabase
npm run db:seed      # crea entrenador demo + 3 clientes + catálogo
```

### 5. Iniciar

```bash
npm run dev
```

Abre http://localhost:3000

---

## 🔑 Credenciales demo

### Entrenador
- URL: http://localhost:3000/login
- Email: `entrenador@personalizados.pe`
- Password: `entrenador123`

### Clientes (códigos que imprime el seed)
- `JP-XXXX` (Juan Pérez, hipertrofia, intermedio)
- `ML-XXXX` (María López, pérdida de grasa, principiante)
- `CR-XXXX` (Carlos Ramos, fuerza, avanzado)

---

## 💸 Costos mensuales

| Concepto | Costo |
|----------|-------|
| **Supabase** (Free tier: 500MB DB, 1GB storage, 50K MAU) | S/ 0 |
| **Anthropic Claude** (Sonnet 4.5) | ~S/ 5-15 |
| **Vercel** (Hosting free hasta 100GB bw, opcional en dev) | S/ 0 |
| **TOTAL MVP** | **< S/ 20/mes** |

> A medida que crezcas (>500MB DB o >50K clientes), Supabase Pro cuesta **~$25 USD/mes** e incluye 8GB DB.

---

## 🏗️ Arquitectura

```
Next.js 14 (App Router) + TypeScript
├── Tailwind CSS (mobile-first)
├── Drizzle ORM + Supabase Postgres (vía postgres-js)
├── Anthropic SDK (Claude)
└── Recharts (gráficas)
```

```
app/
├── (auth)/login              → trainer
├── /portal                   → cliente (login con código)
├── /trainer
│   ├── /                     → dashboard
│   ├── /clientes
│   ├── /clientes/[id]        → tabs: rutina | nutrición | progreso | check-in
│   ├── /ia                   → ⭐ chat Claude
│   └── /pagos
├── /portal
│   ├── /hoy                  → pantalla principal cliente
│   ├── /rutina
│   ├── /checkin
│   ├── /progreso
│   └── /pagos
└── api/
    ├── ai/chat               → POST a Claude con tool_use
    ├── ai/publish            → guarda JSON de Claude en Supabase
    ├── auth/                 → login, logout, client-login
    ├── trainer/pagos/validate
    └── client/checkin, progress
```

---

## 🤖 Cómo funciona el chat IA

```
1. Coach abre /trainer/ia, selecciona cliente
2. Escribe: "Crea rutina hipertrofia para Juan, 4 días"
3. Backend llama a Claude con:
   - System prompt (rol, reglas, terminología peruana)
   - tool: create_routine (schema JSON estricto)
   - Catálogo de 60 ejercicios disponibles
4. Claude decide: ¿preguntar más? ¿o generar?
5. Si genera: tool_use con JSON estructurado
6. Frontend muestra Preview editable
7. Coach ajusta → click "Publicar a Juan"
8. Backend guarda en Supabase:
   - routines (isActive=true)
   - routine_days (lun-mar-mié...)
   - routine_exercises (con sus sets/reps/peso)
9. Juan ve la rutina en su app al instante 📱
```

### Por qué `tool_use` (no prompt JSON)

Claude con `tool_use` (function calling nativo) **garantiza** que el JSON devuelto cumple el schema. Sin esto, tendrías que parsear texto libre y rezar.

---

## 🗄️ Esquema de base de datos

13 tablas principales en Supabase Postgres:

- `users` — autenticación (trainer/client)
- `clients` — datos fitness del cliente
- `exercises` — catálogo (~60 ejercicios)
- `routines` + `routine_days` + `routine_exercises` — rutina semanal anidada
- `meal_plans` + `meals` — plan alimenticio
- `progress_entries` — peso y medidas
- `daily_checkins` — check-in diario
- `payments` — pagos Yape/Plin
- `ai_chat_sessions` + `ai_chat_messages` — auditoría IA

Ver SQL completo en `scripts/migrate.ts`.

---

## 🇵🇪 Cosas específicas para Perú

| Tema | Cómo se maneja |
|------|----------------|
| Idioma | `lang="es-PE"`, terminología peruana |
| Moneda | `Intl.NumberFormat('es-PE', { currency: 'PEN' })` |
| Yape/Plin | **Sin API oficial.** Flujo: trainer genera código → cliente paga → sube screenshot → trainer valida. Esta versión envía comprobante por WhatsApp. |
| Comidas | El system prompt incluye comidas típicas peruanas |
| Timezone | Supabase + Next.js usan UTC. Vercel Cron debe usar `TZ=America/Lima`. |
| Datos sensibles | Ley 29733: añadir consentimiento explícito antes de producción. |

---

## 🛡️ Seguridad

- **RLS opcional**: Como usamos auth propia (cookies firmadas), la app SIEMPRE valida trainer/client con `requireTrainer()` / `requireClient()` en cada endpoint. Eso ya filtra por dueño.
- Para **defense-in-depth**, hay un script SQL opcional: `scripts/setup-rls.sql` que activa RLS y crea policies.
- **Anthropic API key** solo server-side (env var). Cliente nunca la ve.
- **Passwords** hasheados con SHA256 + salt (suficiente para MVP; migrar a bcrypt/argon2 antes de producción).

---

## 🚀 Deploy a Vercel (gratis)

1. Sube tu repo a GitHub (NO commitees `.env`)
2. Importa en https://vercel.com
3. Configura las env vars (las mismas de `.env`)
4. Deploy. Cada push redeploya.

**Para Vercel, considera**:
- Migrar la DB de postgres-js a **Supabase connection pooler** (modo transaction, puerto 6543) para serverless
- O usar **Vercel Postgres** si prefieres no usar Supabase

---

## 🛣️ Roadmap

### ✅ MVP (este repo)
- [x] Auth separada (trainer/cliente)
- [x] CRUD clientes + códigos de invitación
- [x] CRUD rutinas manuales + vista cliente
- [x] Chat con Claude IA
- [x] Pagos Yape/Plin (manual con WhatsApp)
- [x] Check-in diario
- [x] Progreso con gráficas
- [x] Conectado a Supabase Postgres

### 🔜 V2 (próximas features)
- [ ] Upload real de comprobantes (Supabase Storage)
- [ ] Push notifications (Vercel Cron + Web Push)
- [ ] Modo offline (Service Worker + IndexedDB)
- [ ] Editor manual de rutinas (UI drag & drop)
- [ ] Exportar PDF de rutina para WhatsApp
- [ ] Activar RLS con policies estrictas

### 🚀 V3 (cuando valides)
- [ ] Multi-entrenador (SaaS)
- [ ] Integración con wearables
- [ ] Catálogo de videos de ejercicios
- [ ] Chat trainer↔cliente

---

## 📝 Comandos útiles

```bash
npm run dev            # servidor de desarrollo
npm run build          # build producción
npm run start          # corre el build

npm run db:migrate     # crea tablas en Supabase
npm run db:seed        # datos demo
npm run db:reset       # BORRA TODO y re-siembra (⚠️ dev only)
```

---

## 📜 Licencia

MIT — úsalo, modifícalo, véndelo. Sin restricciones.

---

Hecho con ❤️ en Perú 🇵🇪