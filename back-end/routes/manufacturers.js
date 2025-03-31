const express = require('express');
const bodyParser = require('body-parser');
const db = require('../db/index');
const requireLogin = require('./middleware');

const router = express.Router();
const jsonParser = bodyParser.json();

// Get all manufacturers
router.get('/', async (req, res) => {
  try {
    const manufacturers = await db.getAllManufacturers();
    res.status(200).json(manufacturers);
  } catch (err) {
    res.status(500).send('Error retrieving manufacturers');
  }
});

// Get manufacturer by ID
router.get('/:id', async (req, res) => {
  try {
    const manufacturer = await db.getManufacturerById(req.params.id);
    if (!manufacturer) {
      return res.status(404).send('Manufacturer not found');
    }
    res.status(200).json(manufacturer);
  } catch (err) {
    res.status(500).send('Error retrieving manufacturer');
  }
});

// Get manufacturer's products
router.get('/:id/products', async (req, res) => {
  try {
    const products = await db.getManufacturerProducts(req.params.id);
    res.status(200).json(products);
  } catch (err) {
    res.status(500).send('Error retrieving manufacturer products');
  }
});

// Update manufacturer profile
router.put('/:id', requireLogin, jsonParser, async (req, res) => {
  if (req.user.auth_method !== 'manufacturer' || req.user.id !== parseInt(req.params.id)) {
    return res.status(403).send('Unauthorized to update this manufacturer profile');
  }

  try {
    const updatedManufacturer = await db.updateManufacturer(req.params.id, req.body);
    res.status(200).json(updatedManufacturer);
  } catch (err) {
    res.status(500).send('Error updating manufacturer profile');
  }
});

module.exports = router; 