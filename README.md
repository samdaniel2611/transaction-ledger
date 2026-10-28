# Transaction Ledger

A full-stack transaction ledger system: create accounts, post immutable credit/debit
transactions, read balances and paginated history, and transfer money between accounts —
all with correct validation, atomicity, and duplicate handling.

- **Backend:** Node.js + Express + Mongoose
- **Database:** MongoDB (run as a single-node **replica set** — required for multi-document transactions)
- **Frontend:** Angular 18 (standalone components)

```
transaction-ledger-api/
├── backend/            # Express API
│   └── src/
│       ├── config/     # env + database connection
│       ├── models/     # Mongoose schemas (Account, Transaction)
│       ├── services/   # business logic (atomic transaction & transfer logic)
│       ├── controllers/# thin HTTP handlers
│       ├── routes/     # route definitions
│       ├── middleware/ # async wrapper + central error handler
│       └── utils/      # validators + ApiError
├── frontend/           # Angular SPA
├── docs/
│   └── API.md          # full endpoint reference
├── docker-compose.yml  # single-node MongoDB replica set
├── ASSUMPTIONS.md
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **MongoDB as a replica set.** The easiest path is Docker (provided). Multi-document
  transactions — used for atomic balance updates and money transfers — **require** a
  replica set; a standalone `mongod` will reject them.

---

## 1. Start MongoDB (replica set)

> **Why a replica set?** This app uses MongoDB multi-document transactions for atomic
> balance updates and money transfers. Transactions are only supported on a **replica
> set** — a standalone `mongod` will reject them. A **single-node** replica set is enough
> and works exactly like a normal local MongoDB for everything else.

Pick **one** of the options below.

### Option A — Local MongoDB install (no Docker)

If you installed MongoDB Community Server normally (e.g. running as the `MongoDB`
Windows service), convert it to a single-node replica set **once**:

1. **Enable replication** in the mongod config file
   (`C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg`). Add:

   ```yaml
   replication:
     replSetName: rs0
   ```

2. **Restart MongoDB** so the setting takes effect. In an **Administrator** PowerShell:

   ```powershell
   net stop MongoDB
   net start MongoDB
   ```

   (Or restart the "MongoDB Server" service from `services.msc`.)

3. **Initialise the replica set once** (only the first time) with `mongosh`:

   ```powershell
   mongosh --eval "rs.initiate()"
   ```

   After a few seconds the prompt becomes `rs0 [primary]`. You can confirm with
   `mongosh --eval "rs.status().myState"` → `1` means PRIMARY.

That's it — MongoDB keeps running on `localhost:27017` as usual, and the default
`MONGODB_URI` in `.env.example` already points at it:

```
mongodb://127.0.0.1:27017/transaction_ledger?replicaSet=rs0&directConnection=true
```

> If your local mongosh/driver cannot resolve the replica-set host, keep
> `directConnection=true` in the URI (already set) — it tells the driver to talk to that
> single node directly.

### Option B — Docker (provided compose file)

```bash
docker compose up -d
```

This starts `mongo:7` as replica set `rs0` on `localhost:27017` and auto-runs
`rs.initiate(...)` via the container healthcheck. Wait until it's healthy:

```bash
docker compose ps
```

### Option C — MongoDB Atlas

Atlas clusters are always replica sets. Just set `MONGODB_URI` in `backend/.env` to your
Atlas connection string (no other changes needed).

See [ASSUMPTIONS.md](ASSUMPTIONS.md) for more on the replica-set requirement.

---

## 2. Run the backend

```bash
cd backend
npm install
cp .env.example .env     # Windows PowerShell: copy .env.example .env
npm run dev              # or: npm start
```

The API listens on **http://localhost:4000** (base path `/api`). Health check:
`GET http://localhost:4000/api/health`.

Optional — seed demo data (two accounts + a few transactions):

```bash
npm run seed
```

### Backend environment (`backend/.env`)

| Variable       | Default                                                                                        | Description                                   |
| -------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `PORT`         | `4000`                                                                                          | API port                                      |
| `MONGODB_URI`  | `mongodb://127.0.0.1:27017/transaction_ledger?replicaSet=rs0&directConnection=true`            | MongoDB connection string (replica set)       |
| `CORS_ORIGIN`  | `http://localhost:4200`                                                                         | Allowed frontend origin(s), comma-separated   |

---

## 3. Run the frontend

```bash
cd frontend
npm install
npm start               # ng serve on http://localhost:4200
```

Open **http://localhost:4200**. The API base URL is configured in
`frontend/src/environments/environment.ts` (defaults to `http://localhost:4000/api`).

The SPA lets you: create & list accounts, view a live balance, post credit/debit
transactions (with validation + insufficient-balance / duplicate feedback), browse
transaction history (type filter + pagination, latest-first), and transfer money
between accounts.

---

## API at a glance

| Method | Path                                      | Purpose                                   |
| ------ | ----------------------------------------- | ----------------------------------------- |
| POST   | `/api/accounts`                           | Create account (balance always 0)         |
| GET    | `/api/accounts`                           | List accounts                             |
| GET    | `/api/accounts/:id`                       | Get one account                           |
| GET    | `/api/accounts/:id/balance`               | Get account balance                       |
| POST   | `/api/accounts/:id/transactions`          | Add a credit/debit transaction            |
| GET    | `/api/accounts/:id/transactions`          | Transaction history (filter + pagination) |
| POST   | `/api/transfers`                          | Transfer money between two accounts       |

Full request/response shapes and status codes are in **[docs/API.md](docs/API.md)**.

---

## Key guarantees

- **Initial balance is always 0** and system-generated; any client-supplied balance is ignored.
- **Immutable ledger:** there are no update/delete transaction endpoints.
- **Atomicity:** a transaction (or transfer) and the balance change happen inside one
  MongoDB transaction — if either fails, neither persists.
- **Insufficient-balance debits are rejected** via an atomic conditional update; the
  balance never goes negative and a rejected debit leaves the balance unchanged.
- **Duplicate `reference_id` per account** is a no-op (no new transaction, no balance
  change) and returns the existing transaction — enforced by a compound unique index
  on `{ account_id, reference_id }`. The same `reference_id` may be reused across accounts.
- **History** is latest-first with `page`/`limit` pagination metadata.

---

## Quick smoke test (curl)

```bash
# Create an account (balance forced to 0)
curl -X POST http://localhost:4000/api/accounts -H "Content-Type: application/json" -d '{"name":"Alice"}'

# Credit 100 (use the id returned above)
curl -X POST http://localhost:4000/api/accounts/<id>/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"credit","amount":100,"reference_id":"r1","description":"deposit"}'

# Balance -> 100
curl http://localhost:4000/api/accounts/<id>/balance
```
