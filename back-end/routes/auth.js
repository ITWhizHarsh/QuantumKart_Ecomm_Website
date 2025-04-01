const bodyParser = require('body-parser');
const express = require('express');
const LocalStrategy = require('passport-local');
const passport = require('passport');
const bcrypt = require('bcrypt');

const auth = require('../auth');
const db = require('../db/index');

const router = express.Router();

// https://expressjs.com/en/resources/middleware/body-parser.html
const jsonParser = bodyParser.json();

// https://www.passportjs.org/concepts/authentication/password/
passport.use(new LocalStrategy({
  usernameField: 'email_address',
  passwordField: 'password'
}, async (email_address, password, done) => {
  try {
    // Try customer authentication first
    const customer = await db.getCustomerByEmail(email_address, 'local');
    if (customer) {
      const matchedPassword = await bcrypt.compare(password, customer.hashed_pw);
      if (matchedPassword) {
        return done(null, {
          id: customer.id,
          email_address: customer.email_address,
          auth_method: 'local',
          customer_name: customer.customer_name,
          customer_age: customer.customer_age,
          loyalty_pts: customer.loyalty_pts
        });
      }
    }

    // If not a customer, try manufacturer authentication
    const manufacturer = await db.getManufacturerByEmail(email_address);
    if (manufacturer) {
      const matchedPassword = await bcrypt.compare(password, manufacturer.hashed_pw);
      if (matchedPassword) {
        return done(null, {
          id: manufacturer.id,
          email_address: manufacturer.email_address,
          auth_method: 'manufacturer',
          company_name: manufacturer.company_name,
          agent_name: manufacturer.agent_name,
          no_of_products: manufacturer.no_of_products
        });
      }
    }

    // If neither customer nor manufacturer, or password doesn't match
    return done(null, false, { message: 'Incorrect email address or password.' });
  } catch (err) {
    return done(err);
  }
}));

router.get('/status', (req, res) => {
  let jsonData;
  if (!req.isAuthenticated()) {
    jsonData = { logged_in: false, id: null, email_address: null, auth_method: null };
  } else {
    jsonData = {
      logged_in: true,
      id: req.user.id,
      email_address: req.user.email_address,
      auth_method: req.user.auth_method,
      customer_name: req.user.customer_name,
      loyalty_pts: req.user.loyalty_pts
    };
  }
  res.status(200).json(jsonData);
});

router.get('/register', jsonParser, (req, res) => {
  res.status(404).send('Please make a valid POST request to register.');
});

router.post('/register', jsonParser, async (req, res) => {
  try {
    console.log('Registration request received:', JSON.stringify(req.body));
    
    const { 
      email_address, 
      password, 
      customer_name
    } = req.body;

    // Core validation
    if (!email_address || !password || !customer_name) {
      return res.status(400).send('Required fields are missing: email, password, and name are required.');
    }

    // Check if email exists
    const emailExists = await db.emailExists(email_address);
    if (emailExists) {
      return res.status(400).send('Email already registered.');
    }
    
    // Hash password
    const hashed_pw = await bcrypt.hash(password, 10);
    
    // Add customer
    try {
      const customer = await db.addLocalCustomer(email_address, hashed_pw, customer_name, null);
      console.log('Customer created with ID:', customer.id);
      
      // Login the user
      req.login({ id: customer.id, email_address, auth_method: 'local' }, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(200).json({
            logged_in: false,
            message: 'User created but auto-login failed. Please login manually.'
          });
        }
        
        return res.status(200).json({
          logged_in: true,
          id: customer.id,
          email_address: customer.email_address,
          auth_method: 'local',
          customer_name: customer.customer_name,
          loyalty_pts: customer.loyalty_pts
        });
      });
    } catch (userError) {
      console.error('User creation failed:', userError);
      return res.status(500).send(`User creation failed: ${userError.message}`);
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send(`Registration failed: ${error.message}`);
  }
});

