const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const { seedDatabase } = require('../db/seed');
const { closeDB } = require('../db/database');

describe('Institute Settings API Endpoints', () => {
  let adminCookie = '';
  let staffCookie = '';

  before(async () => {
    process.env.NODE_ENV = 'test';
    await seedDatabase();

    // Login Admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminCookie = adminLoginRes.headers['set-cookie'][0];

    // Change password to clear mustChangePassword flag
    const changePassRes = await request(app)
      .post('/api/auth/change-password')
      .set('Cookie', [adminCookie])
      .send({
        currentPassword: 'admin123',
        newPassword: 'newadminpassword123',
        confirmPassword: 'newadminpassword123'
      });
    adminCookie = changePassRes.headers['set-cookie'][0];

    // Login Staff
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'staff', password: 'staff123' });
    staffCookie = staffRes.headers['set-cookie'][0];
  });

  after(async () => {
    await closeDB();
  });

  it('should fetch public institute settings (GET /api/settings)', async () => {
    const res = await request(app).get('/api/settings');

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.settings);
    assert.ok(res.body.settings.institute_name);
    assert.ok(res.body.settings.institute_short_name);
  });

  it('should allow Admin to update institute settings (PUT /api/settings)', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', [adminCookie])
      .send({
        institute_name: 'Lotus Skills Academy',
        institute_short_name: 'LSA',
        institute_tagline: 'Empowering Future Skills'
      });

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.settings);
    assert.equal(res.body.settings.institute_name, 'Lotus Skills Academy');
    assert.equal(res.body.settings.institute_short_name, 'LSA');
  });

  it('should REJECT institute settings update attempt by non-admin Staff (HTTP 403)', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', [staffCookie])
      .send({
        institute_name: 'Unauthorized Academy',
        institute_short_name: 'UA'
      });

    assert.equal(res.statusCode, 403);
    assert.ok(res.body.error);
  });
});
