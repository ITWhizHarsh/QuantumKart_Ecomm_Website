-- Drop and recreate the phone_numbers table
DROP TABLE IF EXISTS phone_numbers CASCADE;
CREATE TABLE phone_numbers (
  customer_id INTEGER NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  PRIMARY KEY (customer_id, phone_number),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Drop and recreate addresses table with proper structure
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;

-- Create the addresses table
CREATE TABLE addresses (
  address_id SERIAL PRIMARY KEY,
  house_no VARCHAR(50) NOT NULL,
  locality VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  postcode VARCHAR(20) NOT NULL
);

-- Create the customer_addresses junction table
CREATE TABLE customer_addresses (
  customer_id INTEGER NOT NULL,
  address_id INTEGER NOT NULL,
  PRIMARY KEY (customer_id, address_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_customer_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX idx_customer_addresses_address ON customer_addresses(address_id); 