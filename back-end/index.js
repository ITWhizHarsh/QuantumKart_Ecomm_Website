require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logging = require('morgan');
const passport = require('passport');
const session = require('express-session');

const auth = require('./auth');
const db = require('./db/index');

const authRouter = require('./routes/auth');
const cartRouter = require('./routes/cart');
const categoriesRouter = require('./routes/categories');
const checkoutRouter = require('./routes/checkout');
const docsRouter = require('./routes/docs');
const ordersRouter = require('./routes/orders');
const productsRouter = require('./routes/products');
const customersRouter = require('./routes/customers');
const manufacturersRouter = require('./routes/manufacturers');
const manufacturerRouter = require('./routes/manufacturer');

const api = express();
const port = process.env.PORT;

// https://expressjs.com/en/resources/middleware/morgan.html
api.use(logging(process.env.LOGGING));


// https://expressjs.com/en/resources/middleware/cors.html
const devOrigin = ["https://web.postman.co/", "http://localhost", /http:\/\/localhost:.*/];
const prodOrigin = process.env.FRONT_END_BASE_URL;
const origin = process.env.NODE_ENV !== "production" ? devOrigin : prodOrigin;

console.log("CORS origin configuration:", origin);

// Create a more permissive CORS setup to help troubleshoot connection issues
api.use(cors({
  origin: true, // Allow all origins temporarily for debugging
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["Set-Cookie"]
}));

// Logging middleware to capture all requests
api.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// https://www.passportjs.org/concepts/authentication/sessions/
// https://www.passportjs.org/howtos/session/
// https://expressjs.com/en/resources/middleware/session.html

if (process.env.NODE_ENV === 'production') {
  // https://expressjs.com/en/guide/behind-proxies.html
  // https://stackoverflow.com/a/75418142/11262798
  api.set('trust proxy', 1);

  api.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      sameSite: 'none'
    },
  }));

} else {
  api.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }));
}

// Authenticate all routes and add user data to req.user
api.use(passport.initialize());
api.use(passport.authenticate('session'));
passport.serializeUser(auth.serialize);
passport.deserializeUser(auth.deserialize);

// Serve static files from the public directory
api.use('/product-images', express.static('public/product-images'));

api.get('/', (req, res) => {
  res.status(200).send(
    req.isAuthenticated() ? `Logged in as ${req.user.email_address}.` : 'Logged out.'
  );
});

api.use('/auth', authRouter);
api.use('/cart', cartRouter);
api.use('/categories', categoriesRouter);
api.use('/checkout', checkoutRouter);
api.use('/docs', docsRouter);
api.use('/orders', ordersRouter);
api.use('/products', productsRouter);
api.use('/customers', customersRouter);
api.use('/manufacturers', manufacturersRouter);
api.use('/manufacturer', manufacturerRouter);

api.server = api.listen(port, () => {
  console.log(`Server listening on port ${port} in the ${process.env.NODE_ENV} environment.`);
});

module.exports = api;