-- Drop dependencies (foreign key constraints in orders)
ALTER TABLE IF EXISTS orders DROP CONSTRAINT IF EXISTS orders_address_id_fkey;

-- Create a backup of the addresses table
CREATE TABLE IF NOT EXISTS addresses_backup AS SELECT * FROM addresses;

-- Drop dependencies first with CASCADE
DROP TABLE IF EXISTS addresses CASCADE;

-- Create the addresses table with the correct structure
CREATE TABLE addresses (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  house_no VARCHAR(50) NOT NULL,
  locality VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Create a unique constraint for customer addresses
CREATE UNIQUE INDEX addresses_customer_fields_idx ON addresses 
  (customer_id, house_no, locality, city, country);

-- Update orders table to reference address by ID
ALTER TABLE orders 
  ADD COLUMN temp_address_id INTEGER DEFAULT NULL;

-- Add indexes for improved query performance
CREATE INDEX addresses_customer_id_idx ON addresses(customer_id);

-- Create the phone_numbers table if it doesn't exist
CREATE TABLE IF NOT EXISTS phone_numbers (
  customer_id INTEGER NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  PRIMARY KEY (customer_id, phone_number),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
); 