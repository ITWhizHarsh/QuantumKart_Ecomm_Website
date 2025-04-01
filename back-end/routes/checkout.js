const bodyParser = require('body-parser');
const express = require('express');

const db = require('../db/index');
const requireLogin = require('./middleware');

const router = express.Router();

// https://expressjs.com/en/resources/middleware/body-parser.html
const jsonParser = bodyParser.json();

// https://stripe.com/docs/checkout/embedded/quickstart?client=react&lang=node
// https://stripe.com/docs/payments/accept-a-payment?platform=web&ui=embedded-checkout
const stripe = require('stripe')(`${process.env.STRIPE_SECRET_KEY}`);


router.post('/create-pending-order', requireLogin, jsonParser, async (req, res) => {
  try {
    console.log('Order request received with body:', JSON.stringify(req.body));
    
    // Get user ID
    const userId = req.user.id;
    
    // Check if we're using an existing address or creating a new one
    const { address_id, house_no, locality, city, country, postcode, saveAddress } = req.body;
    
    let orderAddressId = null;
    
    // If using existing address
    if (address_id) {
      console.log(`Using existing address: ${address_id}`);
      orderAddressId = address_id;
    }
    // If creating new address
    else if (house_no && locality && city && country && postcode) {
      console.log('Creating new address for order');
      
      try {
        // First, add the address to the addresses table
        const addressResult = await db.query(
          'INSERT INTO addresses(house_no, locality, city, country, postcode) VALUES($1, $2, $3, $4, $5) RETURNING address_id',
          [house_no, locality, city, country, postcode]
        );
        
        orderAddressId = addressResult.rows[0].address_id;
        console.log(`Created new address with ID: ${orderAddressId}`);
        
        // If saveAddress is true, link it to the customer
        if (saveAddress === true || saveAddress === "true") {
          console.log('Saving address to customer account');
          await db.query(
            'INSERT INTO customer_addresses(customer_id, address_id) VALUES($1, $2) ON CONFLICT DO NOTHING',
            [userId, orderAddressId]
          );
        }
      } catch (err) {
        console.error('Error creating address:', err);
        return res.status(400).send('Failed to create address for order');
      }
    } else {
      return res.status(400).send('Please provide either an address_id or complete address details');
    }

    // Check cart isn't empty
    const cartItems = await db.getCartItems(userId);
    if (cartItems.length < 1) {
      return res.status(400).send('Your cart is empty.');
    }

    // Create pending order with the address
    console.log('Creating pending order with address_id:', orderAddressId);
    const orderDetails = await db.createPendingOrder(userId, orderAddressId);
    console.log('Order created with ID:', orderDetails.order_id);
    
    res.status(201).json(orderDetails);

  } catch(err) {
    console.error('Error creating order:', err);
    res.status(500).send('Order creation failed. Please ensure you are providing valid data.');
  }
});


router.post('/create-payment-session', requireLogin, async (req, res) => {
  // Create a Stripe payment session before payment
  try {
    const orderId = req.query.order_id;
    const orderData = await db.getOrderById(orderId);

    // Generate checkout session Price objects (payment line items)
    const orderItemsData = orderData.order_items.map(item => {
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.product_name,
          },
          unit_amount: (Number(item.product_price.substring(1)) * 100),  // Price in cents
        },
        quantity: Number(item.product_quantity),
      }
    });

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: orderItemsData,
      mode: 'payment',
      return_url: `${process.env.FRONT_END_BASE_URL}/checkout/${orderId}/payment-return?session_id={CHECKOUT_SESSION_ID}`,
    });
  
    res.send({clientSecret: session.client_secret});

  } catch(err) {
    console.error('Error creating payment session:', err);
    res.status(500).send('Failed to create payment session');
  }
});


router.get('/payment-session-status', async (req, res) => {
  // Retrieve the payment status (complete or failed/cancelled) after an attempted payment
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    res.send({ status: session.status });
  } catch(err) {
    console.error('Error retrieving payment status:', err);
    res.status(500).send('Failed to retrieve payment status');
  }
});


router.put('/confirm-paid-order', async (req, res) => {
  // Update the order status if payment was pending and has now been completed
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    if (session.status === 'complete') {
      try {
        const orderId = req.query.order_id;
        if (!orderId) {
          throw new Error('Order ID not included in request; order status could not be updated.');
        }
        const orderStatus = await db.getOrderStatus(orderId);
        if (orderStatus === 'payment pending') {
          await db.confirmPaidOrder(orderId);
        }
      } catch(err) {
        // In production, log/alert to investigate and update order status manually
        console.error('Error confirming paid order:', err);
      }
    }
    res.send();
  } catch(err) {
    console.error('Error in confirm-paid-order endpoint:', err);
    res.status(500).send('Failed to confirm paid order');
  }
});


module.exports = router;
