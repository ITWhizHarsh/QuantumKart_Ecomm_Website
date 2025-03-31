// https://jestjs.io/docs/manual-mocks

const bcrypt = require('bcrypt');

const isDefined = data => {
  return typeof data !== "undefined";
};

const throwIfArgsUndefined = args => {
  if (!args.every(isDefined)) {
    throw new Error('Missing required arguments');
  }
};

const emailExists = async (email_address) => {
  throwIfArgsUndefined([email_address]);
  return email_address === "emailExists@example.com";
};

const getCustomerByEmail = async (email_address, auth_method) => {
  throwIfArgsUndefined([email_address, auth_method]);
  if (email_address === "emailExists@example.com") {
    const hashedPassword = await bcrypt.hash("pw", 1);
    return {
      id: 1,
      email_address: "emailExists@example.com",
      hashed_pw: hashedPassword,
      auth_method: "local",
      customer_name: "Test Customer",
      customer_age: 25,
      loyalty_pts: 100
    };
  } else {
    return undefined;
  }
};

const getManufacturerByEmail = async (email_address) => {
  throwIfArgsUndefined([email_address]);
  if (email_address === "manufacturer@example.com") {
    const hashedPassword = await bcrypt.hash("pw", 1);
    return {
      id: 1,
      email_address: "manufacturer@example.com",
      hashed_pw: hashedPassword,
      company_name: "Test Company",
      agent_name: "Test Agent",
      no_of_products: 5
    };
  } else {
    return undefined;
  }
};

const addLocalCustomer = (email_address, hashed_pw) => {
  throwIfArgsUndefined([email_address, hashed_pw]);
  return { "id": 1, "email_address": email_address };
};

const addGoogleCustomer = (email_address, customer_name, customer_age) => {
  throwIfArgsUndefined([email_address, customer_name]);
  return {
    "id": 1,
    "email_address": email_address,
    "customer_name": customer_name,
    "customer_age": customer_age,
    "loyalty_pts": 0
  };
};

const getAllManufacturers = async () => {
  return [
    {
      id: 1,
      company_name: "Test Company 1",
      agent_name: "Test Agent 1",
      no_of_products: 5
    },
    {
      id: 2,
      company_name: "Test Company 2",
      agent_name: "Test Agent 2",
      no_of_products: 3
    }
  ];
};

const getManufacturerById = async (id) => {
  throwIfArgsUndefined([id]);
  return {
    id: parseInt(id),
    company_name: "Test Company",
    agent_name: "Test Agent",
    no_of_products: 5
  };
};

const getManufacturerProducts = async (id) => {
  throwIfArgsUndefined([id]);
  return [
    {
      id: 1,
      name: "Test Product 1",
      price: 99.99,
      manufacturer_id: parseInt(id)
    },
    {
      id: 2,
      name: "Test Product 2",
      price: 149.99,
      manufacturer_id: parseInt(id)
    }
  ];
};

const updateManufacturer = async (id, data) => {
  throwIfArgsUndefined([id, data]);
  return {
    id: parseInt(id),
    ...data
  };
};

const getProducts = async (category_id, search_term) => {
  if (category_id) {
    return [
      { id: 1, name: "Product 1", price: 99.99, category_id },
      { id: 2, name: "Product 2", price: 149.99, category_id },
      { id: 3, name: "Product 3", price: 199.99, category_id }
    ];
  } else if (search_term) {
    return [
      { id: 1, name: "Product 1", price: 99.99 },
      { id: 2, name: "Product 2", price: 149.99 },
      { id: 3, name: "Product 3", price: 199.99 },
      { id: 4, name: "Product 4", price: 249.99 }
    ];
  } else {
    return [
      { id: 1, name: "Product 1", price: 99.99 },
      { id: 2, name: "Product 2", price: 149.99 },
      { id: 3, name: "Product 3", price: 199.99 },
      { id: 4, name: "Product 4", price: 249.99 },
      { id: 5, name: "Product 5", price: 299.99 }
    ];
  }
};

const getProductById = async (id) => {
  throwIfArgsUndefined([id]);
  if (id === '1') {
    return {
      id: 1,
      name: "Test Product",
      price: 99.99,
      description: "A test product",
      manufacturer_id: 1
    };
  }
  return undefined;
};

module.exports = {
  emailExists,
  getCustomerByEmail,
  getManufacturerByEmail,
  addLocalCustomer,
  addGoogleCustomer,
  getAllManufacturers,
  getManufacturerById,
  getManufacturerProducts,
  updateManufacturer,
  getProducts,
  getProductById
};