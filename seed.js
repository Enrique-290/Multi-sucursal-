import fs from 'fs';
import db from '../db.js';

const schema = fs.readFileSync('./schema.sql','utf-8');
const seed = fs.readFileSync('./seed.sql','utf-8');

db.exec(schema);
db.exec(seed);

console.log('DB inicializada con schema y datos de prueba.');
