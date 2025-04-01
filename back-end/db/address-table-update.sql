-- First, backup existing addresses data if needed
CREATE TABLE address_backup AS SELECT * FROM addresses;

-- Drop dependencies (foreign key constraints)
ALTER TABLE IF EXISTS orders DROP CONSTRAINT IF EXISTS orders_address_id_fkey;

-- Drop the existing addresses table
DROP TABLE addresses;

-- Create the new addresses table with composite primary key
CREATE TABLE addresses (
  user_id INTEGER NOT NULL,
  house_no VARCHAR(50) NOT NULL,
  locality VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  postcode VARCHAR(20) NOT NULL,
  PRIMARY KEY (user_id, house_no, locality, city, country),
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Modify the orders table to reference composite address
ALTER TABLE orders 
  DROP COLUMN IF EXISTS address_id;

-- Add composite address reference columns to orders
ALTER TABLE orders 
  ADD COLUMN user_address_id INTEGER,
  ADD COLUMN house_no VARCHAR(50),
  ADD COLUMN locality VARCHAR(100),
  ADD COLUMN city VARCHAR(100),
  ADD COLUMN country VARCHAR(100),
  ADD FOREIGN KEY (user_address_id, house_no, locality, city, country) 
    REFERENCES addresses(user_id, house_no, locality, city, country);

-- You would need a data migration script here to migrate existing address data
-- For example:
-- INSERT INTO addresses (user_id, house_no, locality, city, country, postcode)
-- SELECT customer_id, '123', 'Main Area', 'Some City', 'Some Country', postcode
-- FROM address_backup;

-- Comment out the above data migration if not needed yet 