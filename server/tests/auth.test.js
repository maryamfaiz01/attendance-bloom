const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const { seedDatabase } = require('../db/seed');
const { closeDB } = require('../db/database');

describe('Auth API Endpoints', () => {
  let adminCookie = '';

  before(async () => {
    process.env.NODE_ENV = 'test';
    await seedDatabase();
  });

  after(async () => {
    await closeDB();
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    assert.equal(res.statusCode, 401);
    assert.ok(res.body.error);
  });

  it('should login successfully with default seeded admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.username, 'admin');
    assert.equal(res.body.user.mustChangePassword, true);

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies && cookies.length > 0);
    adminCookie = cookies[0];
  });

  it('should return current user profile via /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [adminCookie]);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.username, 'admin');
  });
});
