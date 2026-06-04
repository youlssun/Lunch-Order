/**
 * 로컬 저장소 기반 데이터 (데모용 — 실제 운영 시 서버 DB로 교체)
 */
const STORAGE_KEYS = {
  users: "lunch_users",
  orders: "lunch_orders",
  session: "lunch_session",
};

const DEFAULT_USERS = [
  { id: "admin", password: "admin123", name: "Administrator", department: "", role: "admin" },
  { id: "kim", password: "1234", name: "Kim Cheolsu", department: "Engineering", role: "employee" },
  { id: "lee", password: "1234", name: "Lee Younghee", department: "HR", role: "employee" },
  { id: "park", password: "1234", name: "Park Minsu", department: "Sales", role: "employee" },
];

function normalizeUser(user) {
  return {
    ...user,
    department: user.department != null ? user.department : "",
  };
}

function loadUsers() {
  const raw = localStorage.getItem(STORAGE_KEYS.users);
  let users;
  if (!raw) {
    users = DEFAULT_USERS.map(normalizeUser);
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    return [...users];
  }
  try {
    users = JSON.parse(raw).map(normalizeUser);
  } catch (e) {
    users = DEFAULT_USERS.map(normalizeUser);
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  }
  return users;
}

function getEmployees() {
  return loadUsers().filter(function (u) {
    return u.role === "employee";
  });
}

function addEmployee({ id, name, department, password }) {
  const userId = String(id || "").trim().toLowerCase();
  const userName = String(name || "").trim();
  const dept = String(department || "").trim();
  const pwd = String(password || "");

  if (!userId || !userName || !pwd) {
    return { ok: false, message: "User ID, name, and password are required." };
  }
  if (userId === "admin") {
    return { ok: false, message: "This user ID is reserved." };
  }

  const users = loadUsers();
  if (users.some(function (u) {
    return u.id === userId;
  })) {
    return { ok: false, message: "User ID already exists." };
  }

  users.push({
    id: userId,
    name: userName,
    department: dept,
    password: pwd,
    role: "employee",
  });
  saveUsers(users);
  return { ok: true };
}

function deleteEmployee(userId) {
  const users = loadUsers();
  const user = users.find(function (u) {
    return u.id === userId;
  });
  if (!user) {
    return { ok: false, message: "User not found." };
  }
  if (user.role === "admin") {
    return { ok: false, message: "Cannot delete the admin account." };
  }
  saveUsers(users.filter(function (u) {
    return u.id !== userId;
  }));
  const orders = loadOrders().filter(function (o) {
    return o.userId !== userId;
  });
  saveOrders(orders);
  return { ok: true };
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function loadOrders() {
  const raw = localStorage.getItem(STORAGE_KEYS.orders);
  if (!raw) return [];
  try {
    const orders = JSON.parse(raw);
    return Array.isArray(orders) ? orders : [];
  } catch (e) {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
}

function getSession() {
  const raw = sessionStorage.getItem(STORAGE_KEYS.session);
  return raw ? JSON.parse(raw) : null;
}

function setSession(user) {
  sessionStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({
      id: user.id,
      name: user.name,
      role: user.role,
    })
  );
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEYS.session);
}

function findUserByCredentials(userId, password) {
  const users = loadUsers();
  const id = String(userId || "").trim().toLowerCase();
  return users.find(function (u) {
    return u.id === id && u.password === password;
  });
}
