# Your Own CRM — Wellness & Spa Practice Management

A full-stack multi-tenant CRM built for wellness and spa businesses.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Angular 18 (standalone), Angular Material |
| Backend | Spring Boot 3.2, Java 17 |
| Database | PostgreSQL 16 |
| Auth | JWT (jjwt 0.12.5), BCrypt |
| Schema | Flyway migrations |

## Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- PostgreSQL 16
- Maven 3.9+

### 1 — Database Setup
```sql
CREATE DATABASE yourowncrm;
CREATE USER yourowncrm WITH PASSWORD 'yourowncrm';
GRANT ALL PRIVILEGES ON DATABASE yourowncrm TO yourowncrm;
GRANT ALL ON SCHEMA public TO yourowncrm;
```
Then run `database/master.sql` in pgAdmin.

### 2 — Backend
```cmd
cd backend
copy src\main\resources\application.yml.template src\main\resources\application.yml
:: Edit application.yml with your DB password and JWT secret
mvn clean spring-boot:run
```
Wait for: `Started YourOwnCrmApplication`

### 3 — Frontend
```cmd
cd frontend
npm install
npm start
```
Open: http://localhost:4200

### Demo Login
| Field | Value |
|---|---|
| Organization | `demo` |
| Username | `admin` |
| Password | `admin123` |

## Features
- **Schedule** — Day/Week calendar, resource & staff columns, appointment booking with SOAP notes
- **Admin** — Staff, Resources, Customers, Visit Types/Statuses, Locations, Working Hours
- **Billing** — Invoices with line items, Payments with invoice linking, Print/receipts
- **Reports** — Daily, Monthly, YTD summaries *(coming soon)*
- **Audit Trail** — created_by, updated_by, deleted_by on all tables

## Project Structure
```
yourowncrm/
├── backend/          Spring Boot backend
├── frontend/         Angular 18 frontend
├── database/         SQL schema and migrations
└── README.md
```

## Branch Strategy
| Branch | Purpose |
|---|---|
| `main` | Stable releases |
| `develop` | Active development |
| `feature/*` | Individual features |

## Changelog
See [CHANGELOG.md](CHANGELOG.md) for full history.
