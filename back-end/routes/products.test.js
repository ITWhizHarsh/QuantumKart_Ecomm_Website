const request = require('supertest');
const api = require('../index');

// https://jestjs.io/docs/manual-mocks
jest.mock('../db/index');

// https://github.com/ladjs/supertest
// https://www.albertgao.xyz/2017/05/24/how-to-test-expressjs-with-jest-and-supertest/

test('GET /products returns a 200 status code', async () => {
   const res = await request(api).get('/products');
   expect(res.statusCode).toBe(200);
});

test('GET /products without a query returns all products', async () => {
  const res = await request(api).get('/products');
  expect(res.body).toHaveLength(5);
  expect(res.body[0]).toHaveProperty('id');
  expect(res.body[0]).toHaveProperty('name');
  expect(res.body[0]).toHaveProperty('price');
});

test('GET /products with a category_id query returns filtered products', async () => {
  const res = await request(api).get('/products?category_id=1');
  expect(res.body).toHaveLength(3);
  expect(res.body[0]).toHaveProperty('category_id', 1);
});

test('GET /products with a search_term query returns filtered products', async () => {
  const res = await request(api).get('/products?search_term=the');
  expect(res.body).toHaveLength(4);
});

test('GET /products/:id with a valid ID returns a 200 status code', async () => {
  const res = await request(api).get('/products/1');
  expect(res.statusCode).toBe(200);
  expect(res.body).toHaveProperty('id', 1);
  expect(res.body).toHaveProperty('name');
  expect(res.body).toHaveProperty('price');
});

test('GET /products/:id with a non-existent ID returns a 404 status code', async () => {
  const res = await request(api).get('/products/-1');
  expect(res.statusCode).toBe(404);
});

afterAll(() => {
  // https://stackoverflow.com/q/8659011/11262798
  api.server.close();
});