router.get('/login', jsonParser, (req, res) => {
  res.status(404).send('Please make a valid POST request to log in.');
});

router.post('/login',
  jsonParser,
  passport.authenticate('local', { failureMessage: true }),
  function(req, res) {
    res.status(200).json({
      id: req.user.id,
      email_address: req.user.email_address,
      auth_method: req.user.auth_method,
      customer_name: req.user.customer_name,
      loyalty_pts: req.user.loyalty_pts
    });
  }
);

router.post('/logout', (req, res) => {
  if (req.isAuthenticated()) {
    req.logout((err) => {
      if (err) {
        return res.status(500).send('Sorry, logout failed.');
      }
    });
  }
  res.status(200).send();
});

router.get('/fix-database', async (req, res) => {
  try {
    console.log('Attempting to fix database structure...');
    
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      
      // Step 1: Drop the existing foreign key constraint
      await client.query('ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_customer_id_fkey;');
      
      // Step 2: Drop the unique constraint that includes customer_id
      await client.query('ALTER TABLE addresses DROP CONSTRAINT IF EXISTS addresses_customer_id_address_postcode_key;');
      
      // Step 3: Modify the customer_id column to allow NULL values
      await client.query('ALTER TABLE addresses ALTER COLUMN customer_id DROP NOT NULL;');
      
      // Step 4: Re-add the foreign key constraint that allows NULL values
      await client.query(`
        ALTER TABLE addresses 
        ADD CONSTRAINT addresses_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
      `);
      
      // Step 5: Re-add the unique constraint but only for non-NULL customer_ids
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS addresses_customer_address_postcode_idx 
        ON addresses (customer_id, address, postcode) 
        WHERE customer_id IS NOT NULL;
      `);
      
      await client.query('COMMIT');
      console.log('Database structure fixed successfully');
      res.status(200).send('Database structure fixed successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error fixing database structure:', err);
      res.status(500).send('Error fixing database structure: ' + err.message);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error fixing database:', err);
    res.status(500).send('Error fixing database: ' + err.message);
  }
});

// Add a diagnostic route to check the database structure
router.get('/check-db', async (req, res) => {
  try {
    const client = await db.getClient();
    const results = {};
    
    try {
      // Check addresses table structure
      const tableInfo = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'addresses'
        ORDER BY ordinal_position
      `);
      results.addressesColumns = tableInfo.rows;
      
      // Check primary key constraint
      const pkInfo = await client.query(`
        SELECT c.column_name, c.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name) 
        JOIN information_schema.columns AS c ON c.table_name = tc.table_name AND c.column_name = ccu.column_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = 'addresses'
      `);
      results.addressesPK = pkInfo.rows;
      
      // Try a simple insert to test if addresses table works
      try {
        await client.query('BEGIN');
        // Insert a test customer
        const testCustomerRes = await client.query(
          'INSERT INTO customers(email_address, hashed_pw, auth_method, customer_name) VALUES($1, $2, $3, $4) RETURNING id',
          [`test_${Date.now()}@example.com`, 'test_hash', 'local', 'Test User']
        );
        const testCustomerId = testCustomerRes.rows[0].id;
        
        // Try to insert an address for this customer
        await client.query(
          'INSERT INTO addresses(customer_id, house_no, locality, city, country, postcode) VALUES($1, $2, $3, $4, $5, $6)',
          [testCustomerId, '123', 'Test Area', 'Test City', 'Test Country', '12345']
        );
        
        results.insertTest = "Address insert successful";
        
        // Rollback the test
        await client.query('ROLLBACK');
      } catch (insertErr) {
        results.insertTest = `Address insert failed: ${insertErr.message}`;
        await client.query('ROLLBACK');
      }
      
      res.status(200).json(results);
    } catch (err) {
      res.status(500).json({
        error: err.message,
        stack: err.stack
      });
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).send(`Database connection error: ${err.message}`);
  }
});

module.exports = router;
