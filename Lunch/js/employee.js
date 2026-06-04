(function () {
  const session = requireAuth("employee");
  if (!session) return;

  const selectedDates = new Set();
  const userNameEl = document.getElementById("userName");
  const btnLogout = document.getElementById("btnLogout");
  const msgEl = document.getElementById("msg");
  const orderForm = document.getElementById("orderForm");
  const weekDayPicker = document.getElementById("weekDayPicker");
  const myOrdersBody = document.getElementById("myOrdersBody");
  const orderHint = document.getElementById("orderHint");

  if (!userNameEl || !btnLogout || !orderForm || !weekDayPicker || !myOrdersBody || !orderHint) {
    return;
  }

  userNameEl.textContent = session.name;
  btnLogout.addEventListener("click", logout);

  function showMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className = "alert alert--" + (type || "info");
    msgEl.classList.remove("hidden");
    setTimeout(function () {
      msgEl.classList.add("hidden");
    }, 4000);
  }

  function cancelOrderForDate(orderId, dateKey) {
    const result = cancelOrder(orderId, false);
    if (result.ok) {
      showMsg("Order cancelled.", "success");
      selectedDates.delete(dateKey);
      refresh();
    } else {
      showMsg(result.message, "error");
    }
  }

  function canSelectForOrder(dateKey, order) {
    return isOrderableDay(dateKey) && !order;
  }

  function toggleSelect(dateKey) {
    const orders = loadOrders();
    const order = getActiveOrder(orders, session.id, dateKey);
    if (!canSelectForOrder(dateKey, order)) return;

    if (selectedDates.has(dateKey)) {
      selectedDates.delete(dateKey);
    } else {
      selectedDates.add(dateKey);
    }
    updateOrderHint();
    syncPickerSelection(dateKey);
    highlightTableRow(dateKey);
  }

  function syncPickerSelection(dateKey) {
    const card = weekDayPicker.querySelector('[data-date="' + dateKey + '"]');
    if (!card) return;
    const cb = card.querySelector(".week-day-picker__check");
    const selected = selectedDates.has(dateKey);
    if (cb && !cb.disabled) {
      cb.checked = selected;
      card.classList.toggle("week-day-picker__day--selected", selected);
    }
    const stateEl = card.querySelector(".week-day-picker__state");
    if (stateEl && cb && !cb.disabled) {
      stateEl.textContent = selected ? "Selected" : "Tap to select";
    }
  }

  function appendDayCheckbox(parent, options) {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "week-day-picker__check";
    cb.disabled = !!options.disabled;
    cb.checked = !!options.checked;
    if (options.ariaLabel) {
      cb.setAttribute("aria-label", options.ariaLabel);
    }
    parent.appendChild(cb);
    return cb;
  }

  function appendDayBody(parent, dow, dateShort, stateText) {
    parent.insertAdjacentHTML(
      "beforeend",
      '<span class="week-day-picker__dow">' +
        dow +
        "</span>" +
        '<span class="week-day-picker__date">' +
        dateShort +
        "</span>" +
        '<span class="week-day-picker__state">' +
        stateText +
        "</span>"
    );
  }

  function highlightTableRow(dateKey) {
    const row = myOrdersBody.querySelector('[data-date="' + dateKey + '"]');
    if (!row) return;
    row.classList.toggle("weekly-row--selected", selectedDates.has(dateKey));
    const editTd = row.cells[2];
    if (editTd && !editTd.querySelector("button") && !editTd.querySelector(".badge")) {
      editTd.textContent = selectedDates.has(dateKey) ? "Selected" : "—";
    }
  }

  function updateOrderHint() {
    const n = selectedDates.size;
    if (n === 0) {
      orderHint.textContent = "No days selected.";
      document.getElementById("btnSubmit").disabled = false;
      return;
    }
    orderHint.textContent =
      n === 1
        ? "1 day selected — ready to place order."
        : n + " days selected — ready to place orders.";
    document.getElementById("btnSubmit").disabled = false;
  }

  function renderWeekDayPicker(weekKeys, orders) {
    weekDayPicker.innerHTML = "";

    weekKeys.forEach(function (key) {
      const order = getActiveOrder(orders, session.id, key);
      const orderable = isOrderableDay(key);
      const parts = parseDateKey(key);
      const dow =
        DOW_EN[new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()];

      const dateShort = key.slice(5);
      const card = document.createElement(order || !orderable ? "div" : "label");
      card.dataset.date = key;
      card.className = "week-day-picker__day";

      if (order) {
        card.classList.add("week-day-picker__day--ordered");
        appendDayCheckbox(card, {
          disabled: true,
          checked: true,
          ariaLabel: dow + " " + dateShort + " — already ordered",
        });
        appendDayBody(card, dow, dateShort, "Ordered");
      } else if (!orderable) {
        card.classList.add("week-day-picker__day--closed");
        appendDayCheckbox(card, {
          disabled: true,
          checked: false,
          ariaLabel: dow + " " + dateShort + " — closed",
        });
        appendDayBody(card, dow, dateShort, "Closed");
      } else {
        if (selectedDates.has(key)) {
          card.classList.add("week-day-picker__day--selected");
        }
        const cb = appendDayCheckbox(card, {
          disabled: false,
          checked: selectedDates.has(key),
          ariaLabel: "Order lunch for " + dow + " " + dateShort,
        });
        appendDayBody(
          card,
          dow,
          dateShort,
          selectedDates.has(key) ? "Selected" : "Tap to select"
        );
        cb.addEventListener("change", function () {
          if (cb.checked) {
            selectedDates.add(key);
          } else {
            selectedDates.delete(key);
          }
          card.classList.toggle("week-day-picker__day--selected", cb.checked);
          const stateEl = card.querySelector(".week-day-picker__state");
          if (stateEl) {
            stateEl.textContent = cb.checked ? "Selected" : "Tap to select";
          }
          updateOrderHint();
          highlightTableRow(key);
        });
      }

      weekDayPicker.appendChild(card);
    });
  }

  function renderMyOrders(weekKeys, orders) {
    myOrdersBody.innerHTML = "";
    weekKeys.forEach(function (key) {
      const order = getActiveOrder(orders, session.id, key);
      const mod = order ? canEmployeeModify(key) : false;
      const orderable = isOrderableDay(key);
      const tr = document.createElement("tr");
      tr.dataset.date = key;
      if (order) tr.classList.add("weekly-row--ordered");
      if (order && !mod) tr.classList.add("weekly-row--locked");
      if (selectedDates.has(key)) tr.classList.add("weekly-row--selected");

      const dateTd = document.createElement("td");
      dateTd.textContent = formatDateLabel(key);

      const statusTd = document.createElement("td");
      if (order) {
        statusTd.innerHTML = '<span class="badge badge--ok">Ordered</span>';
      } else if (orderable) {
        statusTd.innerHTML = '<span class="badge badge--locked">Not ordered</span>';
      } else {
        statusTd.innerHTML = '<span class="badge badge--locked">Past date</span>';
      }

      const editTd = document.createElement("td");
      if (order && mod) {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "badge badge--cancel-action";
        cancelBtn.textContent = "Can cancel";
        cancelBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          cancelOrderForDate(order.id, key);
        });
        editTd.appendChild(cancelBtn);
      } else if (order || !orderable) {
        editTd.innerHTML = '<span class="badge badge--locked">Closed</span>';
      } else {
        editTd.textContent = selectedDates.has(key) ? "Selected" : "—";
      }

      tr.appendChild(dateTd);
      tr.appendChild(statusTd);
      tr.appendChild(editTd);

      if (!order && orderable) {
        tr.style.cursor = "pointer";
        tr.title = "Click to select or deselect for ordering";
        tr.addEventListener("click", function () {
          toggleSelect(key);
        });
      }

      myOrdersBody.appendChild(tr);
    });
  }

  function refresh() {
    const weekKeys = getWeekdayKeys();
    const orders = loadOrders().filter(function (o) {
      return o.userId === session.id && weekKeys.includes(o.date);
    });

    selectedDates.forEach(function (key) {
      if (!canSelectForOrder(key, getActiveOrder(orders, session.id, key))) {
        selectedDates.delete(key);
      }
    });

    renderWeekDayPicker(weekKeys, orders);
    renderMyOrders(weekKeys, orders);
    updateOrderHint();
  }

  orderForm.addEventListener("submit", function (e) {
    e.preventDefault();

    if (selectedDates.size === 0) {
      showMsg("Select at least one day to order.", "warn");
      return;
    }

    const toPlace = Array.from(selectedDates).filter(function (key) {
      return isOrderableDay(key);
    });

    let placed = 0;
    let failed = 0;
    let lastError = "";

    toPlace.forEach(function (dateKey) {
      const orders = loadOrders();
      if (getActiveOrder(orders, session.id, dateKey)) {
        return;
      }
      const result = placeOrder(session.id, session.name, dateKey, 1);
      if (result.ok) {
        placed++;
        selectedDates.delete(dateKey);
      } else {
        failed++;
        lastError = result.message;
      }
    });

    if (placed > 0) {
      const msg =
        placed === 1
          ? "Order placed for 1 day."
          : "Orders placed for " + placed + " days.";
      showMsg(failed ? msg + " Some days could not be ordered." : msg, "success");
      refresh();
    } else if (failed) {
      showMsg(lastError || "Could not place orders.", "error");
    } else {
      showMsg("No new orders to place for the selected days.", "warn");
      refresh();
    }
  });

  refresh();
})();
