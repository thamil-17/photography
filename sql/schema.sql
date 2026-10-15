CREATE DATABASE IF NOT EXISTS photography_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE photography_studio;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS photographers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  specialty VARCHAR(100) NOT NULL DEFAULT 'General Photography',
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT,
  duration_hours DECIMAL(4,1) NOT NULL DEFAULT 2,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150),
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  service_id INT NOT NULL,
  photographer_id INT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL DEFAULT '09:00:00',
  location VARCHAR(255),
  notes TEXT,
  status ENUM('Pending','Confirmed','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_photographer FOREIGN KEY (photographer_id) REFERENCES photographers(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('Cash','Card (Demo)','Bank Transfer (Demo)') NOT NULL DEFAULT 'Cash',
  status ENUM('Pending','Paid','Failed','Refunded') NOT NULL DEFAULT 'Pending',
  reference_code VARCHAR(40) NOT NULL UNIQUE,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

INSERT INTO services (name,category,description,duration_hours,price) VALUES
('Wedding Photography','Wedding','Wedding day coverage and edited photos',8,75000),
('Portrait Session','Portrait','Individual or family portrait session',2,12000),
('Birthday Event','Event','Birthday party photography coverage',4,25000),
('Graduation Package','Graduation','Graduation portraits and event coverage',3,18000),
('Outdoor Photography','Outdoor','Outdoor portrait session at a selected location',2,15000)
ON DUPLICATE KEY UPDATE name=VALUES(name);
