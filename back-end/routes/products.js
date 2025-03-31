const express = require('express');
const bodyParser = require('body-parser');
const db = require('../db/index');

const router = express.Router();
const jsonParser = bodyParser.json();

// Get all products, optionally filtered by category or search term
router.get('/', async (req, res) => {
  try {
    const { category_id, search_term } = req.query;
    const products = await db.getProducts(category_id, search_term);
    res.status(200).json(products);
  } catch (err) {
    res.status(500).send('Error retrieving products');
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).send('Product not found');
    }
    res.status(200).json(product);
  } catch (err) {
    res.status(500).send('Error retrieving product');
  }
});

module.exports = router;
