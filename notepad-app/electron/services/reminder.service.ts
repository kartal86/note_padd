import { BrowserWindow } from 'electron';
import { reminderRepo } from '../database/repositories/reminder.repo';
import notifier from 'node-notifier';
import * as path from 'path';

class ReminderService {
  private intervalId: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow | null = null;

  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    this.checkReminders();
    this.intervalId = setInterval(() => this.checkReminders(), 60 * 1000);
  }

  private checkReminders(): void {
    try {
      const pending = reminderRepo.getPending();

      for (const reminder of pending) {
        this.fireReminder(reminder);

        if (reminder.repeat !== 'none') {
          reminderRepo.advanceRepeat(reminder.id);
        } else {
          reminderRepo.markDone(reminder.id);
        }
      }
    } catch (error) {
      console.error('Reminder check error:', error);
    }
  }

  private fireReminder(reminder: { id: string; title: string; body: string }): void {
    // Windows toast notification
    notifier.notify({
      title: 'Kişisel Notlarım — ' + reminder.title,
      message: reminder.body || 'Hatırlatıcı zamanı geldi!',
      icon: path.join(__dirname, '../../assets/icon.ico'),
      sound: true,
      wait: false,
    });

    // Send event to renderer if window is open
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('reminder:fired', {
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
      });
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const reminderService = new ReminderService();
