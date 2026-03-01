const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, initializeDatabase } = require('./config/database');

async function seed() {
  initializeDatabase();

  // Create admin user
  const adminId = uuidv4();
  const hashed = await bcrypt.hash('admin123', 10);
  try {
    db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(
      adminId, 'Dra. María González', 'admin@terapia.com', hashed, 'admin'
    );
    console.log('✓ Usuario admin creado: admin@terapia.com / admin123');
  } catch (e) {
    console.log('Usuario admin ya existe, saltando...');
  }

  // Create therapist
  const therapistId = uuidv4();
  const hashed2 = await bcrypt.hash('terapeuta123', 10);
  try {
    db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(
      therapistId, 'Lic. Carlos Ruiz', 'terapeuta@terapia.com', hashed2, 'therapist'
    );
  } catch (e) {}

  // Create sample patients
  const patients = [
    { name: 'Ana Martínez López', email: 'ana@email.com', phone: '555-1234', birth_date: '2018-03-15', diagnosis: 'Retraso del lenguaje' },
    { name: 'Miguel Hernández', email: 'miguel@email.com', phone: '555-5678', birth_date: '2019-07-22', diagnosis: 'Dislalia funcional' },
    { name: 'Sofía Ramírez', email: 'sofia@email.com', phone: '555-9012', birth_date: '2017-11-08', diagnosis: 'Tartamudez' },
    { name: 'Luis Torres García', email: 'luis@email.com', phone: '555-3456', birth_date: '2015-02-14', diagnosis: 'Trastorno fonológico' },
    { name: 'Isabella Moreno', email: 'isabella@email.com', phone: '555-7890', birth_date: '2020-09-30', diagnosis: 'Retraso del lenguaje expresivo' },
    { name: 'David Jiménez', email: 'david@email.com', phone: '555-2345', birth_date: '2016-05-12', diagnosis: 'Disglosia' },
  ];

  const patientIds = [];
  for (const p of patients) {
    const id = uuidv4();
    patientIds.push(id);
    try {
      db.prepare('INSERT INTO patients (id, name, email, phone, birth_date, diagnosis, therapist_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        id, p.name, p.email, p.phone, p.birth_date, p.diagnosis, adminId
      );
    } catch (e) {}
  }

  // Create exercises
  const exercises = [
    { title: 'Praxias linguales', description: 'Ejercicios de movilidad lingual', category: 'articulacion', difficulty: 'beginner', instructions: 'Mover la lengua hacia arriba, abajo, izquierda y derecha 10 veces cada dirección', duration: 10 },
    { title: 'Soplo controlado', description: 'Control del flujo de aire oral', category: 'respiracion', difficulty: 'beginner', instructions: 'Soplar una vela sin apagarla manteniéndola a 30cm por 30 segundos', duration: 15 },
    { title: 'Repetición de sílabas', description: 'Práctica de sílabas específicas', category: 'fonologia', difficulty: 'intermediate', instructions: 'Repetir las sílabas pa-pe-pi-po-pu 5 veces cada una de forma clara y pausada', duration: 20 },
    { title: 'Discriminación auditiva', description: 'Identificar sonidos similares', category: 'percepcion', difficulty: 'intermediate', instructions: 'Escuchar pares de palabras e identificar si son iguales o diferentes', duration: 15 },
    { title: 'Narración de imágenes', description: 'Expresión verbal con apoyo visual', category: 'lenguaje', difficulty: 'advanced', instructions: 'Describir en detalle lo que aparece en cada imagen durante 2 minutos', duration: 25 },
    { title: 'Respiración diafragmática', description: 'Técnica de respiración para el habla', category: 'respiracion', difficulty: 'beginner', instructions: 'Inhalar por 4 segundos, retener 2 segundos, exhalar por 6 segundos', duration: 10 },
    { title: 'Lectura en voz alta', description: 'Fluidez y prosodia en lectura', category: 'fluidez', difficulty: 'intermediate', instructions: 'Leer un párrafo corto en voz alta a ritmo normal y con expresión adecuada', duration: 20 },
    { title: 'Discriminación fonémica', description: 'Identificar fonemas dentro de palabras', category: 'fonologia', difficulty: 'advanced', instructions: 'Identificar el sonido inicial, medio y final de palabras dadas', duration: 15 },
  ];

  const exerciseIds = [];
  for (const ex of exercises) {
    const id = uuidv4();
    exerciseIds.push(id);
    try {
      db.prepare('INSERT INTO exercises (id, title, description, category, difficulty, instructions, duration, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, ex.title, ex.description, ex.category, ex.difficulty, ex.instructions, ex.duration, adminId
      );
    } catch (e) {}
  }

  // Create appointments
  const today = new Date();
  const statuses = ['completed', 'completed', 'scheduled', 'scheduled', 'cancelled'];
  for (let i = 0; i < 20; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + (i - 10));
    const dateStr = d.toISOString().split('T')[0];
    const patientId = patientIds[i % patientIds.length];
    const status = i < 10 ? (i % 5 === 4 ? 'cancelled' : 'completed') : 'scheduled';
    const id = uuidv4();
    try {
      db.prepare('INSERT INTO appointments (id, patient_id, therapist_id, date, time, duration, type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, patientId, adminId, dateStr, `${9 + (i % 8)}:00`, 60, 'session', status
      );
    } catch (e) {}
  }

  // Create payments
  for (let i = 0; i < 15; i++) {
    const patientId = patientIds[i % patientIds.length];
    const isPaid = i < 10;
    const id = uuidv4();
    try {
      db.prepare('INSERT INTO payments (id, patient_id, amount, currency, status, method, description, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, patientId, 600 + (i * 50), 'MXN',
        isPaid ? 'paid' : 'pending',
        isPaid ? ['efectivo', 'transferencia', 'tarjeta'][i % 3] : null,
        'Sesión de terapia del habla',
        isPaid ? new Date(Date.now() - i * 86400000).toISOString() : null
      );
    } catch (e) {}
  }

  // Assign exercises to patients
  for (let i = 0; i < patientIds.length; i++) {
    for (let j = 0; j < 3; j++) {
      const id = uuidv4();
      try {
        db.prepare('INSERT INTO patient_exercises (id, patient_id, exercise_id, status, progress) VALUES (?, ?, ?, ?, ?)').run(
          id, patientIds[i], exerciseIds[(i + j) % exerciseIds.length],
          j === 0 ? 'completed' : 'in_progress', j === 0 ? 100 : (j === 1 ? 60 : 20)
        );
      } catch (e) {}
    }
  }

  console.log('✓ Datos de prueba creados exitosamente');
  console.log('Acceso: admin@terapia.com / admin123');
}

seed().catch(console.error);
