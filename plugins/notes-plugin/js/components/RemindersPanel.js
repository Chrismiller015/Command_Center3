export class RemindersPanel {
    constructor(containerId, onAddReminder, onDeleteReminder) {
        this.container = document.getElementById(containerId); // Needs container, e.g., <div id="reminders-panel"></div>
        this.onAddReminder = onAddReminder;
        this.onDeleteReminder = onDeleteReminder;
        this.reminders = [];
        this.activeNoteId = null;

        this.setupUI();
        this.setupEventListeners();
    }

    setupUI() {
        this.container.innerHTML = `
            <div class="p-4 bg-gray-800 rounded-lg shadow-md mt-4">
                <h3 class="font-bold text-lg text-white mb-3">Reminders</h3>
                <div id="reminders-list" class="space-y-2 mb-4 max-h-40 overflow-y-auto">
                    </div>
                <div class="flex flex-col space-y-2">
                    <input type="datetime-local" id="reminder-datetime" class="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2">
                    <input type="text" id="reminder-message" placeholder="Optional message..." class="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2">
                    <button id="add-reminder-btn" class="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700">Add Reminder</button>
                </div>
            </div>
        `;
        this.remindersListEl = this.container.querySelector('#reminders-list');
        this.addReminderBtn = this.container.querySelector('#add-reminder-btn');
        this.reminderDatetimeInput = this.container.querySelector('#reminder-datetime');
        this.reminderMessageInput = this.container.querySelector('#reminder-message');
    }

    setupEventListeners() {
        this.addReminderBtn.addEventListener('click', () => this.handleAddReminder());
        this.remindersListEl.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-reminder-btn')) {
                const reminderId = parseInt(event.target.dataset.id);
                this.onDeleteReminder(reminderId);
            }
        });
    }

    handleAddReminder() {
        const datetime = this.reminderDatetimeInput.value;
        const message = this.reminderMessageInput.value.trim();
        if (datetime) {
            this.onAddReminder(datetime, message);
            this.reminderDatetimeInput.value = '';
            this.reminderMessageInput.value = '';
        } else {
            alert('Please select a date and time for the reminder.');
        }
    }

    renderReminders(reminders, activeNoteId) {
        this.reminders = reminders;
        this.activeNoteId = activeNoteId;
        this.remindersListEl.innerHTML = '';

        if (this.reminders.length === 0) {
            this.remindersListEl.innerHTML = '<p class="text-center text-gray-500 text-sm">No reminders set.</p>';
            return;
        }

        this.reminders.forEach(reminder => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center bg-gray-700 p-2 rounded-md';
            item.innerHTML = `
                <div>
                    <p class="text-sm font-bold">${new Date(reminder.targetDate).toLocaleString()}</p>
                    <p class="text-xs text-gray-400">${reminder.message || 'No message'}</p>
                </div>
                <button class="delete-reminder-btn px-2 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-700" data-id="${reminder.id}">Delete</button>
            `;
            this.remindersListEl.appendChild(item);
        });
    }

    clear() {
        this.remindersListEl.innerHTML = '';
        this.reminders = [];
        this.reminderDatetimeInput.value = '';
        this.reminderMessageInput.value = '';
    }
}