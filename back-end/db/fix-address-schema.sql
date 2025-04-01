-- Begin transaction to ensure consistent state
BEGIN;

-- Create customer_addresses table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_addresses (
  customer_id INTEGER NOT NULL,
  address_id INTEGER NOT NULL,
  PRIMARY KEY (customer_id, address_id)
);

-- Make sure the addresses table has the correct structure
DO $$
BEGIN
  -- Check if we need to migrate from old structure
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'addresses' AND column_name = 'customer_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'addresses' AND column_name = 'address_id'
  ) THEN
    -- We need to migrate from the old structure
    
    -- Create a backup
    CREATE TABLE addresses_backup AS SELECT * FROM addresses;
    
    -- Drop the old addresses table
    DROP TABLE addresses CASCADE;
    
    -- Create the new addresses table
    CREATE TABLE addresses (
      address_id SERIAL PRIMARY KEY,
      house_no VARCHAR(50) NOT NULL,
      locality VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL,
      country VARCHAR(100) NOT NULL,
      postcode VARCHAR(20) NOT NULL
    );
    
    -- Create the customer_addresses junction table if needed
    CREATE TABLE IF NOT EXISTS customer_addresses (
      customer_id INTEGER NOT NULL,
      address_id INTEGER NOT NULL,
      PRIMARY KEY (customer_id, address_id),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE CASCADE
    );
    
    -- Migrate data from backup to new structure
    INSERT INTO addresses (house_no, locality, city, country, postcode)
    SELECT DISTINCT house_no, locality, city, country, postcode
    FROM addresses_backup;
    
    -- Link customers to addresses
    INSERT INTO customer_addresses (customer_id, address_id)
    SELECT ab.customer_id, a.address_id
    FROM addresses_backup ab
    JOIN addresses a ON 
      a.house_no = ab.house_no AND
      a.locality = ab.locality AND
      a.city = ab.city AND
      a.country = ab.country AND
      a.postcode = ab.postcode;
      
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'addresses' AND column_name = 'address_id'
  ) THEN
    -- We need to create the addresses table from scratch
    
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
    CREATE TABLE IF NOT EXISTS customer_addresses (
      customer_id INTEGER NOT NULL,
      address_id INTEGER NOT NULL,
      PRIMARY KEY (customer_id, address_id),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE CASCADE
    );
  END IF;
END
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_address ON customer_addresses(address_id);

-- Make sure the orders table uses order_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_id'
  ) THEN
    -- Rename id to order_id
    ALTER TABLE orders RENAME COLUMN id TO order_id;
    
    -- Update order_products constraints
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'order_products_order_id_fkey'
    ) THEN
      ALTER TABLE order_products DROP CONSTRAINT order_products_order_id_fkey;
      
      ALTER TABLE order_products
        ADD CONSTRAINT order_products_order_id_fkey
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE;
    END IF;
  END IF;
END
$$;

-- Make sure orders has address_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'address_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN address_id INTEGER;
  END IF;
END
$$;

-- Clean up any embedded address columns in orders
ALTER TABLE orders 
  DROP COLUMN IF EXISTS user_address_id,
  DROP COLUMN IF EXISTS house_no,
  DROP COLUMN IF EXISTS locality,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS temp_address_id,
  DROP COLUMN IF EXISTS postcode;

-- Make sure constraints are correct
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_address_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

-- Add address_id foreign key to orders
ALTER TABLE orders
  ADD CONSTRAINT orders_address_id_fkey
  FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE SET NULL;

-- Add customer_id foreign key to orders
ALTER TABLE orders
  ADD CONSTRAINT orders_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

-- Make sure the phone_numbers table exists
CREATE TABLE IF NOT EXISTS phone_numbers (
  customer_id INTEGER NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  PRIMARY KEY (customer_id, phone_number),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Commit transaction
COMMIT; 