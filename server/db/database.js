const fs = require('fs');
const path = require('path');

const isTest = process.env.NODE_ENV === 'test' || 
               process.execArgv.includes('--test') || 
               process.argv.some(arg => typeof arg === 'string' && (arg.includes('.test.js') || arg === '--test'));
const defaultDbFile = isTest ? 'database.test.json' : 'database.json';
const dbFilePath = process.env.DB_PATH 
  ? path.resolve(process.cwd(), process.env.DB_PATH.replace('.sqlite', '.json')) 
  : path.resolve(__dirname, defaultDbFile);

// Ensure database directory exists
const dbDir = path.dirname(dbFilePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Memory store backed by JSON file
let store = {
  users: [],
  students: [],
  attendance: [],
  settings: []
};

// Load existing data if file exists
function loadDB() {
  if (fs.existsSync(dbFilePath)) {
    try {
      const content = fs.readFileSync(dbFilePath, 'utf8');
      if (content.trim()) {
        store = JSON.parse(content);
      }
    } catch (e) {
      console.error('Failed to parse database file, starting clean:', e);
    }
  }
}

// Persist data to file
function saveDB() {
  fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');
}

loadDB();

async function initSchema() {
  if (!store.users) store.users = [];
  if (!store.students) store.students = [];
  if (!store.attendance) store.attendance = [];
  if (!store.settings) store.settings = [];
  saveDB();
}

async function run(sql, params = []) {
  sql = sql.trim();

  // Users insert
  if (sql.startsWith('INSERT INTO users')) {
    const id = store.users.length ? Math.max(...store.users.map(u => u.id)) + 1 : 1;
    const [username, password_hash, role, name, must_change_password] = params;
    const newUser = {
      id,
      username,
      password_hash,
      role: role || 'staff',
      name,
      must_change_password: must_change_password !== undefined ? must_change_password : 0,
      created_at: new Date().toISOString()
    };
    store.users.push(newUser);
    saveDB();
    return { id, changes: 1 };
  }

  // Users update password
  if (sql.includes('UPDATE users SET password_hash')) {
    let password_hash, must_change_password, userId;
    if (params.length === 3) {
      [password_hash, must_change_password, userId] = params;
    } else {
      [password_hash, userId] = params;
      must_change_password = sql.includes('must_change_password = 1') ? 1 : 0;
    }
    const user = store.users.find(u => u.id === Number(userId));
    if (user) {
      user.password_hash = password_hash;
      user.must_change_password = Number(must_change_password);
      saveDB();
      return { id: user.id, changes: 1 };
    }
  }

  // Students insert
  if (sql.startsWith('INSERT INTO students')) {
    const [id, name, department, photo_url] = params;
    const newStudent = {
      id,
      name,
      department,
      photo_url: photo_url || '/assets/students/user.png',
      created_at: new Date().toISOString()
    };
    store.students.push(newStudent);
    saveDB();
    return { id, changes: 1 };
  }

  // Students update
  if (sql.startsWith('UPDATE students')) {
    const [name, department, photo_url, id] = params;
    const student = store.students.find(s => s.id === id);
    if (student) {
      if (name !== undefined) student.name = name;
      if (department !== undefined) student.department = department;
      if (photo_url !== undefined) student.photo_url = photo_url;
      saveDB();
      return { id, changes: 1 };
    }
    return { id, changes: 0 };
  }

  // Students delete
  if (sql.startsWith('DELETE FROM students')) {
    const [id] = params;
    store.students = store.students.filter(s => s.id !== id);
    saveDB();
    return { changes: 1 };
  }

  // Attendance delete by student_id
  if (sql.startsWith('DELETE FROM attendance WHERE student_id')) {
    const [studentId] = params;
    store.attendance = store.attendance.filter(a => a.student_id !== studentId);
    saveDB();
    return { changes: 1 };
  }

  // Attendance insert
  if (sql.startsWith('INSERT INTO attendance')) {
    const id = store.attendance.length ? Math.max(...store.attendance.map(a => a.id)) + 1 : 1;
    const [student_id, type, scanned_by] = params;
    const newRecord = {
      id,
      student_id,
      type,
      timestamp: new Date().toISOString(),
      scanned_by
    };
    store.attendance.push(newRecord);
    saveDB();
    return { id, changes: 1 };
  }

  // Settings insert/update
  if (sql.includes('settings')) {
    const [key, value] = params;
    const existing = store.settings.find(s => s.key === key);
    if (existing) {
      existing.value = value;
      existing.updated_at = new Date().toISOString();
    } else {
      store.settings.push({ key, value, updated_at: new Date().toISOString() });
    }
    saveDB();
    return { changes: 1 };
  }

  return { id: 0, changes: 0 };
}

async function get(sql, params = []) {
  sql = sql.trim();

  if (sql.includes('FROM settings WHERE key = ?')) {
    const [key] = params;
    return store.settings.find(s => s.key === key) || null;
  }

  if (sql.includes('FROM users WHERE username = ?')) {
    const [username] = params;
    return store.users.find(u => u.username === username) || null;
  }

  if (sql.includes('FROM users WHERE id = ?')) {
    const [id] = params;
    return store.users.find(u => u.id === id) || null;
  }

  if (sql.includes('FROM students WHERE id = ?')) {
    const [id] = params;
    return store.students.find(s => s.id === id) || null;
  }

  if (sql.includes('COUNT(*) as count FROM students')) {
    return { count: store.students.length };
  }

  if (sql.includes('FROM attendance a') && sql.includes('WHERE a.id = ?')) {
    const [id] = params;
    const att = store.attendance.find(a => a.id === id);
    if (!att) return null;
    const stu = store.students.find(s => s.id === att.student_id) || {};
    return {
      id: att.id,
      type: att.type,
      timestamp: att.timestamp,
      scanned_by: att.scanned_by,
      student_id: att.student_id,
      student_name: stu.name || 'Unknown',
      department: stu.department || 'N/A',
      photo_url: stu.photo_url || '/assets/students/user.png'
    };
  }

  return null;
}

async function all(sql, params = []) {
  sql = sql.trim();

  // Fetch all settings
  if (sql.includes('FROM settings')) {
    return [...store.settings];
  }

  // Fetch all students
  if (sql.includes('FROM students')) {
    let result = [...store.students];
    if (params.length > 0) {
      const q = params[0].replace(/%/g, '').toLowerCase();
      result = result.filter(s => 
        s.id.toLowerCase().includes(q) || 
        s.name.toLowerCase().includes(q) || 
        s.department.toLowerCase().includes(q)
      );
    }
    return result;
  }

  // Fetch attendance records with JOIN on students
  if (sql.includes('FROM attendance')) {
    let result = store.attendance.map(att => {
      const stu = store.students.find(s => s.id === att.student_id) || {};
      return {
        id: att.id,
        type: att.type,
        timestamp: att.timestamp,
        scanned_by: att.scanned_by,
        student_id: att.student_id,
        student_name: stu.name || 'Unknown',
        department: stu.department || 'N/A',
        photo_url: stu.photo_url || '/assets/students/user.png'
      };
    });

    if (sql.includes('a.student_id = ?')) {
      const studentId = params[0];
      result = result.filter(r => r.student_id === studentId);
    }

    if (sql.includes('DATE(a.timestamp) = DATE(?)')) {
      const dateStr = params[params.length - 1];
      result = result.filter(r => r.timestamp.startsWith(dateStr));
    }

    // Sort descending by timestamp
    result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return result;
  }

  return [];
}

async function closeDB() {
  saveDB();
}

module.exports = {
  db: null,
  run,
  get,
  all,
  initSchema,
  closeDB
};
