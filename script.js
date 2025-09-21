// script.js — works for both index.html and tasks.html
document.addEventListener("DOMContentLoaded", () => {
  // ======= Shared helpers and storage shape =======
  // users stored as: { "email@domain": { name, password, tasks: [ { id, title, desc, dueDate, priority, completed, createdAt } ] } }
  function loadUsers() {
    const raw = localStorage.getItem("tm_users");
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      // normalize keys -> lowercase
      const out = {};
      Object.entries(parsed).forEach(([k, v]) => {
        const email = (k || "").toString().trim().toLowerCase();
        if (!email) return;
        out[email] = {
          name: v.name || "",
          password: String(v.password || ""),
          tasks: Array.isArray(v.tasks) ? v.tasks : []
        };
      });
      // save normalized back (defensive)
      localStorage.setItem("tm_users", JSON.stringify(out));
      return out;
    } catch (e) {
      console.error("loadUsers parse error", e);
      return {};
    }
  }
  function saveUsers(users) {
    localStorage.setItem("tm_users", JSON.stringify(users));
  }
  function normalizeEmail(e) { return e ? e.toString().trim().toLowerCase() : ""; }
  function uid() { return Math.random().toString(36).slice(2, 9); }

  // ======= PAGE-SPECIFIC LOGIC =======
  const path = window.location.pathname || "";
  const isTasksPage = path.endsWith("tasks.html") || path.includes("tasks.html");

  // ---------- AUTH PAGE (index.html) ----------
  if (!isTasksPage) {
    const users = loadUsers();

    const authTitle = document.getElementById("auth-title");
    const authMessage = document.getElementById("auth-message");
    const nameInput = document.getElementById("auth-name");
    const emailInput = document.getElementById("auth-email");
    const passwordInput = document.getElementById("auth-password");
    const confirmInput = document.getElementById("auth-confirm");
    const authAction = document.getElementById("auth-action");
    const authSwitch = document.getElementById("auth-switch");
    const toggleShowPw = document.getElementById("toggle-show-pw");

    let modeRegister = false; // false = login, true = register

    function setModeRegister(flag) {
      modeRegister = !!flag;
      authTitle.textContent = modeRegister ? "Register" : "Login";
      authAction.textContent = modeRegister ? "Register" : "Login";
      authSwitch.textContent = modeRegister ? "Already have an account? Login" : "Don't have an account? Register";
      nameInput.classList.toggle("hidden", !modeRegister);
      confirmInput.classList.toggle("hidden", !modeRegister);
      authMessage.textContent = "";
    }
    setModeRegister(false);

    // show/hide password
    toggleShowPw.addEventListener("click", () => {
      const t = passwordInput.type === "password" ? "text" : "password";
      passwordInput.type = t;
      confirmInput.type = t;
      toggleShowPw.textContent = t === "password" ? "👁️" : "🙈";
    });

    authSwitch.addEventListener("click", (e) => {
      e.preventDefault();
      setModeRegister(!modeRegister);
    });

    authAction.addEventListener("click", () => {
      const email = normalizeEmail(emailInput.value);
      const pw = passwordInput.value || "";
      const name = (nameInput.value || "").trim();
      const confirm = confirmInput.value || "";

      if (!email || !pw) {
        authMessage.style.color = "crimson";
        authMessage.textContent = "Please enter email and password.";
        return;
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        authMessage.style.color = "crimson";
        authMessage.textContent = "Please enter a valid email.";
        return;
      }

      const allUsers = loadUsers();

      if (modeRegister) {
        if (!name) {
          authMessage.style.color = "crimson";
          authMessage.textContent = "Please enter your name.";
          return;
        }
        if (pw.length < 6) {
          authMessage.style.color = "crimson";
          authMessage.textContent = "Password must be at least 6 characters.";
          return;
        }
        if (pw !== confirm) {
          authMessage.style.color = "crimson";
          authMessage.textContent = "Passwords do not match.";
          return;
        }
        if (allUsers[email]) {
          authMessage.style.color = "crimson";
          authMessage.textContent = "An account with this email already exists.";
          return;
        }
        // create
        allUsers[email] = { name, password: pw, tasks: [] };
        saveUsers(allUsers);
        authMessage.style.color = "green";
        authMessage.textContent = "Registration successful. Redirecting to login...";
        // switch to login mode after a short delay
        setTimeout(() => { setModeRegister(false); passwordInput.value = ""; confirmInput.value = ""; nameInput.value = ""; authMessage.textContent = ""; }, 900);
        return;
      } else {
        // login
        if (!allUsers[email] || allUsers[email].password !== pw) {
          authMessage.style.color = "crimson";
          authMessage.textContent = "Invalid email or password.";
          return;
        }
        // success
        localStorage.setItem("tm_logged", email);
        // redirect to tasks page
        window.location.href = "tasks.html";
      }
    });
    return; // auth page logic complete
  }

  // ---------- TASKS PAGE (tasks.html) ----------
  // Elements
  const users = loadUsers(); // will be reloaded when saving
  let currentEmail = normalizeEmail(localStorage.getItem("tm_logged"));
  if (!currentEmail || !users[currentEmail]) {
    // not logged in -> go to login
    localStorage.removeItem("tm_logged");
    window.location.href = "index.html";
    return;
  }

  const userGreeting = document.getElementById("user-greeting");
  const logoutBtn = document.getElementById("logout-btn");
  const darkToggle = document.getElementById("dark-toggle");

  const titleInput = document.getElementById("task-title");
  const dueInput = document.getElementById("task-due");
  const prioritySelect = document.getElementById("task-priority");
  const descInput = document.getElementById("task-desc");
  const addBtn = document.getElementById("add-task");
  const clearBtn = document.getElementById("clear-form");

  const searchInput = document.getElementById("search");
  const filterPriority = document.getElementById("filter-priority");
  const filterStatus = document.getElementById("filter-status");
  const sortBy = document.getElementById("sort-by");

  const listRoot = document.getElementById("task-list");
  const taskCount = document.getElementById("task-count");
  const totalCount = document.getElementById("total-count");
  const completedCount = document.getElementById("completed-count");
  const progressBar = document.getElementById("progress-bar");
  const progressPercent = document.getElementById("progress-percent");

  // greet
  userGreeting.textContent = `Hi, ${users[currentEmail].name || currentEmail}`;

  // save helper (reload users object each time)
  function getUsers() { return loadUsers(); }
  function getCurrentUserObj() {
    const u = getUsers()[currentEmail];
    if (!u) {
      // fallback
      localStorage.removeItem("tm_logged");
      window.location.href = "index.html";
      return null;
    }
    return u;
  }
  function saveCurrentUser(uObj) {
    const all = getUsers();
    all[currentEmail] = uObj;
    saveUsers(all);
  }

  // clear form
  clearBtn.addEventListener("click", () => {
    titleInput.value = ""; dueInput.value = ""; descInput.value = ""; prioritySelect.value = "medium";
  });

  // add task
  addBtn.addEventListener("click", () => {
    const title = titleInput.value.trim();
    if (!title) return alert("Task title cannot be empty.");
    const dueDate = dueInput.value || "";
    const priority = prioritySelect.value || "medium";
    const desc = descInput.value.trim() || "";

    const user = getCurrentUserObj();
    const task = { id: uid(), title, desc, dueDate, priority, completed: false, createdAt: new Date().toISOString() };
    user.tasks.unshift(task); // add to front (newest first)
    saveCurrentUser(user);
    renderList();
    clearBtn.click();
  });

  // logout
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("tm_logged");
    window.location.href = "index.html";
  });

  // dark toggle
  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    darkToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });

  // filtering / sorting / searching
  [searchInput, filterPriority, filterStatus, sortBy].forEach(el => {
    if (!el) return;
    el.addEventListener("input", () => renderList());
    el.addEventListener("change", () => renderList());
  });

  // render list
  function renderList() {
    const user = getCurrentUserObj();
    if (!user) return;
    let tasks = Array.isArray(user.tasks) ? [...user.tasks] : [];

    // search
    const q = searchInput.value.trim().toLowerCase();
    if (q) {
      tasks = tasks.filter(t => (t.title || "").toLowerCase().includes(q) || (t.desc || "").toLowerCase().includes(q));
    }
    // filter priority
    const fp = filterPriority.value;
    if (fp && fp !== "all") tasks = tasks.filter(t => t.priority === fp);
    // filter status
    const fs = filterStatus.value;
    if (fs === "pending") tasks = tasks.filter(t => !t.completed);
    if (fs === "completed") tasks = tasks.filter(t => t.completed);

    // sort
    const s = sortBy.value;
    if (s === "created-desc") tasks.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (s === "created-asc") tasks.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (s === "due-asc") tasks.sort((a,b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    if (s === "due-desc") tasks.sort((a,b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(b.dueDate) - new Date(a.dueDate);
    });
    if (s === "priority-desc") {
      const rank = { high:3, medium:2, low:1 };
      tasks.sort((a,b) => (rank[b.priority]||0) - (rank[a.priority]||0));
    }

    // render items
    listRoot.innerHTML = "";
    tasks.forEach((task, idx) => {
      const li = document.createElement("li");
      li.className = "task-item " + (task.priority === "high" ? "border-high" : task.priority === "medium" ? "border-medium" : "border-low");

      const main = document.createElement("div");
      main.className = "task-main";
      const title = document.createElement("div");
      title.className = "task-title";
      title.textContent = task.title;
      if (task.completed) title.style.textDecoration = "line-through";

      const meta = document.createElement("div");
      meta.className = "task-meta";
      const due = task.dueDate ? `Due: ${task.dueDate}` : "No due date";
      const created = `Created: ${new Date(task.createdAt).toLocaleDateString()}`;
      const priorityTag = document.createElement("span");
      priorityTag.className = "tag";
      priorityTag.style.background = task.priority === "high" ? "#ef4444" : task.priority === "medium" ? "#f59e0b" : "#10b981";
      priorityTag.textContent = task.priority.toUpperCase();
      const dueSpan = document.createElement("span");
      dueSpan.textContent = due;
      const createdSpan = document.createElement("span");
      createdSpan.textContent = created;

      meta.appendChild(priorityTag);
      meta.appendChild(dueSpan);
      meta.appendChild(createdSpan);

      if (task.desc) {
        const desc = document.createElement("div");
        desc.className = "task-desc";
        desc.textContent = task.desc;
        main.appendChild(title);
        main.appendChild(desc);
        main.appendChild(meta);
      } else {
        main.appendChild(title);
        main.appendChild(meta);
      }

      const actions = document.createElement("div");
      actions.className = "task-actions";

      const completeBtn = document.createElement("button");
      completeBtn.className = "primary";
      completeBtn.textContent = task.completed ? "Undo" : "Complete";
      completeBtn.addEventListener("click", () => {
        toggleTaskComplete(task.id);
      });

      const editBtn = document.createElement("button");
      editBtn.className = "muted";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        openEditDialog(task.id);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        if (confirm("Delete this task?")) removeTask(task.id);
      });

      actions.appendChild(completeBtn);
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(main);
      li.appendChild(actions);
      listRoot.appendChild(li);
    });

    // counts & progress
    const allTasks = getCurrentUserObj().tasks || [];
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.completed).length;
    taskCount.textContent = `${tasks.length} shown`;
    totalCount.textContent = total;
    completedCount.textContent = completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressBar.style.width = percent + "%";
    progressPercent.textContent = percent + "%";
  }

  // helper operations (find by id)
  function getCurrentUserObj() { return getUsers()[currentEmail]; }
  function toggleTaskComplete(id) {
    const user = getCurrentUserObj();
    const idx = user.tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    user.tasks[idx].completed = !user.tasks[idx].completed;
    saveCurrentUser(user);
    renderList();
  }
  function removeTask(id) {
    const user = getCurrentUserObj();
    user.tasks = user.tasks.filter(t => t.id !== id);
    saveCurrentUser(user);
    renderList();
  }
  function openEditDialog(id) {
    const user = getCurrentUserObj();
    const t = user.tasks.find(x => x.id === id);
    if (!t) return;
    // Simple modal-less edit: reuse form for editing
    if (!confirm("Edit this task using the form? (OK to load into form)")) return;
    titleInput.value = t.title;
    dueInput.value = t.dueDate || "";
    prioritySelect.value = t.priority || "medium";
    descInput.value = t.desc || "";

    // remove the original and allow user to add new or re-save: we will delete the old one and let user press Add
    user.tasks = user.tasks.filter(x => x.id !== id);
    saveCurrentUser(user);
    renderList();
  }
  function saveCurrentUser(uObj) { saveUsers({ ...getUsers(), [currentEmail]: uObj }); }
  function renderList() { renderList = renderList; /* no-op to keep linter happy */ renderListImpl(); }
  function renderListImpl() { renderListImpl = renderListImpl; /* closure */ }

  // Because renderList declared earlier, we call implementation directly
  function renderList() { // actual implementation (redeclared to ensure lexical order)
    const user = getCurrentUserObj();
    if (!user) return;
    let tasks = Array.isArray(user.tasks) ? [...user.tasks] : [];

    // search
    const q = (searchInput.value || "").trim().toLowerCase();
    if (q) {
      tasks = tasks.filter(t => (t.title || "").toLowerCase().includes(q) || (t.desc || "").toLowerCase().includes(q));
    }
    // filter priority
    const fp = (filterPriority && filterPriority.value) || "all";
    if (fp !== "all") tasks = tasks.filter(t => t.priority === fp);
    // filter status
    const fs = (filterStatus && filterStatus.value) || "all";
    if (fs === "pending") tasks = tasks.filter(t => !t.completed);
    if (fs === "completed") tasks = tasks.filter(t => t.completed);
    // sort
    const s = (sortBy && sortBy.value) || "created-desc";
    if (s === "created-desc") tasks.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (s === "created-asc") tasks.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (s === "due-asc") tasks.sort((a,b) => (a.dueDate ? new Date(a.dueDate) : 1e13) - (b.dueDate ? new Date(b.dueDate) : 1e13));
    if (s === "due-desc") tasks.sort((a,b) => (b.dueDate ? new Date(b.dueDate) : 1e13) - (a.dueDate ? new Date(a.dueDate) : 1e13));
    if (s === "priority-desc") {
      const r = { high:3, medium:2, low:1 };
      tasks.sort((a,b) => (r[b.priority]||0) - (r[a.priority]||0));
    }

    // render items
    listRoot.innerHTML = "";
    tasks.forEach(task => {
      const li = document.createElement("li");
      li.className = "task-item " + (task.priority === "high" ? "border-high" : task.priority === "medium" ? "border-medium" : "border-low");

      const main = document.createElement("div"); main.className = "task-main";
      const title = document.createElement("div"); title.className = "task-title"; title.textContent = task.title;
      if (task.completed) title.style.textDecoration = "line-through";

      const meta = document.createElement("div"); meta.className = "task-meta";
      const pr = document.createElement("span"); pr.className = "tag"; pr.style.background = task.priority === "high" ? "#ef4444" : task.priority === "medium" ? "#f59e0b" : "#10b981"; pr.textContent = task.priority.toUpperCase();
      const due = document.createElement("span"); due.textContent = task.dueDate ? `Due: ${task.dueDate}` : "No due";
      const created = document.createElement("span"); created.textContent = `Created: ${new Date(task.createdAt).toLocaleDateString()}`;
      meta.append(pr, due, created);

      if (task.desc) {
        const desc = document.createElement("div"); desc.className = "task-desc"; desc.textContent = task.desc;
        main.append(title, desc, meta);
      } else {
        main.append(title, meta);
      }

      const actions = document.createElement("div"); actions.className = "task-actions";
      const completeBtn = document.createElement("button"); completeBtn.className = "primary"; completeBtn.textContent = task.completed ? "Undo" : "Complete";
      completeBtn.addEventListener("click", () => {
        const u = getCurrentUserObj();
        const i = u.tasks.findIndex(x => x.id === task.id);
        if (i >= 0) { u.tasks[i].completed = !u.tasks[i].completed; saveCurrentUser(u); renderList(); }
      });
      const editBtn = document.createElement("button"); editBtn.className = "muted"; editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        const u = getCurrentUserObj();
        const i = u.tasks.findIndex(x => x.id === task.id);
        if (i >= 0) {
          // load into form and remove original
          titleInput.value = u.tasks[i].title;
          dueInput.value = u.tasks[i].dueDate || "";
          prioritySelect.value = u.tasks[i].priority || "medium";
          descInput.value = u.tasks[i].desc || "";
          u.tasks.splice(i,1);
          saveCurrentUser(u);
          renderList();
        }
      });
      const delBtn = document.createElement("button"); delBtn.className = "danger"; delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        if (!confirm("Delete task?")) return;
        const u = getCurrentUserObj();
        u.tasks = u.tasks.filter(x => x.id !== task.id);
        saveCurrentUser(u);
        renderList();
      });

      actions.append(completeBtn, editBtn, delBtn);
      li.append(main, actions);
      listRoot.appendChild(li);
    });

    // update counts
    const all = getCurrentUserObj().tasks || [];
    totalCount.textContent = all.length;
    const comp = all.filter(t => t.completed).length;
    completedCount.textContent = comp;
    const pct = all.length ? Math.round((comp / all.length) * 100) : 0;
    progressBar.style.width = pct + "%";
    progressPercent.textContent = pct + "%";
    taskCount.textContent = `${tasks.length} shown`;
  }

  // initial render
  renderList();

  // expose small helpers used above
  function getUsers(){ return loadUsers(); }
  function saveUsers(u){ return saveUsersGlobal(u); } // forward to global save
  function saveUsersGlobal(u){ localStorage.setItem("tm_users", JSON.stringify(u)); }
  function saveCurrentUser(obj){ const all = getUsers(); all[currentEmail] = obj; saveUsersGlobal(all); }
  function getCurrentUserObj(){ return getUsers()[currentEmail]; }
});
