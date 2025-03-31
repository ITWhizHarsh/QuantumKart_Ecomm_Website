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
      auth_method: req.user.auth_method
    };
  }
  res.status(200).json(jsonData);
});

router.get('/register', jsonParser, (req, res) => {
  res.status(404).send('Please make a valid POST request to register.');
});

router.post('/register', jsonParser, async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const { email_address, password, customer_name, address, postcode } = req.body;

    if (!email_address || !password) {
      console.log('Missing required fields:', { email_address: !!email_address, password: !!password });
      return res.status(400).send(
        'Registration failed. Please provide both email address and password.'
      );
    }

    if (!address || !postcode) {
      console.log('Missing address fields:', { address: !!address, postcode: !!postcode });
      return res.status(400).send(
        'Registration failed. Please provide address and postcode.'
      );
    }

    const userExists = await db.emailExists(email_address);
    if (userExists) {
      console.log('User already exists with email:', email_address);
      return res.status(400).send(
        `Registration failed. The email '${email_address}' is already registered; please use another.`
      );
    }

    // Hash the password
    try {
      console.log('Hashing password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Use provided customer_name or extract from email if not provided
      const finalCustomerName = customer_name || email_address.split('@')[0];
      const customer_age = null; // Set to null as it's optional
      
      console.log('Creating new customer with:', { 
        email_address, 
        customer_name: finalCustomerName,
        auth_method: 'local'
      });
      
      try {
        // Use a transaction to ensure both customer and address are created
        const client = await db.getClient();
        
        try {
          await client.query('BEGIN');
          
          console.log('Transaction started, adding customer with details:', {
            email_address,
            customer_name: finalCustomerName
          });
          
          // Add the customer
          const customerResult = await client.query(
            'INSERT INTO customers(email_address, hashed_pw, auth_method, customer_name, customer_age, loyalty_pts) VALUES($1, $2, $3, $4, $5, 0) RETURNING id, email_address, customer_name, customer_age, loyalty_pts',
            [email_address, hashedPassword, 'local', finalCustomerName, customer_age]
          );
          
          const userData = customerResult.rows[0];
          console.log('Customer created, ID:', userData.id);
          
          // Check addresses table structure
          try {
            console.log('Checking addresses table structure...');
            const tableInfo = await client.query(`
              SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
              WHERE table_name = 'addresses'
              ORDER BY ordinal_position
            `);
            console.log('Addresses table structure:', tableInfo.rows);
          } catch (err) {
            console.error('Error checking table structure:', err);
          }
          
          // Add the address for the customer
          console.log('Adding address for customer ID:', userData.id, {address, postcode});
          await client.query(
            'INSERT INTO addresses(customer_id, address, postcode) VALUES($1, $2, $3)',
            [userData.id, address, postcode]
          );
          
          await client.query('COMMIT');
          console.log('Transaction committed successfully');
          console.log('Customer and address created successfully:', userData);
          
          const authData = {
            id: userData.id,
            email_address: userData.email_address,
            auth_method: 'local',
            customer_name: userData.customer_name,
            customer_age: userData.customer_age,
            loyalty_pts: userData.loyalty_pts
          };
          
          req.login(authData, function(err) {
            if (err) {
              console.error('Login error after registration:', err);
              return res.status(201).json(userData);
            }
            console.log('User logged in after registration');
            return res.status(201).json(userData);
          });
          
        } catch (err) {
          await client.query('ROLLBACK');
          console.error('Transaction error during registration:', err);
          throw err;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error('Error during customer registration:', err);
        return res.status(500).send(
          'Registration failed. Database error creating user or address.'
        );
      }
    } catch (err) {
      console.error('Error hashing password:', err);
      return res.status(500).send(
        'Registration failed. Error processing password.'
      );
    }
  } catch(err) {
    console.error('Registration error:', err);
    res.status(500).send(
      'Registration failed. Please ensure you are providing the required data.'
    );
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
      auth_method: req.user.auth_method
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

module.exports = router;
