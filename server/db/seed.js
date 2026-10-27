const bcrypt = require('bcryptjs');
const { initSchema, run, get } = require('./database');

async function seedDatabase(forceResetAdmin = false) {
  await initSchema();

  const defaultPassword = 'admin123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Check if admin user exists
  const adminExists = await get(`SELECT id FROM users WHERE username = ?`, ['admin']);
  if (!adminExists) {
    await run(
      `INSERT INTO users (username, password_hash, role, name, must_change_password) VALUES (?, ?, ?, ?, ?)`,
      ['admin', passwordHash, 'admin', 'Administrator', 1]
    );
    console.log('Seeded default admin user: "admin" with must_change_password = 1');
  } else if (forceResetAdmin) {
    await run(
      `UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?`,
      [passwordHash, adminExists.id]
    );
  }

  // Seed default staff user if not exists
  const staffExists = await get(`SELECT id FROM users WHERE username = ?`, ['staff']);
  if (!staffExists) {
    const passwordHash = await bcrypt.hash('staff123', 10);

    await run(
      `INSERT INTO users (username, password_hash, role, name, must_change_password) VALUES (?, ?, ?, ?, ?)`,
      ['staff', passwordHash, 'staff', 'Staff Member', 0]
    );
    console.log('Seeded staff user: "staff"');
  }

  // Seed demo students if missing
  const demoStudents = [
    { id: 'STU001', name: 'Abu Bakr', department: 'Information Technology', photo_url: '/assets/students/12.jpg' },
    { id: 'STU002', name: 'Aravind Swamy', department: 'Electrical Engineering', photo_url: '/assets/students/34.jpg' },
    { id: 'STU003', name: 'Kamal Perera', department: 'Mechanical Technology', photo_url: '/assets/students/56.jpg' }
  ];

  for (const s of demoStudents) {
    const exists = await get(`SELECT id FROM students WHERE id = ?`, [s.id]);
    if (!exists) {
      await run(
        `INSERT INTO students (id, name, department, photo_url) VALUES (?, ?, ?, ?)`,
        [s.id, s.name, s.department, s.photo_url]
      );
    }
  }
}

if (require.main === module) {
  seedDatabase().then(() => {
    console.log('Database seeding complete');
    process.exit(0);
  }).catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
