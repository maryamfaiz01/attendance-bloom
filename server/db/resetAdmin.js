const bcrypt = require('bcryptjs');
const { initSchema, get, run, closeDB } = require('./database');

async function resetAdminAccount() {
  await initSchema();

  const tempPassword = 'admin123';
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  // Check if admin user exists (by username 'admin' or role 'admin')
  let admin = await get(`SELECT * FROM users WHERE username = ?`, ['admin']);

  if (!admin) {
    // Try finding by role = 'admin'
    const { all } = require('./database');
    const users = await all('SELECT * FROM users');
    admin = users.find(u => u.role === 'admin');
  }

  if (admin) {
    // Update existing admin account
    await run(
      `UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?`,
      [passwordHash, 1, admin.id]
    );
    // Ensure username is reset to 'admin'
    admin.username = 'admin';
    admin.password_hash = passwordHash;
    admin.must_change_password = 1;
    await closeDB();

    console.log(`\n===================================================`);
    console.log(`  ✅ ADMIN ACCOUNT RECOVERED & RESET SUCCESSFUL`);
    console.log(`===================================================`);
    console.log(`  Username:               admin`);
    console.log(`  Temporary Password:     admin123`);
    console.log(`  Forced Password Reset: Enabled (Required on next login)`);
    console.log(`===================================================\n`);
  } else {
    // Insert new admin account
    await run(
      `INSERT INTO users (username, password_hash, role, name, must_change_password) VALUES (?, ?, ?, ?, ?)`,
      ['admin', passwordHash, 'admin', 'Administrator', 1]
    );
    await closeDB();

    console.log(`\n===================================================`);
    console.log(`  ✅ NEW ADMIN ACCOUNT CREATED`);
    console.log(`===================================================`);
    console.log(`  Username:               admin`);
    console.log(`  Temporary Password:     admin123`);
    console.log(`  Forced Password Reset: Enabled (Required on next login)`);
    console.log(`===================================================\n`);
  }
}

if (require.main === module) {
  resetAdminAccount().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Reset admin error:', err);
    process.exit(1);
  });
}

module.exports = { resetAdminAccount };
