import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
  const dbHost = process.env.DB_HOST || "localhost";
  const dbUser = process.env.DB_USER || "root";
  const dbPassword = process.env.DB_PASSWORD || "";
  const dbName = process.env.DB_NAME || "elearning_system";

  console.log(`[Database Init] Connecting to MySQL at ${dbHost}...`);

  let connection;
  try {
    // 1. Connect without selecting database to verify connection and database existence
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      multipleStatements: true,
    });
  } catch (error) {
    console.error("[Database Init] Connection failed! Make sure your MySQL server is running and .env configuration is correct.", error.message);
    process.exit(1);
  }

  try {
    // 2. Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);

    // 3. Check if table 'users' exists (indicator of initialized DB)
    const [tables] = await connection.query(`SHOW TABLES LIKE 'users';`);

    if (tables.length === 0) {
      console.log(`[Database Init] Database '${dbName}' is not fully initialized. Recreating database for a clean schema setup...`);
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
      await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await connection.query(`USE \`${dbName}\`;`);

      const dbFolder = path.join(__dirname, "..", "database");
      const sqlFiles = [
        "lthdvV2.sql",
        "fix_missing_tables.sql",
        "cart_tables.sql",
        "course_exam_tables.sql",
        "mock_data.sql",
        "add_batch_classroom_fields.sql",
        "add_assignment_lesson_id.sql",
        "add_lesson_video_web_url.sql",
        "alter_user_avatar_url_length.sql",
        "update_course_teacher_reviews.sql",
        "update_student_interactions.sql",
        "update_notification.sql",
        "admin_user_permissions.sql",
        "seed_instructor_teacher4.sql",
        "update_lesson_long_content.sql",
      ];

      // Disable foreign key checks during initialization to prevent errors from out-of-order/missing records in seeds
      await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

      for (const file of sqlFiles) {
        const filePath = path.join(dbFolder, file);
        if (!fs.existsSync(filePath)) {
          console.warn(`[Database Init] Warning: SQL file not found, skipping: ${file}`);
          continue;
        }

        console.log(`[Database Init] Executing: ${file}...`);
        let sqlContent = fs.readFileSync(filePath, "utf8");

        // Dynamically replace the hardcoded "elearning_system" with process.env.DB_NAME
        const regex = /elearning_system/gi;
        sqlContent = sqlContent.replace(regex, dbName);

        // Prevent crash by replacing "CREATE DATABASE" with "CREATE DATABASE IF NOT EXISTS"
        const createDbRegex = new RegExp(`CREATE DATABASE\\s+\\x60?${dbName}\\x60?`, 'i');
        sqlContent = sqlContent.replace(createDbRegex, `CREATE DATABASE IF NOT EXISTS \`${dbName}\``);

        // Disable internal FOREIGN_KEY_CHECKS = 1 during the file execution to respect our global flag
        sqlContent = sqlContent.replace(/SET\s+FOREIGN_KEY_CHECKS\s*=\s*1\s*;?/gi, '-- SET FOREIGN_KEY_CHECKS = 1;');

        // Use INSERT IGNORE to prevent duplicate key constraint crashes on dev/mock data imports
        sqlContent = sqlContent.replace(/INSERT\s+(?!IGNORE\s+)INTO/gi, 'INSERT IGNORE INTO');

        try {
          await connection.query(sqlContent);
        } catch (fileError) {
          console.error(`[Database Init] Error executing file ${file}:`, fileError.message);
          throw fileError;
        }
      }

      // Re-enable foreign key checks after completion
      await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

      // Shift batch dates to be relative to today so that mock courses are currently open and visible to students
      console.log("[Database Init] Shifting mock course batch dates to be currently active...");
      try {
        await connection.query(`
          UPDATE course_batches 
          SET 
            enrollment_start_date = DATE_SUB(CURRENT_DATE(), INTERVAL 10 DAY),
            enrollment_deadline = DATE_ADD(CURRENT_DATE(), INTERVAL 60 DAY),
            start_date = DATE_ADD(CURRENT_DATE(), INTERVAL 15 DAY),
            end_date = DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY)
        `);
      } catch (dateError) {
        console.warn("[Database Init] Warning: Could not update course batch dates:", dateError.message);
      }

      console.log("[Database Init] Successfully initialized all schemas and sample data!");
    } else {
      console.log(`[Database Init] Database '${dbName}' is already initialized. Skipping auto-initialization.`);
    }
  } catch (error) {
    console.error("[Database Init] Critical error during database initialization:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
