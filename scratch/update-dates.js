import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", "server", ".env") });

async function run() {
  const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log(`Connecting to database ${process.env.DB_NAME}...`);
  const [result] = await db.execute(`
    UPDATE course_batches 
    SET 
      enrollment_start_date = DATE_SUB(CURRENT_DATE(), INTERVAL 10 DAY),
      enrollment_deadline = DATE_ADD(CURRENT_DATE(), INTERVAL 60 DAY),
      start_date = DATE_ADD(CURRENT_DATE(), INTERVAL 15 DAY),
      end_date = DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY)
  `);

  console.log("Updated rows:", result.affectedRows);
  await db.end();
}

run().catch(console.error);
