import db from "../db.js";

function toNumber(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

async function getOrCreateActiveCart(connection, studentId) {
  const [carts] = await connection.execute(
    `SELECT cart_id
     FROM carts
     WHERE student_id = ? AND status = 'ACTIVE'
     LIMIT 1`,
    [studentId],
  );

  if (carts.length) {
    return carts[0].cart_id;
  }

  const [result] = await connection.execute(
    `INSERT INTO carts (student_id, status)
     VALUES (?, 'ACTIVE')`,
    [studentId],
  );

  return result.insertId;
}

function mapCartRows(rows) {
  const subtotal = rows.reduce(
    (total, item) => total + toNumber(item.price_snapshot),
    0,
  );

  return {
    items: rows.map((item) => ({
      id: item.cart_item_id,
      priceSnapshot: toNumber(item.price_snapshot),
      addedAt: item.added_at,
      batch: {
        id: item.batch_id,
        code: item.batch_code,
        name: item.batch_name,
        startDate: item.start_date,
        endDate: item.end_date,
        status: item.batch_status,
        tuitionFee:
          item.tuition_fee === null ? null : toNumber(item.tuition_fee),
      },
      course: {
        id: item.course_id,
        name: item.course_name,
        description: item.description,
        thumbnailUrl: item.thumbnail_url,
        level: item.level,
        price: toNumber(item.course_price),
      },
      category: {
        id: item.category_id,
        name: item.category_name,
      },
      teacher: {
        id: item.teacher_id,
        fullName: item.teacher_name,
        email: item.teacher_email,
        avatarUrl: item.teacher_avatar_url,
      },
    })),
    summary: {
      itemCount: rows.length,
      subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,
    },
  };
}

export async function getStudentCart(studentId) {
  const connection = await db.getConnection();

  try {
    const cartId = await getOrCreateActiveCart(connection, studentId);
    const [rows] = await connection.execute(
      `SELECT
         ci.cart_item_id,
         ci.price_snapshot,
         ci.added_at,
         cb.batch_id,
         cb.batch_code,
         cb.batch_name,
         cb.start_date,
         cb.end_date,
         cb.status AS batch_status,
         cb.tuition_fee,
         c.course_id,
         c.course_name,
         c.description,
         c.thumbnail_url,
         c.level,
         c.price AS course_price,
         cc.category_id,
         cc.category_name,
         u.user_id AS teacher_id,
         u.full_name AS teacher_name,
         u.email AS teacher_email,
         u.avatar_url AS teacher_avatar_url
       FROM cart_items ci
       INNER JOIN course_batches cb ON cb.batch_id = ci.batch_id
       INNER JOIN courses c ON c.course_id = cb.course_id
       INNER JOIN course_categories cc ON cc.category_id = c.category_id
       INNER JOIN users u ON u.user_id = cb.teacher_id
       WHERE ci.cart_id = ?
       ORDER BY ci.added_at DESC, ci.cart_item_id DESC`,
      [cartId],
    );

    return {
      id: cartId,
      status: "ACTIVE",
      ...mapCartRows(rows),
    };
  } finally {
    connection.release();
  }
}

export async function addStudentCartItem(studentId, batchId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [batchRows] = await connection.execute(
      `SELECT
         cb.batch_id,
         cb.course_id,
         cb.status,
         cb.enrollment_start_date,
         cb.enrollment_deadline,
         cb.max_students,
         COUNT(DISTINCT CASE
           WHEN e.status IN ('PENDING', 'ACTIVE', 'COMPLETED') THEN e.enrollment_id
           ELSE NULL
         END) AS enrolled_count,
         COALESCE(cb.tuition_fee, c.price, 0) AS item_price
       FROM course_batches cb
       INNER JOIN courses c ON c.course_id = cb.course_id
       LEFT JOIN enrollments e ON e.batch_id = cb.batch_id
       WHERE cb.batch_id = ? AND c.status = 'APPROVED'
       GROUP BY
         cb.batch_id,
         cb.course_id,
         cb.status,
         cb.enrollment_start_date,
         cb.enrollment_deadline,
         cb.max_students,
         c.price,
         cb.tuition_fee
       LIMIT 1`,
      [batchId],
    );

    if (!batchRows.length) {
      await connection.rollback();
      return {
        ok: false,
        status: 404,
        message: "Không tìm thấy đợt mở lớp phù hợp.",
      };
    }

    const batch = batchRows[0];

    if (!["OPEN", "STARTED"].includes(batch.status)) {
      await connection.rollback();
      return {
        ok: false,
        status: 400,
        message: "Đợt mở lớp này chưa thể thêm vào giỏ hàng.",
      };
    }
    if (
      batch.enrollment_start_date &&
      new Date(batch.enrollment_start_date) > new Date()
    ) {
      await connection.rollback();
      return {
        ok: false,
        status: 409,
        message: "Lớp này chưa tới thời gian mở đăng ký.",
      };
    }

    if (
      batch.enrollment_deadline &&
      new Date(batch.enrollment_deadline) < new Date(new Date().setHours(0, 0, 0, 0))
    ) {
      await connection.rollback();
      return {
        ok: false,
        status: 409,
        message: "Lớp này đã hết hạn đăng ký.",
      };
    }

    if (
      Number(batch.max_students ?? 0) > 0 &&
      Number(batch.enrolled_count ?? 0) >= Number(batch.max_students ?? 0)
    ) {
      await connection.rollback();
      return {
        ok: false,
        status: 409,
        message: "Lớp này đã đủ số lượng học viên.",
      };
    }

    const [enrollments] = await connection.execute(
      `SELECT enrollment_id
       FROM enrollments
       WHERE student_id = ? AND batch_id = ? AND status IN ('PENDING', 'ACTIVE', 'COMPLETED')
       LIMIT 1`,
      [studentId, batchId],
    );

    if (enrollments.length) {
      await connection.rollback();
      return {
        ok: false,
        status: 409,
        message: "Bạn đã đăng ký khóa học này rồi.",
      };
    }

    const [courseEnrollments] = await connection.execute(
      `SELECT e.enrollment_id, cb.batch_id
       FROM enrollments e
       INNER JOIN course_batches cb ON cb.batch_id = e.batch_id
       WHERE e.student_id = ?
         AND cb.course_id = ?
         AND e.status IN ('PENDING', 'ACTIVE', 'COMPLETED')
       LIMIT 1`,
      [studentId, batch.course_id],
    );

    if (courseEnrollments.length) {
      await connection.rollback();
      return {
        ok: false,
        status: 409,
        message: "Bạn đã đăng ký một lớp của khóa học này rồi.",
      };
    }

    const cartId = await getOrCreateActiveCart(connection, studentId);

    const [existingCourseItems] = await connection.execute(
      `SELECT ci.cart_item_id, ci.batch_id
       FROM cart_items ci
       INNER JOIN course_batches cb ON cb.batch_id = ci.batch_id
       WHERE ci.cart_id = ? AND cb.course_id = ?
       ORDER BY ci.cart_item_id ASC`,
      [cartId, batch.course_id],
    );

    if (existingCourseItems.length) {
      const primaryItem =
        existingCourseItems.find((item) => Number(item.batch_id) === Number(batchId)) ??
        existingCourseItems[0];
      const duplicateItems = existingCourseItems.filter(
        (item) => item.cart_item_id !== primaryItem.cart_item_id,
      );

      if (duplicateItems.length) {
        await connection.execute(
          `DELETE FROM cart_items
           WHERE cart_item_id IN (${duplicateItems.map(() => "?").join(", ")})`,
          duplicateItems.map((item) => item.cart_item_id),
        );
      }

      await connection.execute(
        `UPDATE cart_items
         SET batch_id = ?, price_snapshot = ?, added_at = CURRENT_TIMESTAMP
         WHERE cart_item_id = ?`,
        [batchId, batch.item_price, primaryItem.cart_item_id],
      );
    } else {
      await connection.execute(
        `INSERT INTO cart_items (cart_id, batch_id, price_snapshot)
         VALUES (?, ?, ?)`,
        [cartId, batchId, batch.item_price],
      );
    }

    await connection.commit();

    return {
      ok: true,
      cart: await getStudentCart(studentId),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function removeStudentCartItem(studentId, cartItemId) {
  const connection = await db.getConnection();

  try {
    const [result] = await connection.execute(
      `DELETE ci
       FROM cart_items ci
       INNER JOIN carts cart ON cart.cart_id = ci.cart_id
       WHERE ci.cart_item_id = ?
         AND cart.student_id = ?
         AND cart.status = 'ACTIVE'`,
      [cartItemId, studentId],
    );

    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
}
