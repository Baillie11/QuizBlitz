# QuizBlitz – Level 1

A production-ready trivia app targeting **iOS, Android, and Web** from a single codebase.

## Architecture

```
QuizBlitz/
├── backend/    Node.js + Express + MySQL (Sequelize)
└── mobile/     React Native (Expo SDK 51) – iOS, Android & Web
```

## Backend Setup

### Prerequisites
- Node.js 18+ LTS
- MySQL 5.7+ or MariaDB 10.3+ (e.g. via WAMP, MAMP, cPanel, or a cloud DB)

### 1. Create the database

Import the migration file via phpMyAdmin or the MySQL CLI:

```bash
mysql -u root -p < backend/migrations/001_initial_schema.sql
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env – set DB_HOST, DB_NAME, DB_USER, DB_PASS, JWT_SECRET, ADMIN_API_KEY
```

### 3. Install dependencies and seed

```bash
cd backend
npm install
npm run seed
```

This inserts the 4 default categories (General Knowledge, Movies, Music, Sports) and the OpenTDB question source.

### 4. Start the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`.

---

## Mobile / Web Setup

### Prerequisites
- Node.js 18+ LTS
- Expo CLI: `npm install -g expo-cli` (or use `npx expo`)

### 1. Configure environment

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_BASE_URL to your backend URL
# For physical device testing, use your LAN IP e.g. http://192.168.1.100:3000
```

### 2. Install dependencies

```bash
cd mobile
npm install
```

### 3. Run

```bash
npm start          # Expo Go / dev client
npm run android    # Android emulator
npm run ios        # iOS simulator (macOS only)
npm run web        # Browser at http://localhost:8081
```

---

## Admin API

All admin endpoints require the `X-Admin-Api-Key` header matching `ADMIN_API_KEY` in your `.env`.

### Ingest questions

```bash
# Ingest 50 Sports questions of any difficulty
curl -X POST http://localhost:3000/admin/ingest \
  -H "Content-Type: application/json" \
  -H "X-Admin-Api-Key: admin_secret_change_me" \
  -d '{"category":"sports","amount":50}'

# Ingest 30 Easy Music questions
curl -X POST http://localhost:3000/admin/ingest \
  -H "Content-Type: application/json" \
  -H "X-Admin-Api-Key: admin_secret_change_me" \
  -d '{"category":"music","difficulty":"easy","amount":30}'
```

### View question counts

```bash
curl http://localhost:3000/admin/stats \
  -H "X-Admin-Api-Key: admin_secret_change_me"
```

---

## API Reference

| Method | Endpoint           | Auth     | Description                             |
|--------|--------------------|----------|-----------------------------------------|
| POST   | /auth/register     | –        | Create account                          |
| POST   | /auth/login        | –        | Login, returns JWT                      |
| GET    | /auth/me           | JWT      | Get current user                        |
| PUT    | /auth/me           | JWT      | Update displayName / adOptOut / prefs   |
| GET    | /categories        | –        | List categories                         |
| GET    | /config            | –        | Server feature flags                    |
| POST   | /game/start        | Optional | Start game – returns questions          |
| POST   | /game/submit       | Optional | Save game session                       |
| POST   | /admin/ingest      | Admin key | Ingest questions from OpenTDB          |
| GET    | /admin/stats       | Admin key | Question counts per category           |
| GET    | /health            | –        | Health check                            |

---

## Environment Variables

### backend/.env

| Variable           | Description                                   | Default                  |
|--------------------|-----------------------------------------------|--------------------------|
| PORT               | Server port                                   | 3000                     |
| DB_HOST            | MySQL host                                    | localhost                |
| DB_PORT            | MySQL port                                    | 3306                     |
| DB_NAME            | Database name                                 | quizblitz                |
| DB_USER            | MySQL username                                | root                     |
| DB_PASS            | MySQL password                                | (empty)                  |
| JWT_SECRET         | Secret for signing JWTs                       | **change this**          |
| JWT_EXPIRES_IN     | JWT expiry                                    | 7d                       |
| TRIVIA_API_BASE_URL| OpenTDB base URL                              | https://opentdb.com      |
| ADS_ENABLED        | Master ads switch (server-side)               | true                     |
| PREMIUM_ENABLED    | Enable premium flow in UI                     | false                    |
| ADMIN_API_KEY      | Key for /admin/* endpoints                    | **change this**          |

### mobile/.env

| Variable                  | Description          |
|---------------------------|----------------------|
| EXPO_PUBLIC_API_BASE_URL  | Backend URL          |

---

## What's in Level 1

- ✅ User accounts (register, login, JWT, profile)
- ✅ 4 categories: General Knowledge, Movies, Music, Sports
- ✅ Questions fetched from Open Trivia DB and persisted to MySQL
- ✅ Auto-ingest on game start if not enough local questions
- ✅ SHA-256 dedup – never stores duplicate questions
- ✅ Gameplay: 10 questions, immediate correct/wrong feedback, results screen
- ✅ Ad placeholders (banner + interstitial) wired to server flag + user flags
- ✅ Settings screen: Free/Premium badge, ad opt-out toggle, Go Premium placeholder
- ✅ Guest play (no account required to start a game)
- ✅ Admin API: ingest by category/difficulty, question count stats

## What's coming in Level 2

- 💳 In-app purchases / Stripe for premium
- 📢 Real ad SDK (AdMob / AppLovin MAX)
- 🏆 Leaderboards
- 🔔 Push notifications
- 📊 Per-question result breakdown
