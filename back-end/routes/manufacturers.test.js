const request = require('supertest');
const api = require('../index');

// https://jestjs.io/docs/manual-mocks
jest.mock('../db/index');

// https://github.com/ladjs/supertest
// https://www.albertgao.xyz/2017/05/24/how-to-test-expressjs-with-jest-and-supertest/

test('GET /manufacturers returns a 200 status code', async () => {
  const res = await request(api).get('/manufacturers');
  expect(res.statusCode).toBe(200);
});

test('GET /manufacturers/:id returns a 200 status code', async () => {
  const res = await request(api).get('/manufacturers/1');
  expect(res.statusCode).toBe(200);
});

test('GET /manufacturers/:id/products returns a 200 status code', async () => {
  const res = await request(api).get('/manufacturers/1/products');
  expect(res.statusCode).toBe(200);
});

test('PUT /manufacturers/:id returns a 401 status code when not logged in', async () => {
  const res = await request(api).put('/manufacturers/1').send({
    company_name: 'Updated Company Name'
  });
  expect(res.statusCode).toBe(401);
}); 