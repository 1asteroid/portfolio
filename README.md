# Portfolio Fullstack

Bu loyiha endi haqiqiy server-side SQL database bilan ishlaydi. Public sahifa backend API dan ma'lumot oladi, admin panel esa to'liq CRUD, upload va project blog/case-study kontentini boshqaradi.

## To'liq Papka Tuzilishi

```text
portfolio/
├── admin.html          # Admin panel UI
├── css/
│   ├── admin.css       # Admin panel stillari
│   └── style.css       # Public sahifa stillari
├── data/
│   ├── portfolio.db    # SQLite database (runtime da yaratiladi)
│   └── site.json       # Dastlabki seed ma'lumot
├── index.html          # Bosh sahifa
├── js/
│   ├── admin.js        # Admin CRUD + upload + editor logikasi
│   └── main.js         # Public sahifa render logikasi
├── project.html        # Project blog / case-study detail page
├── server/
│   ├── auth.js         # JWT auth helperlar
│   ├── db-schema.sql   # SQLite schema
│   ├── db.js           # SQL access layer
│   └── helpers.js      # Payload normalize helperlar
├── server.js           # Express app entry point
├── uploads/            # Yuklangan rasmlar
├── package.json        # Dependencies va scripts
├── .env.example        # Production environment namuna
└── README.md          # Hujjat
```

## Stack

- Backend: Node.js + Express
- Database: SQLite (`better-sqlite3`)
- Auth: JWT
- Uploads: local `uploads/`
- Frontend: HTML + CSS + Vanilla JS

## Project modeli

Projectlar hozir quyidagi maydonlarni saqlaydi:
- `title`
- `category`
- `summary`
- `imageUrl`
- `content` (Markdown blog/case study)
- `metrics`
- `stack`
- `links`
- `featured`

## Ishga tushirish

```bash
npm install
npm run dev
```

Production:

```bash
npm start
```

Server default `http://localhost:4000` da ishlaydi.

## Muhim URL lar

- Public site: `http://localhost:4000/`
- Project detail: `http://localhost:4000/project?id=project-churn`
- Admin panel: `http://localhost:4000/admin`
- Health check: `http://localhost:4000/api/health`

## Admin CRUD

Admin panel orqali:
- Profile update
- Stats update
- Skills CRUD
- Projects CRUD
- Links CRUD (social/contact)
- Image upload
- Project markdown content yaratish va edit qilish
- Upload qilingan rasm path ni content ichiga Markdown image sifatida kiritish

## API qisqa ro'yxati

- `GET /api/public/site`
- `POST /api/admin/login`
- `GET /api/admin/site`
- `PUT /api/admin/profile`
- `PUT /api/admin/stats`
- `POST /api/admin/upload`
- `GET /api/admin/:collection`
- `POST /api/admin/:collection`
- `PUT /api/admin/:collection/:id`
- `DELETE /api/admin/:collection/:id`

Collection qiymatlari:
- `skills`
- `projects`
- `socialLinks`
- `contactLinks`

## Production tavsiyalari

- `.env` ni serverda saqlang va kuchli `JWT_SECRET` ishlating
- Nginx reverse proxy + HTTPS qo'ying
- `uploads/` va `data/portfolio.db` ni backup qiling
- Agar katta trafik bo'lsa S3/object storage va alohida DB serverga o'ting
