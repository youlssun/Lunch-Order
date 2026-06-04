/**
 * Order CRUD and summaries — max 1 lunch per person per day
 */
const MAX_QTY_PER_DAY = 1;

function generateOrderId() {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getActiveOrder(orders, userId, dateKey) {
  return orders.find(
    (o) =>
      o.userId === userId &&
      o.date === dateKey &&
      o.status === "active"
  );
}

function placeOrder(userId, userName, dateKey, quantity) {
  const qty = Number(quantity);
  if (qty > MAX_QTY_PER_DAY) {
    return { ok: false, message: "Only one lunch per person per day is allowed." };
  }

  const orders = loadOrders();
  const existing = getActiveOrder(orders, userId, dateKey);
  if (existing) {
    return {
      ok: false,
      message: "You already have an order for this date. Cancel it first to reorder.",
    };
  }
  orders.push({
    id: generateOrderId(),
    userId,
    userName,
    date: dateKey,
    quantity: MAX_QTY_PER_DAY,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  saveOrders(orders);
  return { ok: true };
}

function updateOrderQuantity(orderId, quantity, isAdmin) {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return { ok: false, message: "Order not found." };

  const order = orders[idx];
  if (order.status !== "active") {
    return { ok: false, message: "Cancelled orders cannot be edited." };
  }
  if (!isAdmin && !canEmployeeModify(order.date)) {
    return {
      ok: false,
      message: "Changes are not allowed after 9:00 AM CST on the order day.",
    };
  }

  const qty = Number(quantity);
  if (qty > MAX_QTY_PER_DAY) {
    return { ok: false, message: "Only one lunch per person per day is allowed." };
  }
  if (qty !== MAX_QTY_PER_DAY) {
    return { ok: false, message: "Order quantity must be 1." };
  }

  orders[idx].quantity = MAX_QTY_PER_DAY;
  orders[idx].updatedAt = new Date().toISOString();
  saveOrders(orders);
  return { ok: true };
}

function cancelOrder(orderId, isAdmin) {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return { ok: false, message: "Order not found." };

  const order = orders[idx];
  if (order.status === "cancelled") {
    return { ok: false, message: "This order is already cancelled." };
  }
  if (!isAdmin && !canEmployeeModify(order.date)) {
    return {
      ok: false,
      message: "Cancellation is not allowed after 9:00 AM CST on the order day.",
    };
  }

  orders[idx].status = "cancelled";
  orders[idx].cancelledAt = new Date().toISOString();
  orders[idx].updatedAt = new Date().toISOString();
  saveOrders(orders);
  return { ok: true };
}

function deleteOrder(orderId) {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return { ok: false, message: "Order not found." };
  orders.splice(idx, 1);
  saveOrders(orders);
  return { ok: true };
}

/** 관리자: 임의 날짜·직원 주문 생성/덮어쓰기 */
function adminUpsertOrder(userId, userName, dateKey, quantity) {
  const orders = loadOrders();
  const existing = getActiveOrder(orders, userId, dateKey);
  if (existing) {
    return {
      ok: false,
      message: "This employee already has an order for this date.",
    };
  }
  return placeOrder(userId, userName, dateKey, quantity);
}

function getOrdersForDate(dateKey) {
  return loadOrders().filter(
    (o) => o.date === dateKey && o.status === "active"
  );
}

function getDailyTotal(dateKey) {
  return getOrdersForDate(dateKey).reduce((s, o) => s + o.quantity, 0);
}

function getUserOrdersInRange(userId, dateKeys) {
  return loadOrders().filter(
    (o) =>
      o.userId === userId &&
      dateKeys.includes(o.date) &&
      o.status === "active"
  );
}

function reportCellValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatReportCell(value) {
  return String(reportCellValue(value));
}

function getMonthlySummary(year, month) {
  const dateKeys = getMonthKeys(year, month);
  const users = loadUsers().filter((u) => u.role === "employee");
  const orders = loadOrders().filter(
    (o) => dateKeys.includes(o.date) && o.status === "active"
  );

  const byUser = {};
  users.forEach((u) => {
    const byDate = {};
    dateKeys.forEach((k) => {
      byDate[k] = 0;
    });
    byUser[u.id] = { name: u.name, total: 0, byDate: byDate };
  });

  orders.forEach((o) => {
    if (!byUser[o.userId]) {
      const byDate = {};
      dateKeys.forEach((k) => {
        byDate[k] = 0;
      });
      byUser[o.userId] = { name: o.userName, total: 0, byDate: byDate };
    }
    if (dateKeys.includes(o.date)) {
      byUser[o.userId].byDate[o.date] = reportCellValue(o.quantity);
      byUser[o.userId].total = dateKeys.reduce(function (sum, k) {
        return sum + reportCellValue(byUser[o.userId].byDate[k]);
      }, 0);
    }
  });

  Object.keys(byUser).forEach(function (uid) {
    byUser[uid].total = dateKeys.reduce(function (sum, k) {
      return sum + reportCellValue(byUser[uid].byDate[k]);
    }, 0);
  });

  const grandTotal = dateKeys.reduce(function (sum, k) {
    return sum + getOrdersForDate(k).length;
  }, 0);
  return { dateKeys, byUser, grandTotal };
}

function exportMonthlyCsv(year, month) {
  const { dateKeys, byUser, grandTotal } = getMonthlySummary(year, month);
  const header = ["Employee ID", "Name", ...dateKeys, "Month total"];
  const rows = [header];

  Object.entries(byUser).forEach(([uid, data]) => {
    rows.push([
      uid,
      data.name,
      ...dateKeys.map((k) => formatReportCell(data.byDate[k])),
      formatReportCell(data.total),
    ]);
  });

  rows.push([
    "",
    "Daily total",
    ...dateKeys.map((k) => formatReportCell(getOrdersForDate(k).length)),
    formatReportCell(grandTotal),
  ]);

  const bom = "\uFEFF";
  const csv = bom + rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lunch_orders_${year}_${pad2(month)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(val) {
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
