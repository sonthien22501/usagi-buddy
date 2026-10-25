import { ReminderItem, ReminderState } from '../core/reminderStore';

let currentState: ReminderState = {
  items: [],
  stickyVisible: true,
  theme: 'custard',
};

const questInput = document.getElementById('questInput') as HTMLInputElement | null;
const addQuestBtn = document.getElementById('addQuestBtn') as HTMLButtonElement | null;
const questList = document.getElementById('questList') as HTMLDivElement | null;
const questCounter = document.getElementById('questCounter') as HTMLSpanElement | null;
const clearDoneBtn = document.getElementById('clearDoneBtn') as HTMLButtonElement | null;
const themeToggleBtn = document.getElementById('themeToggleBtn') as HTMLButtonElement | null;
const minimizeBtn = document.getElementById('minimizeBtn') as HTMLButtonElement | null;

function render(state: ReminderState): void {
  currentState = state;
  document.body.setAttribute('data-theme', state.theme);

  if (themeToggleBtn) {
    themeToggleBtn.textContent = state.theme === 'custard' ? '🌙' : '☀️';
    themeToggleBtn.title =
      state.theme === 'custard' ? 'Switch to Night Mode' : 'Switch to Custard Day';
  }

  if (!questList) return;

  questList.innerHTML = '';

  if (state.items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="emoji">✨ 🐰 ✨</div>
      <div>All quests completed!</div>
      <div>Usagi is super proud of you~</div>
    `;
    questList.appendChild(empty);
  } else {
    for (const item of state.items) {
      const row = document.createElement('div');
      row.className = `quest-item ${item.completed ? 'completed' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'quest-checkbox';
      checkbox.checked = item.completed;
      checkbox.addEventListener('change', () => {
        window.usagiAPI?.toggleReminder(item.id);
      });

      const label = document.createElement('span');
      label.className = 'quest-text';
      label.textContent = item.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'quest-delete';
      deleteBtn.textContent = '✕';
      deleteBtn.title = 'Delete Quest';
      deleteBtn.addEventListener('click', () => {
        window.usagiAPI?.deleteReminder(item.id);
      });

      row.appendChild(checkbox);
      row.appendChild(label);
      row.appendChild(deleteBtn);
      questList.appendChild(row);
    }
  }

  const completedCount = state.items.filter((it) => it.completed).length;
  if (questCounter) {
    questCounter.textContent = `${completedCount}/${state.items.length} completed`;
  }
}

function handleAddQuest(): void {
  if (!questInput) return;
  const val = questInput.value.trim();
  if (val && window.usagiAPI) {
    window.usagiAPI.addReminder(val);
    questInput.value = '';
  }
}

function init(): void {
  if (addQuestBtn) {
    addQuestBtn.addEventListener('click', handleAddQuest);
  }

  if (questInput) {
    questInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleAddQuest();
      }
    });
  }

  if (clearDoneBtn) {
    clearDoneBtn.addEventListener('click', () => {
      window.usagiAPI?.clearCompletedReminders();
    });
  }

  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      window.usagiAPI?.toggleStickyWindow();
    });
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = currentState.theme === 'custard' ? 'night' : 'custard';
      window.usagiAPI?.setTheme(nextTheme);
    });
  }

  if (window.usagiAPI) {
    window.usagiAPI.onReminderStateChanged((state) => {
      render(state);
    });

    window.usagiAPI
      .getReminderState()
      .then((state) => {
        if (state) render(state);
      })
      .catch((err) => {
        console.warn('Failed to load initial reminder state:', err);
      });
  }
}

document.addEventListener('DOMContentLoaded', init);
