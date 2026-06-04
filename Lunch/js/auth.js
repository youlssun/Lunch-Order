function requireAuth(allowedRole) {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  if (allowedRole && session.role !== allowedRole) {
    if (session.role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "employee.html";
    }
    return null;
  }
  return session;
}

function logout() {
  clearSession();
  window.location.href = "index.html";
}
