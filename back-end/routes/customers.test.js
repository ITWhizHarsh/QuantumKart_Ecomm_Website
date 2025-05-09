const request = require('supertest');
const api = require('../index');

// https://jestjs.io/docs/manual-mocks
jest.mock('../db/index');

// https://github.com/ladjs/supertest
// https://www.albertgao.xyz/2017/05/24/how-to-test-expressjs-with-jest-and-supertest/

test('GET /customers returns a 200 status code', async () => {
  const res = await request(api).get('/customers');
  expect(res.statusCode).toBe(200);
});

test('GET /customers/:id returns a 200 status code', async () => {
  const res = await request(api).get('/customers/1');
  expect(res.statusCode).toBe(200);
});

test('GET /customers/:id/orders returns a 200 status code', async () => {
  const res = await request(api).get('/customers/1/orders');
  expect(res.statusCode).toBe(200);
});

test('GET /users/:id returns a 401 status code when logged out', async () => {
   const res = await request(api).get('/users/1');
   expect(res.statusCode).toBe(401);
});

test('PUT /users/:id returns a 401 status code when logged out', async () => {
  const res = await request(api).put('/users/1');
  expect(res.statusCode).toBe(401);
});


afterAll(() => {
  // https://stackoverflow.com/q/8659011/11262798
  api.server.close();
});
