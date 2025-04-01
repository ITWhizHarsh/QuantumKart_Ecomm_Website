const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const express = require('express');

const db = require('../db/index');

const router = express.Router();

// https://expressjs.com/en/resources/middleware/body-parser.html
const jsonParser = bodyParser.json();

router.param('id', (req, res, next, id) => {
  if (!req.isAuthenticated() || id !== String(req.user.id)) {
    return res.status(401).send(
      `Invalid credentials. You must be logged in as the user with id '${id}'.`
    );
  }
  next();
});

router.get('/:id', (req, res) => {
  res.status(200).send({ id: req.user.id, email_address: req.user.email_address });
});

router.put('/:id', jsonParser, async (req, res) => {
  try {
    const { password } = req.body;
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await db.updateUserPassword(req.params.id, hashedPassword);
    res.status(200).send();

  } catch(err) {
    res.status(500).send(
      'Password update failed. Please ensure you are providing the required data.'
    );
  }
});

// Get all addresses for a customer
router.get('/:id/addresses', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.id != req.params.id) {
      return res.status(401).send('Unauthorized');
    }
    
    console.log('GET request for addresses of customer:', req.params.id);
    const addresses = await db.getUserAddresses(req.params.id);
    res.status(200).json(addresses);
  } catch (error) {
    console.error('Error retrieving addresses:', error);
    res.status(500).send('Failed to retrieve addresses');
  }
});

// Add a new address for a customer
router.post('/:id/addresses', jsonParser, async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.id != req.params.id) {
      return res.status(401).send('Unauthorized');
    }
    
    console.log('POST request to add address for customer:', req.params.id);
    console.log('Address data:', req.body);
    
    const { house_no, locality, city, country, postcode } = req.body;
    
    if (!house_no || !locality || !city || !country || !postcode) {
      return res.status(400).send('All address fields are required');
    }
    
    const address = await db.addAddress(
      req.params.id, 
      house_no, 
      locality, 
      city, 
      country, 
      postcode
    );
    
    console.log('Address added successfully:', address);
    res.status(201).json(address);
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).send('Failed to add address');
  }
});

// Delete an address
router.delete('/:id/addresses/:addressId', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.id != req.params.id) {
      return res.status(401).send('Unauthorized');
    }
    
    console.log('DELETE request for address:', req.params.addressId, 'of customer:', req.params.id);
    
    const addressId = req.params.addressId;
    if (!addressId) {
      return res.status(400).send('Address ID is required');
    }
    
    await db.deleteAddress(req.params.id, addressId);
    console.log('Address deleted successfully');
    res.status(200).send('Address deleted successfully');
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).send('Failed to delete address');
  }
});

// Get all phone numbers for a customer
router.get('/:id/phone-numbers', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.id != req.params.id) {
      return res.status(401).send('Unauthorized');
    }
    
    console.log('GET request for phone numbers of customer:', req.params.id);
    
    const phoneNumbers = await db.getCustomerPhoneNumbers(req.params.id);
    res.status(200).json(phoneNumbers);
  } catch (error) {
    console.error('Error retrieving phone numbers:', error);
    res.status(500).send('Failed to retrieve phone numbers');
  }
});

// Add a test route to verify the phone number API is working
router.get('/:id/phone-test', (req, res) => {
  console.log('Phone test route hit for user:', req.params.id);
  res.status(200).send('Phone test route is working');
});

// Add a new phone number for a customer
router.post('/:id/phone-numbers', jsonParser, async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.id != req.params.id) {
      return res.status(401).send('Unauthorized');
    }
    
    console.log('POST request to add phone number for customer:', req.params.id);
    console.log('Phone data:', req.body);
    
    const { phone_number } = req.body;
    
    if (!phone_number) {
      return res.status(400).send('Phone number is required');
    }
    
    const result = await db.addPhoneNumber(req.params.id, phone_number);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding phone number:', error);
    res.status(500).send('Failed to add phone number');
  }
});

// Delete a phone number
router.delete('/:id/phone-numbers/:phone', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.id != req.params.id) {
      return res.status(401).send('Unauthorized');
    }
    
    await db.deletePhoneNumber(req.params.id, req.params.phone);
    res.status(200).send('Phone number deleted successfully');
  } catch (error) {
    console.error('Error deleting phone number:', error);
    res.status(500).send('Failed to delete phone number');
  }
});

module.exports = router;
