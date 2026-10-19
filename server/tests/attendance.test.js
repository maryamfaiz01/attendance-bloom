const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const { seedDatabase } = require('../db/seed');
const { closeDB } = require('../db/database');

describe('Attendance API Endpoints', () => {
  let staffCookie = '';

  before(async () => {
    process.env.NODE_ENV = 'test';
    await seedDatabase();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'staff', password: 'staff123' });

    assert.ok(res.headers['set-cookie']);
    staffCookie = res.headers['set-cookie'][0];
  });

  after(async () => {
    await closeDB();
  });

  it('should reject scan for non-existent student', async () => {
    const res = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [staffCookie])
      .send({ studentId: 'NONEXISTENT999', type: 'check_in' });

    assert.equal(res.statusCode, 404);
    assert.ok(res.body.error.includes('not registered'));
  });

  it('should successfully log attendance for valid student STU001', async () => {
    const res = await request(app)
      .post('/api/attendance/scan')
      .set('Cookie', [staffCookie])
      .send({ studentId: 'STU001', type: 'check_in' });

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.record);
    assert.equal(res.body.record.student_id, 'STU001');
  });

  it('should retrieve attendance records list', async () => {
    const res = await request(app)
      .get('/api/attendance')
      .set('Cookie', [staffCookie]);

    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.records));
    assert.ok(res.body.records.length > 0);
  });
});
