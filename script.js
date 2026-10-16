(() => {
    "use strict";

    const $ = selector => document.querySelector(selector);
    const $$ = selector => [...document.querySelectorAll(selector)];

    const STORAGE_KEY = "taskflow.tasks.v1";
    const THEME_KEY = "taskflow.theme.v1";

    const DAILY_GOAL = 5;
    const FOCUS_SECONDS = 25 * 60;
    const BREAK_SECONDS = 5 * 60;

    const els = {
        currentDate: $("#currentDate"),
        themeBtn: $("#themeBtn"),
        themeMenuBtn: $("#themeMenuBtn"),

        addTaskBtn: $("#addTaskBtn"),
        formSection: $("#taskFormSection"),
        form: $("#taskForm"),
        formHeading: $("#taskFormHeading"),
        editingId: $("#editingTaskId"),
        title: $("#taskTitle"),
        category: $("#taskCategory"),
        priority: $("#taskPriority"),
        dueDate: $("#taskDueDate"),
        saveTaskBtn: $("#saveTaskBtn"),
        closeForm: $("#closeTaskFormBtn"),
        cancelForm: $("#cancelTaskBtn"),

        total: $("#totalTasks"),
        pending: $("#pendingTasks"),
        completed: $("#completedTasks"),
        progressPercent: $("#progressPercent"),
        progressFill: $("#progressFill"),
        progressTrack: $("#progressTrack"),

        search: $("#searchInput"),
        categoryFilter: $("#categoryFilter"),
        statusFilter: $("#statusFilter"),
        taskList: $("#taskList"),
        emptyState: $("#emptyState"),
        emptyTitle: $("#emptyStateTitle"),
        emptyDescription: $("#emptyStateDescription"),
        emptyAdd: $("#emptyAddTaskBtn"),

        viewAll: $("#viewAllBtn"),
        tasksHeading: $("#tasksHeading"),
        navLinks: $$(".nav-link"),

        dailyGoalCount: $("#dailyGoalCount"),
        dailyGoalFill: $("#dailyGoalFill"),
        dailyGoalTrack: $("#dailyGoalTrack"),

        profileMenu: $("#profileMenuBtn"),
        profileDropdown: $("#profileDropdown"),
        clearCompleted: $("#clearCompletedBtn"),

        sidebarFocus: $("#sidebarFocusBtn"),
        startFocus: $("#startFocusBtn"),
        focusModal: $("#focusModal"),
        closeFocus: $("#closeFocusBtn"),
        resetFocus: $("#resetFocusBtn"),
        toggleFocus: $("#toggleFocusBtn"),
        focusBreak: $("#focusBreakBtn"),
        focusTimer: $("#focusTimer"),
        timerPreview: $("#timerPreview"),
        focusStatus: $("#focusStatus"),
        focusStatusText: $("#focusStatusText"),
        focusTitle: $("#focusModalTitle")
    };

    let tasks = loadTasks();
    let currentView = "dashboard";

    let focusInterval = null;
    let focusRemaining = FOCUS_SECONDS;
    let focusMode = "focus";
    let focusRunning = false;

    /* =========================
       STORAGE
    ========================= */

    function loadTasks() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            if (!Array.isArray(saved)) return [];

            return saved
                .filter(task =>
                    task &&
                    typeof task.id === "string" &&
                    typeof task.title === "string"
                )
                .map(task => ({
                    id: task.id,
                    title: task.title,
                    category: [
                        "Study", "Work", "Personal", "Other"
                    ].includes(task.category)
                        ? task.category
                        : "Other",
                    priority: [
                        "High", "Medium", "Low"
                    ].includes(task.priority)
                        ? task.priority
                        : "Medium",
                    dueDate: typeof task.dueDate === "string"
                        ? task.dueDate
                        : "",
                    completed: Boolean(task.completed),
                    createdAt: Number(task.createdAt) || Date.now(),
                    completedAt: Number(task.completedAt) || null
                }));
        } catch (error) {
            console.warn("Unable to load saved tasks:", error);
            return [];
        }
    }

    function saveTasks() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(tasks)
            );
        } catch (error) {
            console.warn("Unable to save tasks:", error);
            alert("Tasks could not be saved in this browser.");
        }
    }

    function createId() {
        if (
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
        ) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    /* =========================
       DATE HELPERS
    ========================= */

    function localDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatDate(dateString) {
        if (!dateString) return "No due date";

        const date = new Date(`${dateString}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return "No due date";
        }

        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    function updateDate() {
        els.currentDate.textContent = new Date().toLocaleDateString(
            undefined,
            {
                weekday: "short",
                month: "short",
                day: "numeric"
            }
        );
    }

    /* =========================
       THEME
    ========================= */

    function setTheme(theme) {
        const selected = theme === "dark" ? "dark" : "light";

        document.documentElement.dataset.theme = selected;

        try {
            localStorage.setItem(THEME_KEY, selected);
        } catch (_) {}

        els.themeBtn.textContent = selected === "dark" ? "☀" : "☾";

        els.themeBtn.setAttribute(
            "aria-label",
            selected === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
        );

        els.themeBtn.title = selected === "dark"
            ? "Switch to light theme"
            : "Switch to dark theme";
    }

    function toggleTheme() {
        const current = document.documentElement.dataset.theme;

        setTheme(current === "dark" ? "light" : "dark");
    }

    /* =========================
       TASK FORM
    ========================= */

    function openForm(task = null) {
        els.form.reset();

        els.editingId.value = task ? task.id : "";

        els.formHeading.textContent = task
            ? "Edit task"
            : "Create a new task";

        els.saveTaskBtn.textContent = task
            ? "Update Task"
            : "Save Task";

        els.title.value = task ? task.title : "";
        els.category.value = task ? task.category : "Study";
        els.priority.value = task ? task.priority : "Medium";
        els.dueDate.value = task ? task.dueDate : "";

        els.formSection.hidden = false;

        els.formSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        window.setTimeout(() => els.title.focus(), 150);
    }

    function closeForm() {
        els.formSection.hidden = true;
        els.form.reset();
        els.editingId.value = "";
    }

    function handleFormSubmit(event) {
        event.preventDefault();

        const title = els.title.value.trim();

        if (!title) {
            els.title.focus();
            return;
        }

        const editingId = els.editingId.value;

        const payload = {
            title,
            category: els.category.value,
            priority: els.priority.value,
            dueDate: els.dueDate.value
        };

        if (editingId) {
            const existingTask = tasks.find(
                task => task.id === editingId
            );

            if (existingTask) {
                Object.assign(existingTask, payload);
            }
        } else {
            tasks.unshift({
                id: createId(),
                ...payload,
                completed: false,
                createdAt: Date.now(),
                completedAt: null
            });
        }

        saveTasks();
        closeForm();
        render();
    }

    /* =========================
       TASK FILTERING
    ========================= */

    function visibleTasks() {
        const query = els.search.value.trim().toLowerCase();
        const category = els.categoryFilter.value;
        const status = els.statusFilter.value;
        const today = localDateString();

        return tasks.filter(task => {
            const matchesQuery =
                !query ||
                task.title.toLowerCase().includes(query) ||
                task.category.toLowerCase().includes(query);

            const matchesCategory =
                category === "all" ||
                task.category === category;

            const matchesStatus =
                status === "all" ||
                (status === "completed" && task.completed) ||
                (status === "pending" && !task.completed);

            let matchesView = true;

            if (currentView === "today") {
                matchesView = task.dueDate === today;
            }

            if (currentView === "upcoming") {
                matchesView =
                    Boolean(task.dueDate) &&
                    task.dueDate > today &&
                    !task.completed;
            }

            if (currentView === "completed") {
                matchesView = task.completed;
            }

            return (
                matchesQuery &&
                matchesCategory &&
                matchesStatus &&
                matchesView
            );
        });
    }

    /* =========================
       SAFE HTML
    ========================= */

    function escapeHTML(value) {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return String(value).replace(
            /[&<>"']/g,
            character => characters[character]
        );
    }

    /* =========================
       RENDER TASKS
    ========================= */

    function taskMarkup(task) {
        const title = escapeHTML(task.title);
        const id = escapeHTML(task.id);
        const category = escapeHTML(task.category);
        const priority = escapeHTML(task.priority);
        const date = escapeHTML(formatDate(task.dueDate));

        return `
            <article
                class="task-item ${task.completed ? "completed" : ""}"
                data-task-id="${id}"
            >
                <input
                    class="task-checkbox"
                    type="checkbox"
                    data-action="toggle"
                    aria-label="Mark ${title} as ${
                        task.completed ? "pending" : "completed"
                    }"
                    ${task.completed ? "checked" : ""}
                >

                <div class="task-content">
                    <h3>${title}</h3>
                    <p>${task.dueDate ? `Due ${date}` : date}</p>
                </div>

                <div class="task-meta">
                    <span class="task-category">${category}</span>
                    <span class="task-priority ${task.priority.toLowerCase()}">
                        ${priority}
                    </span>
                </div>

                <div class="task-actions">
                    <button
                        type="button"
                        class="task-action-btn"
                        data-action="edit"
                        aria-label="Edit ${title}"
                        title="Edit task"
                    >✎</button>

                    <button
                        type="button"
                        class="task-action-btn delete"
                        data-action="delete"
                        aria-label="Delete ${title}"
                        title="Delete task"
                    >×</button>
                </div>
            </article>
        `;
    }

    function renderTasks() {
        const filteredTasks = visibleTasks();

        els.taskList.innerHTML = filteredTasks
            .map(taskMarkup)
            .join("");

        els.emptyState.hidden = filteredTasks.length > 0;

        if (filteredTasks.length === 0) {
            const hasTasks = tasks.length > 0;

            els.emptyTitle.textContent = hasTasks
                ? "No matching tasks"
                : "Your workspace is ready!";

            els.emptyDescription.textContent = hasTasks
                ? "Try another search or change the filters."
                : "Add your first task and start making progress towards your goals.";

            els.emptyAdd.hidden = hasTasks;
        }
    }

    /* =========================
       STATISTICS
    ========================= */

    function renderStats() {
        const completedCount = tasks.filter(
            task => task.completed
        ).length;

        const pendingCount = tasks.length - completedCount;

        const percentage = tasks.length
            ? Math.round(completedCount / tasks.length * 100)
            : 0;

        els.total.textContent = tasks.length;
        els.pending.textContent = pendingCount;
        els.completed.textContent = completedCount;

        els.progressPercent.textContent = `${percentage}%`;
        els.progressFill.style.width = `${percentage}%`;

        els.progressTrack.setAttribute(
            "aria-valuenow",
            String(percentage)
        );

        const today = localDateString();

        const completedToday = tasks.filter(task =>
            task.completed &&
            task.completedAt &&
            localDateString(new Date(task.completedAt)) === today
        ).length;

        const goalProgress = Math.min(
            100,
            Math.round(completedToday / DAILY_GOAL * 100)
        );

        els.dailyGoalCount.textContent =
            `${Math.min(completedToday, DAILY_GOAL)} / ${DAILY_GOAL}`;

        els.dailyGoalFill.style.width = `${goalProgress}%`;

        els.dailyGoalTrack.setAttribute(
            "aria-valuenow",
            String(Math.min(completedToday, DAILY_GOAL))
        );
    }

    /* =========================
       NAVIGATION
    ========================= */

    function updateNavigation() {
        els.navLinks.forEach(link => {
            link.classList.toggle(
                "active",
                link.dataset.view === currentView
            );
        });

        const labels = {
            dashboard: "Dashboard",
            all: "All Tasks",
            today: "Today",
            upcoming: "Upcoming",
            completed: "Completed"
        };

        els.tasksHeading.textContent =
            currentView === "dashboard" || currentView === "all"
                ? "My Tasks"
                : labels[currentView];

        els.viewAll.textContent =
            currentView === "all"
                ? "Show Dashboard Tasks ↑"
                : "View All →";
    }

    function setView(view) {
        const allowedViews = [
            "dashboard",
            "all",
            "today",
            "upcoming",
            "completed"
        ];

        currentView = allowedViews.includes(view)
            ? view
            : "dashboard";

        if (currentView === "completed") {
            els.statusFilter.value = "completed";
        } else if (
            currentView === "today" ||
            currentView === "upcoming"
        ) {
            els.statusFilter.value = "pending";
        } else {
            els.statusFilter.value = "all";
        }

        render();

        if (currentView !== "dashboard") {
            $("#tasks").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }

    function render() {
        updateNavigation();
        renderStats();
        renderTasks();
        updateDate();
    }

    /* =========================
       TASK ACTIONS
    ========================= */

    function onTaskListAction(event) {
        const target = event.target.closest("[data-action]");

        if (!target) return;

        const card = target.closest("[data-task-id]");

        if (!card) return;

        const task = tasks.find(
            item => item.id === card.dataset.taskId
        );

        if (!task) return;

        const action = target.dataset.action;

        if (action === "toggle") {
            task.completed = target.checked;
            task.completedAt = task.completed ? Date.now() : null;

            saveTasks();
            render();
        }

        if (action === "edit") {
            openForm(task);
        }

        if (action === "delete") {
            const confirmed = window.confirm(
                `Delete "${task.title}"?`
            );

            if (!confirmed) return;

            tasks = tasks.filter(item => item.id !== task.id);

            saveTasks();
            render();
        }
    }

    /* =========================
       PROFILE MENU
    ========================= */

    function openProfileMenu() {
        els.profileDropdown.hidden = !els.profileDropdown.hidden;

        els.profileMenu.setAttribute(
            "aria-expanded",
            String(!els.profileDropdown.hidden)
        );
    }

    function closeProfileMenu() {
        els.profileDropdown.hidden = true;

        els.profileMenu.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    /* =========================
       FOCUS TIMER
    ========================= */

    function formatTimer(seconds) {
        const minutes = Math.floor(seconds / 60)
            .toString()
            .padStart(2, "0");

        const remainingSeconds = Math.max(0, seconds % 60)
            .toString()
            .padStart(2, "0");

        return `${minutes}:${remainingSeconds}`;
    }

    function updateTimerDisplay() {
        const time = formatTimer(focusRemaining);

        els.focusTimer.textContent = time;
        els.timerPreview.textContent = time;

        els.toggleFocus.textContent = focusRunning
            ? "Ⅱ Pause Session"
            : "▶ Start Session";

        els.focusTitle.textContent = focusMode === "break"
            ? "Take a breather."
            : "Time to focus.";

        els.focusBreak.textContent = focusMode === "break"
            ? "Switch to a 25-minute focus"
            : "Switch to a 5-minute break";

        els.focusStatus.classList.toggle(
            "running",
            focusRunning
        );

        if (focusRemaining === 0) {
            els.focusStatusText.textContent = "Session complete!";
        } else if (focusRunning) {
            els.focusStatusText.textContent = focusMode === "break"
                ? "Break in progress"
                : "You are in focus mode";
        } else {
            els.focusStatusText.textContent = "Ready when you are";
        }
    }

    function stopFocusInterval() {
        if (focusInterval !== null) {
            window.clearInterval(focusInterval);
        }

        focusInterval = null;
        focusRunning = false;
    }

    function startFocusInterval() {
        if (focusRemaining <= 0) {
            focusRemaining = focusMode === "break"
                ? BREAK_SECONDS
                : FOCUS_SECONDS;
        }

        if (focusInterval !== null) {
            window.clearInterval(focusInterval);
        }

        focusRunning = true;
        updateTimerDisplay();

        focusInterval = window.setInterval(() => {
            focusRemaining--;

            if (focusRemaining <= 0) {
                focusRemaining = 0;
                stopFocusInterval();
                updateTimerDisplay();

                try {
                    if (
                        "Notification" in window &&
                        Notification.permission === "granted"
                    ) {
                        new Notification("TaskFlow", {
                            body: focusMode === "break"
                                ? "Break finished. Ready to focus?"
                                : "Focus session complete. Great work!"
                        });
                    }
                } catch (_) {}

                return;
            }

            updateTimerDisplay();
        }, 1000);
    }

    function openFocusModal() {
        els.focusModal.hidden = false;
        updateTimerDisplay();
        els.closeFocus.focus();
    }

    function closeFocusModal() {
        els.focusModal.hidden = true;
    }

    function resetFocus() {
        stopFocusInterval();

        focusRemaining = focusMode === "break"
            ? BREAK_SECONDS
            : FOCUS_SECONDS;

        updateTimerDisplay();
    }

    function switchFocusMode() {
        stopFocusInterval();

        focusMode = focusMode === "break"
            ? "focus"
            : "break";

        focusRemaining = focusMode === "break"
            ? BREAK_SECONDS
            : FOCUS_SECONDS;

        updateTimerDisplay();
    }

    /* =========================
       EVENT LISTENERS
    ========================= */

    els.addTaskBtn.addEventListener("click", () => openForm());

    els.emptyAdd.addEventListener("click", () => openForm());

    els.closeForm.addEventListener("click", closeForm);

    els.cancelForm.addEventListener("click", closeForm);

    els.form.addEventListener("submit", handleFormSubmit);

    els.taskList.addEventListener("click", onTaskListAction);

    els.taskList.addEventListener("change", onTaskListAction);

    els.search.addEventListener("input", renderTasks);

    els.categoryFilter.addEventListener("change", renderTasks);

    els.statusFilter.addEventListener("change", renderTasks);

    els.viewAll.addEventListener("click", () => {
        setView(currentView === "all" ? "dashboard" : "all");
    });

    els.navLinks.forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            setView(link.dataset.view);
        });
    });

    els.themeBtn.addEventListener("click", toggleTheme);

    els.themeMenuBtn.addEventListener("click", () => {
        toggleTheme();
        closeProfileMenu();
    });

    els.profileMenu.addEventListener("click", openProfileMenu);

    els.clearCompleted.addEventListener("click", () => {
        const completedCount = tasks.filter(
            task => task.completed
        ).length;

        if (completedCount === 0) {
            closeProfileMenu();
            alert("There are no completed tasks to clear.");
            return;
        }

        const confirmed = window.confirm(
            `Clear ${completedCount} completed task${
                completedCount === 1 ? "" : "s"
            }?`
        );

        if (confirmed) {
            tasks = tasks.filter(task => !task.completed);

            saveTasks();
            render();
        }

        closeProfileMenu();
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".profile")) {
            closeProfileMenu();
        }
    });

    els.sidebarFocus.addEventListener("click", openFocusModal);

    els.startFocus.addEventListener("click", openFocusModal);

    els.closeFocus.addEventListener("click", closeFocusModal);

    els.focusModal.addEventListener("click", event => {
        if (event.target === els.focusModal) {
            closeFocusModal();
        }
    });

    els.toggleFocus.addEventListener("click", () => {
        if (focusRunning) {
            stopFocusInterval();
            updateTimerDisplay();
        } else {
            startFocusInterval();
        }
    });

    els.resetFocus.addEventListener("click", resetFocus);

    els.focusBreak.addEventListener("click", switchFocusMode);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeForm();
            closeProfileMenu();

            if (!els.focusModal.hidden) {
                closeFocusModal();
            }
        }
    });

    /* =========================
       INITIALIZE APP
    ========================= */

    let savedTheme = "light";

    try {
        savedTheme = localStorage.getItem(THEME_KEY) || "light";
    } catch (_) {}

    setTheme(savedTheme);
    updateTimerDisplay();
    render();
})();