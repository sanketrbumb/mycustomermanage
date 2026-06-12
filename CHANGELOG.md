# Changelog
All notable changes to Your Own CRM are documented here.
Format: [Version] — Date — Description

---

## [1.3.0] — 2026-06-10 — Billing Module

### Added
- **Invoices screen** (`/billing/invoices`)
  - KPI stats bar: Total Invoices, Gross Billed, Collected, Outstanding
  - Invoice list with filters: search, status, date range
  - Invoice detail modal: customer autocomplete, line items, discount (none/pct/flat)
  - Live totals: Gross → Discount → Net → Paid → Balance Due
  - Quick Pay modal: amount, method, reference
  - Print invoice to new browser window
- **Payments screen** (`/billing/payments`)
  - Payments grouped by date with day totals
  - Add Payment modal: customer search, invoice picker, method, reference
  - Invoice Picker: searchable/filterable table with checkboxes, running balance
  - Payment Receipt modal with print support
  - Method pills: Card/Cash/Check/Online/ACH
- **BillingService** — full CRUD for invoices and payments, report endpoints

---

## [1.2.0] — 2026-06-10 — Schedule Module

### Added
- Day view calendar with resource and staff columns
- Mini-calendar with gold dots on appointment days
- Resource and staff sidebar checklists (opt-in/opt-out)
- Appointment booking dialog with customer autocomplete
- Availability check with conflict warning
- SOAP Notes dialog (Subjective/Objective/Assessment/Plan, Treatment, Additional Charges)
- All Visits dialog — patient full history with filters
- Right-click context menu (Edit, Visit Notes, Cancel)
- Visit status pre-selection on reopen (fixed)
- Sticky sidebar state across navigation
- Auto-refresh every 2 minutes

### Fixed
- Angular Material dialog centering (CDK overlay at body level)
- `aria-hidden` focus conflict blocking dialog open
- Staff/resource columns disappearing on navigation return
- Double-open prevention

---

## [1.1.0] — 2026-06-09 — Admin Module UAT Fixes

### Added
- Status filter (Active/Inactive) on Staff list
- Charge code dropdown on Visit Types
- DOB max=today on Customer form
- Resource Hours: checkbox-based day selection, single Add button
- Audit columns on all tables: `created_by`, `updated_by`, `deleted_by`, `deleted_at`
- V2: `appointment_notes` table (SOAP notes)
- V3: Audit columns migration
- V4: `created_by` on all master tables

### Fixed
- Staff `active` and `canBookAppts` flags not saving (missing from UserServiceImpl.update)
- Resources showing 500 (lazy-loading @JsonIgnoreProperties fix)
- Visit Status blank on appointment reopen (timing fix — patch after statuses load)
- `email NOT NULL` violation (made optional in DB and backend)
- `CHAR` vs `VARCHAR` type mismatch on `color_hex` columns
- Duplicate class errors (`AppointmentServiceImpl`, `BillingServiceImpl` in wrong folders)
- `UserController.create()` wrong argument order

---

## [1.0.0] — 2026-06-07 — Initial Full-Stack Build

### Added
- **Database**: 17-table PostgreSQL schema with Flyway migrations
- **Backend**: Spring Boot 3.2 + Java 17
  - JWT authentication with BCrypt password hashing
  - Brute-force lockout (5 attempts → locked)
  - Appointment availability check (schedule hours + double-booking)
  - Billing service: invoice generation, payment allocation
  - Reports: daily/monthly/YTD summaries
- **Frontend**: Angular 18 standalone
  - Login with JWT
  - Shell with sidebar navigation
  - Admin screens: Staff, Resources, Customers, Visit Types, Statuses, Locations, Hours, Settings
- **Design**: jade/stone/gold design system, Cormorant Garamond + DM Sans

### Security
- Inactive staff cannot log in
- Inactive staff/resources blocked from booking
- Inactive customers blocked from invoices and payments

---

## [0.9.1] — 2026-06-06 — HTML Prototype Final

### Fixed
- `buildCalendar` call stack overflow
- `DAYS` duplicate declaration
- Conflict display showing `[object Object]`
- Staff columns not updating when toggled

---

## [0.9.0] — 2026-06-06 — HTML Prototype

### Added
- Complete single-page HTML prototype (10 files)
- Schedule: day view, week view, resource/staff columns
- Admin: staff, resources, visit types, statuses, customers, locations, hours
- Billing: invoices, payments, refunds
- Reports: daily/monthly/YTD
- Design system: serenity-shared.css
