# Photography Studio Management System

A student project for Practical 01 and Practical 02 using HTML5, CSS3, JavaScript, jQuery, AJAX, Node.js, Express.js and MySQL.

## Features

### Public website
- Responsive home page, services/packages, gallery, studio information and contact section
- Live services loaded from the Express API with jQuery/AJAX
- Booking request form with validation
- Booking creates/updates a customer and saves the booking in MySQL

### Admin system
- First-admin setup and login/logout
- Passwords hashed using bcrypt
- Session-based protected admin API routes
- Dashboard totals and recent bookings
- CRUD for services/packages, customers and photographers
- Search/filter for records and bookings
- Booking status updates and photographer assignment
- Booking and payment reports
- Mock payment records (no real payments or card processing)

## Requirements
- Node.js 18+ (recommended)
- MySQL 8+ (or compatible MySQL/MariaDB)
- Internet access while viewing the site if you want the Google Fonts, jQuery CDN, and sample Unsplash images to load. For fully offline use, download/localize these assets and use a local jQuery file.

## Installation

1. Install Node.js and MySQL.
2. Create the database and tables by importing `sql/schema.sql` in MySQL Workbench or running:

   ```bash
   mysql -u root -p < sql/schema.sql
   ```

3. In the project folder, install packages:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env` and update `DB_USER`, `DB_PASSWORD`, and `SESSION_SECRET`.
5. Start the application:

   ```bash
   npm start
   ```

6. Open `http://localhost:3000`.
7. Choose **Admin Login**. On first use, if no administrator exists, the first-admin setup form will appear. Create an administrator with a valid email and a password of at least 8 characters.
8. Log in and manage services, customers, photographers, bookings, and reports.

## Important notes
- The `.env` file is local configuration and should not be committed or shared.
- The default session store is Express's in-memory store, suitable for a classroom demo only. Use a persistent session store and HTTPS for production.
- Mock payment is a record-keeping demonstration only. It does not connect to a bank or charge a card.
- The app logs database connection problems in the terminal. If the website loads but API data fails, verify that MySQL is running and `.env` matches your database.
- The database seed inserts sample photography packages. Additional customers, photographers, bookings, and payments are added through the app.

## Main routes

| Route | Purpose |
|---|---|
| `/` | Public studio website |
| `/login` | Admin login and first-admin setup |
| `/admin` | Protected admin dashboard page |
| `GET /api/public/services` | List active public packages |
| `POST /api/public/bookings` | Submit booking request |
| `/api/admin/services` | Service/package CRUD |
| `/api/admin/customers` | Customer CRUD |
| `/api/admin/photographers` | Photographer CRUD |
| `/api/admin/bookings` | Booking management |
| `/api/admin/reports` | Booking and payment reports |

## Practical assessment mapping

### Practical 01 (30 marks)
- Semantic HTML pages and forms
- Responsive CSS layout using Grid/Flexbox and media queries
- JavaScript interactions and DOM updates
- Client-side required-field checks and server-side validation
- jQuery effects/events and AJAX API calls
- Node.js + Express routes and JSON API
- MySQL CRUD for services, customers and photographers; booking creation and listing

### Practical 02 (20 marks)
- Login/logout and protected admin API
- bcrypt password hashing
- Input validation and session-protected routes
- Search/filter, dashboard improvements and reports
- Additional payment records and workflow
- This README as project documentation

## Viva preparation
Be ready to explain: each table and its relationships; the CRUD operations; how AJAX sends requests without a full page refresh; why passwords are hashed; how session middleware protects admin routes; how booking data links customers, services, photographers and payments; and why payment is marked as demo only.
