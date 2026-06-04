(function () {
  const session = requireAuth("admin");
  if (!session) return;

  document.getElementById("btnLogout").addEventListener("click", logout);

  const msgEl = document.getElementById("msg");

  function showMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className = "alert alert--" + (type || "info");
    msgEl.classList.remove("hidden");
    setTimeout(function () {
      msgEl.classList.add("hidden");
    }, 4000);
  }

  function resetAddEmployeeForm() {
    const form = document.getElementById("addEmployeeForm");
    if (form) form.reset();
  }

  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      const id = tab.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(function (t) {
        t.classList.toggle("tab--active", t === tab);
      });
      document.querySelectorAll(".tab-panel").forEach(function (p) {
        p.classList.toggle("tab-panel--active", p.id === "panel-" + id);
      });
      if (id === "users") {
        resetAddEmployeeForm();
      }
    });
  });

  const adminEmployeePicker = document.getElementById("adminEmployeePicker");
  const dailyDate = document.getElementById("dailyDate");
  const filterDate = document.getElementById("filterDate");
  const todayKey = chicagoDateKey(nowChicago());

  if (dailyDate) dailyDate.value = todayKey;
  if (filterDate) filterDate.value = todayKey;

  function getCheckedEmployeeIds() {
    if (!adminEmployeePicker) return [];
    return Array.from(
      adminEmployeePicker.querySelectorAll(
        ".admin-employee-picker__check:checked:not(:disabled)"
      )
    ).map(function (cb) {
      return cb.value;
    });
  }

  function renderAdminEmployeePicker() {
    if (!adminEmployeePicker || !filterDate) return;
    const dateKey = filterDate.value;
    const orders = loadOrders();
    const employees = getEmployees();
    const previouslyChecked = new Set(getCheckedEmployeeIds());

    adminEmployeePicker.innerHTML = "";

    if (employees.length === 0) {
      adminEmployeePicker.innerHTML =
        '<p class="hint" style="margin:0">No employees registered.</p>';
      return;
    }

    employees.forEach(function (u) {
      const hasOrder = dateKey && getActiveOrder(orders, u.id, dateKey);
      const label = document.createElement("label");
      label.className = "admin-employee-picker__item";
      if (hasOrder) {
        label.classList.add("admin-employee-picker__item--ordered");
      } else if (previouslyChecked.has(u.id)) {
        label.classList.add("admin-employee-picker__item--selected");
      }

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "admin-employee-picker__check";
      cb.value = u.id;
      cb.disabled = !!hasOrder;
      cb.checked = !hasOrder && previouslyChecked.has(u.id);
      cb.setAttribute("aria-label", "Order for " + u.name);

      const nameSpan = document.createElement("span");
      nameSpan.className = "admin-employee-picker__name";
      nameSpan.textContent = u.name;

      cb.addEventListener("change", function () {
        if (cb.disabled) return;
        label.classList.toggle("admin-employee-picker__item--selected", cb.checked);
        loadAdminOrders();
      });

      label.appendChild(cb);
      label.appendChild(nameSpan);
      if (hasOrder) {
        const metaSpan = document.createElement("span");
        metaSpan.className = "admin-employee-picker__meta";
        metaSpan.textContent = "Ordered";
        label.appendChild(metaSpan);
      }
      adminEmployeePicker.appendChild(label);
    });
  }

  function fillEmployeeSelects() {
    renderEmployeeTable();
    renderAdminEmployeePicker();
  }

  function renderEmployeeTable() {
    const usersBody = document.getElementById("usersTableBody");
    usersBody.innerHTML = "";
    const employees = getEmployees();

    if (employees.length === 0) {
      usersBody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:#64748b">No employees yet</td></tr>';
      return;
    }

    employees.forEach(function (u) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        u.id +
        "</td><td>" +
        u.name +
        "</td><td>" +
        (u.department || "—") +
        '</td><td class="btn-group"></td>';

      const btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.className = "btn btn--danger btn--sm";
      btnDelete.textContent = "Delete";
      btnDelete.addEventListener("click", function () {
        if (!confirm("Delete employee \"" + u.name + "\" (" + u.id + ")?")) return;
        const result = deleteEmployee(u.id);
        showMsg(result.ok ? "Employee deleted." : result.message, result.ok ? "success" : "error");
        if (result.ok) {
          fillEmployeeSelects();
        }
      });

      tr.querySelector("td:last-child").appendChild(btnDelete);
      usersBody.appendChild(tr);
    });
  }

  document.getElementById("addEmployeeForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const result = addEmployee({
      id: document.getElementById("newUserId").value,
      name: document.getElementById("newUserName").value,
      department: document.getElementById("newDepartment").value,
      password: document.getElementById("newPassword").value,
    });
    showMsg(result.ok ? "Employee added." : result.message, result.ok ? "success" : "error");
    if (result.ok) {
      resetAddEmployeeForm();
      fillEmployeeSelects();
    }
  });

  resetAddEmployeeForm();

  function loadDaily() {
    if (!dailyDate) return;
    const key = dailyDate.value;
    if (!key) return;
    const list = getOrdersForDate(key);

    document.getElementById("dailyOrderCount").textContent = list.length;

    const tbody = document.getElementById("dailyTableBody");
    tbody.innerHTML = "";
    if (list.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="2" style="text-align:center;color:#64748b">No orders</td></tr>';
      return;
    }
    list.forEach(function (o) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        o.userName +
        "</td><td>" +
        o.userId +
        "</td>";
      tbody.appendChild(tr);
    });
  }

  function loadWeekSummary() {
    const weekKeys = getWeekdayKeys();
    const tbody = document.getElementById("weekSummaryBody");
    tbody.innerHTML = "";
    weekKeys.forEach(function (key) {
      const list = getOrdersForDate(key);
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        formatDateLabel(key) +
        "</td><td><strong>" +
        list.length +
        "</strong></td>";
      tbody.appendChild(tr);
    });
  }

  document.getElementById("btnLoadDaily").addEventListener("click", loadDaily);

  function loadAdminOrders() {
    if (!filterDate) return;
    const dateVal = filterDate.value;
    const userFilter = getCheckedEmployeeIds();
    let orders = loadOrders();
    if (dateVal) {
      orders = orders.filter(function (o) {
        return o.date === dateVal;
      });
    }
    if (userFilter.length > 0) {
      orders = orders.filter(function (o) {
        return userFilter.includes(o.userId);
      });
    }
    orders = orders.filter(function (o) {
      return o.status === "active";
    });
    orders.sort(function (a, b) {
      return a.date.localeCompare(b.date) || a.userName.localeCompare(b.userName);
    });

    const tbody = document.getElementById("adminOrdersBody");
    tbody.innerHTML = "";

    if (orders.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:#64748b">No records</td></tr>';
      return;
    }

    orders.forEach(function (o) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        formatDateLabel(o.date) +
        "</td><td>" +
        o.userName +
        "</td><td>" +
        o.quantity +
        '</td><td class="btn-group"></td>';

      const actions = tr.querySelector("td:last-child");

      const btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.className = "btn btn--danger btn--sm";
      btnDelete.textContent = "Delete";
      btnDelete.addEventListener("click", function () {
        const result = deleteOrder(o.id);
        showMsg(result.ok ? "Order deleted." : result.message, result.ok ? "success" : "error");
        if (result.ok) {
          loadAdminOrders();
          loadDaily();
          loadWeekSummary();
          renderAdminEmployeePicker();
        }
      });
      actions.appendChild(btnDelete);

      tbody.appendChild(tr);
    });
  }

  document.getElementById("btnPlaceOrder").addEventListener("click", function () {
    const dateKey = filterDate.value;
    const selectedIds = getCheckedEmployeeIds();

    if (!dateKey) {
      showMsg("Select a date.", "warn");
      return;
    }
    if (selectedIds.length === 0) {
      showMsg("Check at least one employee to place an order.", "warn");
      return;
    }

    const users = loadUsers();
    let placed = 0;
    let failed = 0;
    let lastError = "";

    selectedIds.forEach(function (uid) {
      const user = users.find(function (u) {
        return u.id === uid;
      });
      if (!user) return;
      const result = adminUpsertOrder(uid, user.name, dateKey, 1);
      if (result.ok) {
        placed++;
      } else {
        failed++;
        lastError = result.message;
      }
    });

    if (placed > 0) {
      const msg =
        placed === 1
          ? "Order placed for 1 employee."
          : "Orders placed for " + placed + " employees.";
      showMsg(failed ? msg + " Some could not be placed." : msg, "success");
      loadAdminOrders();
      loadDaily();
      loadWeekSummary();
      renderAdminEmployeePicker();
    } else if (failed) {
      showMsg(lastError || "Could not place orders.", "error");
    }
  });

  if (filterDate) {
    filterDate.addEventListener("change", function () {
      renderAdminEmployeePicker();
      loadAdminOrders();
    });
  }

  const chicagoNow = getChicagoParts(nowChicago());
  document.getElementById("reportYear").value = chicagoNow.year;
  document.getElementById("reportMonth").value = chicagoNow.month;

  function renderMonthlyPreview() {
    const year = Number(document.getElementById("reportYear").value);
    const month = Number(document.getElementById("reportMonth").value);
    if (!year || month < 1 || month > 12) {
      showMsg("Enter a valid year and month.", "warn");
      return;
    }
    const { dateKeys, byUser, grandTotal } = getMonthlySummary(year, month);

    const head = document.getElementById("monthlyHead");
    const body = document.getElementById("monthlyBody");
    head.innerHTML = "";
    body.innerHTML = "";

    const trh = document.createElement("tr");
    ["Employee", "Name", ...dateKeys.map(function (k) {
      return k.slice(5);
    }), "Total"].forEach(function (h) {
      const th = document.createElement("th");
      th.textContent = h;
      trh.appendChild(th);
    });
    head.appendChild(trh);

    Object.keys(byUser).forEach(function (uid) {
      const data = byUser[uid];
      const tr = document.createElement("tr");
      const cells = [uid, data.name];
      dateKeys.forEach(function (k) {
        cells.push(formatReportCell(data.byDate[k]));
      });
      cells.push(formatReportCell(data.total));
      cells.forEach(function (c) {
        const td = document.createElement("td");
        td.textContent = c;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });

    const trTotal = document.createElement("tr");
    trTotal.style.fontWeight = "bold";
    const totalCells = ["", "Daily total"];
    dateKeys.forEach(function (k) {
      totalCells.push(formatReportCell(getOrdersForDate(k).length));
    });
    totalCells.push(formatReportCell(grandTotal));
    totalCells.forEach(function (c) {
      const td = document.createElement("td");
      td.textContent = c;
      trTotal.appendChild(td);
    });
    body.appendChild(trTotal);
  }

  document.getElementById("btnPreviewMonthly").addEventListener("click", renderMonthlyPreview);
  document.getElementById("btnExportExcel").addEventListener("click", function () {
    const year = Number(document.getElementById("reportYear").value);
    const month = Number(document.getElementById("reportMonth").value);
    if (!year || month < 1 || month > 12) {
      showMsg("Enter a valid year and month.", "warn");
      return;
    }
    exportMonthlyCsv(year, month);
    showMsg("Downloaded report for " + year + "-" + pad2(month) + ".", "success");
  });

  fillEmployeeSelects();
  loadDaily();
  loadWeekSummary();
  loadAdminOrders();
})();
