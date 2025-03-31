const bcrypt = require('bcrypt');
const db = require('./db/index');


// ==== Local Login ====

// https://www.passportjs.org/concepts/authentication/password/
// https://www.passportjs.org/tutorials/password/
// https://www.passportjs.org/howtos/password/
// https://medium.com/@prashantramnyc/node-js-with-passport-authentication-simplified-76ca65ee91e5

async function hashPassword(password) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

// Customer Authentication
async function localCustomerVerify(username, password, done) {
  const email_address = username;
  try {
    const customer = await db.getCustomerByEmail(email_address, 'local');
    if (!customer) {
      return done(null, false,
        { message: `An account with the email address '${email_address}' does not exist.` }
      );
    }
    const matchedPassword = await bcrypt.compare(password, customer.hashed_pw);
    if (!matchedPassword) {
      return done(null, false, { message: 'Incorrect email address or password.' });
    }
    return done(null, {
      id: customer.id,
      email_address: customer.email_address,
      auth_method: customer.auth_method,
      customer_name: customer.customer_name,
      customer_age: customer.customer_age,
      loyalty_pts: customer.loyalty_pts
    });

  } catch(err) {
    return done(err);
  }
}

// Manufacturer Authentication
async function localManufacturerVerify(username, password, done) {
  const email_address = username;
  try {
    const manufacturer = await db.getManufacturerByEmail(email_address);
    if (!manufacturer) {
      return done(null, false,
        { message: `No manufacturer account found with the email address '${email_address}'.` }
      );
    }
    const matchedPassword = await bcrypt.compare(password, manufacturer.hashed_pw);
    if (!matchedPassword) {
      return done(null, false, { message: 'Incorrect email address or password.' });
    }
    return done(null, {
      id: manufacturer.id,
      email_address: manufacturer.email_address,
      auth_method: 'manufacturer',
      company_name: manufacturer.company_name,
      agent_name: manufacturer.agent_name,
      no_of_products: manufacturer.no_of_products
    });

  } catch(err) {
    return done(err);
  }
}


// ==== Google Login ====

// https://www.passportjs.org/concepts/authentication/google/
// https://www.passportjs.org/tutorials/google/
// https://www.passportjs.org/reference/normalized-profile/
// https://console.cloud.google.com/apis/dashboard

const googleConfig = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/redirect',
  scope: ['email', 'profile']
}

async function googleCustomerVerify(issuer, profile, done) {
  const email_address = profile.emails[0].value;
  const customer_name = profile.displayName;
  const customer_age = null; // Google doesn't provide age
  try {
    let customer = await db.getCustomerByEmail(email_address, 'google');
    if (!customer) {
      customer = await db.addGoogleCustomer(email_address, customer_name, customer_age);
    }
    return done(null, {
      id: customer.id,
      email_address: customer.email_address,
      auth_method: 'google',
      customer_name: customer.customer_name,
      customer_age: customer.customer_age,
      loyalty_pts: customer.loyalty_pts
    });
  } catch(err) {
    return done(null, null);
  }
}


// ==== Serialization and Deserialization ====

// https://www.passportjs.org/concepts/authentication/sessions/
// https://www.passportjs.org/howtos/session/

function serialize(user, done) {
  console.log('Serializing user:', user.id);
  process.nextTick(function() {
    return done(null, {
      id: user.id,
      email_address: user.email_address,
      auth_method: user.auth_method,
      customer_name: user.customer_name,
      customer_age: user.customer_age,
      loyalty_pts: user.loyalty_pts,
      company_name: user.company_name,
      agent_name: user.agent_name,
      no_of_products: user.no_of_products
    });
  });
}


function deserialize(user, done) {
  console.log('Deserializing user:', user.id);
  process.nextTick(function() {
    return done(null, user);
  });
}


module.exports = {
  hashPassword,
  localCustomerVerify,
  localManufacturerVerify,
  googleConfig,
  googleCustomerVerify,
  serialize,
  deserialize
};
