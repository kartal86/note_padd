import React, { useState, useEffect } from 'react';
import { useApp } from '../../App';
import { ReminderRow } from '../../types';
import { format, isPast } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ReminderModal({ onClose }: { onClose: () => void }) {
  const { reminders, refreshReminders, notes, selectedNoteId } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formFireAt, setFormFireAt] = useState('');
  const [formRepeat, setFormRepeat] = useState<'none' | 'daily' | 'weekly'>('none');
  const [formNoteId, setFormNoteId] = useState<string>(selectedNoteId ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshReminders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formFireAt) return;

    setSaving(true);
    const fireAt = new Date(formFireAt).getTime();

    await window.api.createReminder({
      title: formTitle.trim(),
      body: formBody.trim(),
      fire_at: fireAt,
      repeat: formRepeat,
      note_id: formNoteId || null,
    });

    setFormTitle('');
    setFormBody('');
    setFormFireAt('');
    setFormRepeat('none');
    setFormNoteId('');
    setSaving(false);
    setShowForm(false);
    refreshReminders();
  };

  const handleMarkDone = async (id: string) => {
    await window.api.markReminderDone(id);
    refreshReminders();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hatırlatıcıyı silmek istediğinize emin misiniz?')) {
      await window.api.deleteReminder(id);
      refreshReminders();
    }
  };

  const formatFireAt = (ts: number) => {
    try {
      return format(new Date(ts), "d MMM yyyy, HH:mm", { locale: tr });
    } catch {
      return '';
    }
  };

  const pending = reminders.filter(r => !r.is_done);
  const done = reminders.filter(r => r.is_done);

  // Default datetime value (1 hour from now)
  const defaultDateTime = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 560 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <span className="modal-title">⏰ Hatırlatıcılar</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!showForm && (
              <button
                className="btn btn-primary"
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={() => {
                  setFormFireAt(defaultDateTime());
                  setShowForm(true);
                }}
                id="add-reminder-btn"
              >
                + Yeni
              </button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16
              }}>
                <div className="form-group">
                  <label className="form-label">Başlık *</label>
                  <input
                    id="reminder-title-input"
                    className="form-input"
                    type="text"
                    placeholder="Hatırlatıcı başlığı..."
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Açıklama</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="İsteğe bağlı açıklama..."
                    value={formBody}
                    onChange={e => setFormBody(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Tarih & Saat *</label>
                    <input
                      id="reminder-datetime-input"
                      className="form-input"
                      type="datetime-local"
                      value={formFireAt}
                      onChange={e => setFormFireAt(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tekrarlama</label>
                    <select
                      className="form-select"
                      value={formRepeat}
                      onChange={e => setFormRepeat(e.target.value as 'none' | 'daily' | 'weekly')}
                    >
                      <option value="none">Tekrarsız</option>
                      <option value="daily">Her Gün</option>
                      <option value="weekly">Her Hafta</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Bağlı Not (İsteğe Bağlı)</label>
                  <select
                    className="form-select"
                    value={formNoteId}
                    onChange={e => setFormNoteId(e.target.value)}
                  >
                    <option value="">Not seçin...</option>
                    {notes.map(n => (
                      <option key={n.id} value={n.id}>{n.title || 'Başlıksız Not'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  id="reminder-save-btn"
                  className="btn btn-primary"
                  disabled={saving || !formTitle.trim() || !formFireAt}
                >
                  {saving ? 'Kaydediliyor...' : 'Hatırlatıcı Ekle'}
                </button>
              </div>
            </form>
          )}

          {/* Notice about app-open requirement */}
          <div style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--accent)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11.5,
            color: 'var(--text-secondary)',
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}>
            <span>ℹ️</span>
            <span>Bildirimler yalnızca uygulama açıkken çalışır.</span>
          </div>

          {/* Pending reminders */}
          {pending.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Bekleyen ({pending.length})
              </div>
              {pending.map(r => (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  onMarkDone={handleMarkDone}
                  onDelete={handleDelete}
                  formatFireAt={formatFireAt}
                />
              ))}
            </div>
          )}

          {/* Done reminders */}
          {done.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Tamamlanan ({done.length})
              </div>
              {done.slice(0, 5).map(r => (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  onMarkDone={handleMarkDone}
                  onDelete={handleDelete}
                  formatFireAt={formatFireAt}
                />
              ))}
            </div>
          )}

          {reminders.length === 0 && !showForm && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏰</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Henüz hatırlatıcı yok
              </div>
              <div style={{ fontSize: 12 }}>
                Yeni bir hatırlatıcı eklemek için "Yeni" butonuna tıklayın
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReminderItemProps {
  reminder: ReminderRow;
  onMarkDone: (id: string) => void;
  onDelete: (id: string) => void;
  formatFireAt: (ts: number) => string;
}

function ReminderItem({ reminder, onMarkDone, onDelete, formatFireAt }: ReminderItemProps) {
  const isOverdue = !reminder.is_done && isPast(new Date(reminder.fire_at));
  const repeatLabels: Record<string, string> = { none: '', daily: '• Her gün', weekly: '• Her hafta' };

  return (
    <div className={`reminder-item ${reminder.is_done ? 'done' : ''}`} id={`reminder-${reminder.id}`}>
      <button
        className={`reminder-checkbox ${reminder.is_done ? 'checked' : ''}`}
        onClick={() => !reminder.is_done && onMarkDone(reminder.id)}
        title={reminder.is_done ? 'Tamamlandı' : 'Tamamla'}
      >
        {reminder.is_done && '✓'}
      </button>

      <div className="reminder-content">
        <div className="reminder-title">{reminder.title}</div>
        {reminder.body && <div className="reminder-body">{reminder.body}</div>}
        <div className={`reminder-time ${isOverdue ? 'overdue' : ''}`}>
          {isOverdue && '⚠️ '}
          {formatFireAt(reminder.fire_at)}
          {reminder.repeat !== 'none' && (
            <span style={{ marginLeft: 4, color: 'var(--accent)', fontSize: 10 }}>
              {repeatLabels[reminder.repeat]}
            </span>
          )}
        </div>
      </div>

      <button
        className="reminder-delete"
        onClick={() => onDelete(reminder.id)}
        title="Sil"
      >
        ✕
      </button>
    </div>
  );
}
