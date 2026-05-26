import React, { useState } from 'react';
import { Notebook } from '../../types';

interface NotebookModalProps {
  notebook: Notebook | null;
  onSave: (data: { name: string; color: string; icon: string }) => void;
  onClose: () => void;
  colors: string[];
  icons: string[];
}

export default function NotebookModal({ notebook, onSave, onClose, colors, icons }: NotebookModalProps) {
  const [name, setName] = useState(notebook?.name ?? '');
  const [color, setColor] = useState(notebook?.color ?? colors[0]);
  const [icon, setIcon] = useState(notebook?.icon ?? icons[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, icon });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {notebook ? 'Defteri Düzenle' : 'Yeni Defter'}
          </span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div className="form-group">
              <label className="form-label">Defter Adı</label>
              <input
                id="notebook-name-input"
                className="form-input"
                type="text"
                placeholder="Örn: İş Notları"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Icon */}
            <div className="form-group">
              <label className="form-label">İkon</label>
              <div className="icon-picker-grid">
                {icons.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    className={`icon-option ${icon === ic ? 'selected' : ''}`}
                    onClick={() => setIcon(ic)}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="form-group">
              <label className="form-label">Renk</label>
              <div className="color-picker-row">
                {colors.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${color === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'block' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {name || 'Defter Adı'}
              </span>
            </div>

            <div className="btn-group">
              <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
              <button
                type="submit"
                id="notebook-save-btn"
                className="btn btn-primary"
                disabled={!name.trim()}
              >
                {notebook ? 'Kaydet' : 'Oluştur'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
