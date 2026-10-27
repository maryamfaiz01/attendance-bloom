process.env.DB_PATH = './server/db/database.test.json';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../server');
const { seedDatabase } = require('../db/seed');
const { closeDB } = require('../db/database');

describe('Students API Endpoints (CRUD & Edit)', () => {
  let adminCookie = '';
  let staffCookie = '';

  before(async () => {
    process.env.NODE_ENV = 'test';
    await seedDatabase(true);

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
    await seedDatabase(true);
    await closeDB();
  });

  it('should fetch list of enrolled students', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Cookie', [adminCookie]);

    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.students));
    assert.ok(res.body.students.length > 0);
  });

  it('should allow Admin to update an existing student profile (PUT /api/students/:id)', async () => {
    const res = await request(app)
      .put('/api/students/STU001')
      .set('Cookie', [adminCookie])
      .send({
        name: 'Abu Bakr Updated',
        department: 'Advanced IT Engineering'
      });

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.student);
    assert.equal(res.body.student.id, 'STU001');
    assert.equal(res.body.student.name, 'Abu Bakr Updated');
    assert.equal(res.body.student.department, 'Advanced IT Engineering');
  });

  it('should REJECT student profile edit attempt by non-admin Staff (HTTP 403)', async () => {
    const res = await request(app)
      .put('/api/students/STU001')
      .set('Cookie', [staffCookie])
      .send({
        name: 'Hacker Name Change',
        department: 'Unauthorized Department'
      });

    assert.equal(res.statusCode, 403);
    assert.ok(res.body.error);
    assert.ok(res.body.error.includes('Admin privileges required'));
  });

  it('should REJECT student profile edit with invalid data (HTTP 400)', async () => {
    const res = await request(app)
      .put('/api/students/STU001')
      .set('Cookie', [adminCookie])
      .send({
        name: '', // Empty name should fail validation
        department: 'IT'
      });

    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error);
    assert.ok(res.body.error.includes('name is required'));
  });

  it('should handle profile update with large base64 photo payload (>100KB) successfully', async () => {
    // Generate a ~200KB base64 image data URL
    const dummyBase64 = 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='.repeat(2500);

    const res = await request(app)
      .put('/api/students/STU001')
      .set('Cookie', [adminCookie])
      .send({
        name: 'Abu Bakr Photo Test',
        department: 'Computer Science',
        photo: dummyBase64
      });

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.student);
    assert.equal(res.body.student.name, 'Abu Bakr Photo Test');
    assert.ok(res.body.student.photo_url);
    assert.ok(!res.body.student.photo_url.startsWith('data:image'), 'Photo should be saved to disk as relative URL');
  });

  it('should REJECT student deletion attempt by non-admin Staff (HTTP 403)', async () => {
    const res = await request(app)
      .delete('/api/students/STU001')
      .set('Cookie', [staffCookie]);

    assert.equal(res.statusCode, 403);
    assert.ok(res.body.error);
    assert.ok(res.body.error.includes('Admin privileges required'));
  });

  it('should return HTTP 404 when attempting to delete a non-existent student ID', async () => {
    const res = await request(app)
      .delete('/api/students/STU_NON_EXISTENT_999')
      .set('Cookie', [adminCookie]);

    assert.equal(res.statusCode, 404);
    assert.ok(res.body.error);
    assert.ok(res.body.error.includes('not found'));
  });

  it('should allow Admin to delete a student record and associated attendance history (DELETE /api/students/:id)', async () => {
    const res = await request(app)
      .delete('/api/students/STU001')
      .set('Cookie', [adminCookie]);

    assert.equal(res.statusCode, 200);
    assert.ok(res.body.message);
    assert.ok(res.body.message.includes('deleted'));

    // Verify student no longer exists
    const checkRes = await request(app)
      .get('/api/students/STU001')
      .set('Cookie', [adminCookie]);
    assert.equal(checkRes.statusCode, 404);
  });
});
