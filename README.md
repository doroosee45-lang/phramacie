# 🏥 PharmaERP — Système de Gestion Pharmaceutique
## Stack MERN · Production-Ready · PWA Offline

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js >= 18.x
- MongoDB >= 6.x (local ou Atlas)
- npm >= 9.x

---

## 📦 Installation

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Éditez .env avec vos valeurs
npm run seed      # Peupler la base avec les données de démo
npm run dev       # Démarrer en développement (port 5000)
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev       # Démarrer en développement (port 3000)
```

### 3. Accéder à l'application
Ouvrir : **http://localhost:3000**

---

## 🔑 Comptes de Démonstration

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `admin` | `Admin123!` | Super Administrateur |
| `depot` | `Depot123!` | Dépôt Manager |
| `pharmacist` | `Pharma123!` | Pharmacien |
| `cashier` | `Cash123!` | Caissier |

---

## 🏗 Architecture du Projet

```
pharmaerp/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js       ← Auth JWT + MFA
│   │   ├── productController.js    ← CRUD produits + stock
│   │   ├── saleController.js       ← POS + FIFO + loyauté
│   │   ├── dashboardController.js  ← KPIs + graphiques
│   │   └── analyticsController.js  ← IA Claude + prédictions
│   ├── middleware/
│   │   ├── authMiddleware.js       ← protect + authorize
│   │   └── errorMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js              ← Multi-lots + FIFO
│   │   ├── Sale.js                 ← POS complet
│   │   ├── Order.js                ← Bons de commande
│   │   ├── Client.js               ← Fidélité Bronze/Argent/Or
│   │   ├── Prescription.js
│   │   ├── Invoice.js
│   │   ├── Alert.js
│   │   └── StockMovement.js
│   ├── routes/                     ← 10 modules REST
│   ├── services/
│   │   └── socketService.js        ← WebSocket temps réel
│   ├── utils/
│   │   ├── logger.js               ← Winston
│   │   ├── tokenUtils.js           ← JWT helpers
│   │   └── seeder.js               ← Données démo
│   └── server.js                   ← Express + Socket.io
│
└── frontend/
    ├── public/
    │   └── sw.js                   ← Service Worker PWA
    └── src/
        ├── components/
        │   └── common/
        │       └── Layout.jsx      ← Sidebar + Topbar + Socket
        ├── contexts/
        │   └── authStore.js        ← Zustand auth
        ├── pages/
        │   ├── LoginPage.jsx       ← Auth + MFA
        │   ├── DashboardPage.jsx   ← KPIs + Charts Chart.js
        │   ├── StockPage.jsx       ← Inventaire + alertes
        │   ├── POSPage.jsx         ← Caisse tactile complète
        │   ├── OrdersPage.jsx      ← Bons de commande
        │   ├── SuppliersPage.jsx
        │   ├── ClientsPage.jsx     ← Fidélité + historique
        │   ├── PrescriptionsPage.jsx
        │   ├── InvoicesPage.jsx
        │   ├── AnalyticsPage.jsx   ← IA + prédictions
        │   ├── AlertsPage.jsx
        │   └── UsersPage.jsx       ← Gestion comptes
        ├── services/
        │   ├── api.js              ← Axios + intercepteurs
        │   ├── offlineDB.js        ← Dexie.js IndexedDB
        │   └── socketService.js    ← Socket.io client
        ├── App.jsx                 ← Router React
        └── main.jsx                ← Entrée + QueryClient
```

---

## 🔧 Variables d'Environnement (.env)

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pharmaerp
JWT_SECRET=your_256_bit_secret_key_here
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d
CLAUDE_API_KEY=sk-ant-xxxxx          # Anthropic Claude API
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:3000
```

---

## 📱 Fonctionnalités Clés

### 🏪 Point de Vente (POS)
- Interface tactile optimisée, raccourcis clavier (F2 recherche, F8 encaisser)
- Gestion panier temps réel avec FIFO automatique des lots
- 5 modes de paiement (espèces, carte, mobile money, chèque, crédit)
- Association client fidélité + cumul automatique des points
- Mode hors-ligne complet via IndexedDB (Dexie.js)
- Rendu monnaie automatique

### 📦 Gestion Stock
- Multi-lots avec numéros de lot et dates de péremption
- Alertes automatiques J-90, J-30, J-7 péremption
- FIFO automatique sur les sorties
- Inventaire avec calcul des écarts
- Mouvements de stock tracés

### 🤖 Intelligence Artificielle (Claude API)
- Suggestions de génériques lors de la vente
- Prévision de rupture de stock J+15 basée sur la consommation
- Détection d'anomalies de facturation (prix, doublons)
- Suggestions de réapprovisionnement optimisées

### 📡 Temps Réel (Socket.io)
- Alertes push instantanées (rupture, péremption, fraude)
- Synchronisation multi-postes en temps réel
- Indicateur online/offline
- Sync automatique des ventes hors-ligne à la reconnexion

### 🔐 Sécurité
- JWT + Refresh token (24h/7j)
- MFA obligatoire TOTP (Google Authenticator) pour admin
- Rate limiting (5 tentatives/15min)
- bcrypt salt rounds 12
- Audit trail complet

---

## 🚢 Production

### Build
```bash
cd frontend && npm run build
cd ../backend && NODE_ENV=production npm start
```

### PM2
```bash
npm install -g pm2
pm2 start backend/server.js --name pharmaerp --instances max
pm2 save && pm2 startup
```

### Nginx (reverse proxy)
```nginx
server {
    listen 80;
    server_name pharmaerp.votredomaine.com;

    location /api { proxy_pass http://localhost:5000; }
    location /socket.io { proxy_pass http://localhost:5000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }
    location / { root /var/www/pharmaerp/frontend/dist; try_files $uri /index.html; }
}
```

---

## 📊 API Endpoints

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Connexion |
| GET | `/api/products` | Liste produits |
| GET | `/api/products/search?q=` | Recherche POS |
| POST | `/api/sales` | Créer vente |
| GET | `/api/dashboard/kpis` | KPIs tableau de bord |
| GET | `/api/analytics/rupture-forecast` | Prévisions IA |
| POST | `/api/analytics/ai-suggest` | Claude API |
| GET | `/api/alerts` | Alertes actives |

---

## 🧪 Tests Rapides

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'

# Products (avec token)
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

*PharmaERP v1.0 · Architecture MERN · Production-Ready*
*Développé avec Node.js, Express, MongoDB, React 18, Socket.io, Dexie.js, Claude AI*
