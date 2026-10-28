# Transaction Ledger — API Reference

Base URL: `http://localhost:4000/api`

All request and response bodies are JSON. Successful responses wrap the payload in a
`data` field. Errors use a consistent envelope (see [Error format](#error-format)).

---

## Conventions

- **Identifiers** (`id`, `account_id`) are UUID strings.
- **Money** is a JSON number. `amount` must be `> 0`.
- **Timestamps** (`created_at`) are ISO-8601 strings, system-generated.

---

## Health

### `GET /health`
`200 OK`
```json
{ "status": "ok", "time": "2026-10-29T10:00:00.000Z" }
```

---

## Accounts

### `POST /accounts` — Create account

Request:
```json
{ "name": "Alice" }
```

- `name` **(required)** — non-empty string.
- Any client-supplied `balance`, `id`, or `created_at` is **ignored**. Balance always
  starts at `0`.

`201 Created`
```json
{
  "data": {
    "id": "3ab6eaa4-c8ac-4685-9731-73ffdf917d1f",
    "name": "Alice",
    "balance": 0,
    "created_at": "2026-10-29T10:00:00.000Z"
  }
}
```

Errors: `422 VALIDATION_ERROR` (missing/empty name).

---

### `GET /accounts` — List accounts

`200 OK`
```json
{ "data": [ { "id": "...", "name": "Alice", "balance": 120, "created_at": "..." } ] }
```

---

### `GET /accounts/:accountId` — Get account

`200 OK` → `{ "data": { "id": "...", "name": "...", "balance": 120, "created_at": "..." } }`

Errors: `404 ACCOUNT_NOT_FOUND`.

---

### `GET /accounts/:accountId/balance` — Get balance

`200 OK`
```json
{ "data": { "account_id": "3ab6eaa4-...", "balance": 120 } }
```

Errors: `404 ACCOUNT_NOT_FOUND`.

---

## Transactions

### `POST /accounts/:accountId/transactions` — Add transaction

Request:
```json
{
  "type": "credit",
  "amount": 100,
  "reference_id": "ref-001",
  "description": "Opening deposit"
}
```

| Field          | Required | Rules                                         |
| -------------- | -------- | --------------------------------------------- |
| `type`         | yes      | `"credit"` or `"debit"`                       |
| `amount`       | yes      | number `> 0`                                  |
| `reference_id` | yes      | non-empty string, **unique per account**      |
| `description`  | no       | string                                        |

**Behaviour**
- **Credit** increases the balance by `amount`.
- **Debit** decreases the balance by `amount`, and is **rejected** if the account has
  insufficient balance (balance unchanged).
- Creating the transaction and updating the balance is a **single atomic operation**.

**Success — new transaction** `201 Created`
```json
{
  "data": {
    "id": "b10e16c0-...",
    "account_id": "3ab6eaa4-...",
    "type": "credit",
    "amount": 100,
    "description": "Opening deposit",
    "reference_id": "ref-001",
    "balance_after": 100,
    "created_at": "2026-10-29T10:00:01.000Z"
  },
  "account": { "id": "3ab6eaa4-...", "balance": 100 },
  "duplicate": false
}
```

**Duplicate `reference_id` for the same account** `200 OK` — no transaction created,
balance unchanged, existing transaction returned:
```json
{
  "data": { "...": "the existing transaction" },
  "account": { "id": "3ab6eaa4-...", "balance": 100 },
  "duplicate": true,
  "message": "A transaction with this reference_id already exists for this account"
}
```

**Errors**

| Status | `code`                  | When                                             |
| ------ | ----------------------- | ------------------------------------------------ |
| 422    | `VALIDATION_ERROR`      | missing/invalid type, amount ≤ 0, missing ref    |
| 404    | `ACCOUNT_NOT_FOUND`     | account does not exist                           |
| 409    | `INSUFFICIENT_BALANCE`  | debit exceeds available balance                  |

---

### `GET /accounts/:accountId/transactions` — Transaction history

Query parameters:

| Param   | Default | Rules                                             |
| ------- | ------- | ------------------------------------------------- |
| `type`  | —       | `credit` or `debit`; omitted → both               |
| `page`  | `1`     | integer ≥ 1                                        |
| `limit` | `20`    | integer 1–100                                     |

Transactions are returned **latest-first** by `created_at`.

`200 OK`
```json
{
  "data": [
    { "id": "...", "account_id": "...", "type": "debit", "amount": 30,
      "description": "", "reference_id": "r3", "balance_after": 70,
      "created_at": "2026-10-29T10:00:02.000Z" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "page_size": 1,
    "total_records": 3,
    "total_pages": 1
  }
}
```

Errors: `404 ACCOUNT_NOT_FOUND`, `422 VALIDATION_ERROR` (bad pagination/type).

> **Immutability:** there are deliberately no endpoints to update or delete a
> transaction. The ledger is append-only.

---

## Transfers (bonus)

### `POST /transfers` — Transfer money between accounts

Request:
```json
{
  "from_account_id": "acc-A",
  "to_account_id": "acc-B",
  "amount": 30,
  "reference_id": "optional-ref",
  "description": "optional note"
}
```

| Field             | Required | Rules                                   |
| ----------------- | -------- | --------------------------------------- |
| `from_account_id` | yes      | existing account, ≠ `to_account_id`     |
| `to_account_id`   | yes      | existing account                        |
| `amount`          | yes      | number `> 0`                            |
| `reference_id`    | no       | auto-generated if omitted               |
| `description`     | no       | string                                  |

The debit from the source and the credit to the destination happen inside **one
MongoDB transaction** — if any part fails (source missing, destination missing,
insufficient balance), the whole transfer is rolled back. A partial transfer is
impossible. Two ledger entries are written (a `debit` on the source, a `credit` on the
destination) sharing the same `reference_id`.

`201 Created`
```json
{
  "data": {
    "reference_id": "transfer-...",
    "amount": 30,
    "from": { "account_id": "acc-A", "balance": 70, "transaction": { "...": "debit leg" } },
    "to":   { "account_id": "acc-B", "balance": 80, "transaction": { "...": "credit leg" } }
  }
}
```

**Errors**

| Status | `code`                  | When                                   |
| ------ | ----------------------- | -------------------------------------- |
| 422    | `VALIDATION_ERROR`      | bad/missing fields, same account       |
| 404    | `ACCOUNT_NOT_FOUND`     | source or destination missing          |
| 409    | `INSUFFICIENT_BALANCE`  | source lacks sufficient balance        |
| 409    | `DUPLICATE_REFERENCE`   | reference already used on an account   |

---

## Error format

Every error returns this envelope with an appropriate HTTP status code:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [ { "field": "amount", "message": "amount is required and must be a number greater than 0" } ]
  }
}
```

`details` is present for validation errors (an array of `{ field, message }`) and for
some conflicts (e.g. `{ balance, requested }` on insufficient balance).

### Status code summary

| Status | Meaning                                    |
| ------ | ------------------------------------------ |
| 200    | OK (incl. idempotent duplicate)            |
| 201    | Created                                    |
| 400    | Malformed request / invalid identifier     |
| 404    | Account or route not found                 |
| 409    | Conflict (insufficient balance, duplicate) |
| 422    | Validation error                           |
| 500    | Unexpected server error                    |
