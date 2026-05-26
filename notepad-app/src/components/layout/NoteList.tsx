import React, { useState, useCallback } from 'react';
import { useApp } from '../../App';
import { NoteRow } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import ContextMenu from '../ui/ContextMenu';

export default function NoteList() {
  const {
    notebooks,
    selectedNotebookId,
    notes,
    selectedNoteId,
    setSelectedNoteId,
    refreshNotes,
    setShowReminderModal,
  } = useApp();

  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; note: NoteRow;
  } | null>(null);

  const selectedNotebook = notebooks.find(nb => nb.id === selectedNotebookId);

  const handleNewNote = useCallback(async () => {
    if (!selectedNotebookId) return;
    const res = await window.api.createNote({ notebook_id: selectedNotebookId });
    if (res.success && res.data) {
      setSelectedNoteId(res.data.id);
      refreshNotes();
    }
  }, [selectedNotebookId, refreshNotes]);

  const handleContextMenu = (e: React.MouseEvent, note: NoteRow) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, note });
  };

  const handlePin = async () => {
    if (!contextMenu) return;
    const note = contextMenu.note;
    setContextMenu(null);
    await window.api.pinNote(note.id, !note.is_pinned);
    refreshNotes();
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    const note = contextMenu.note;
    setContextMenu(null);
    if (window.confirm(`"${note.title}" notunu silmek istediğinize emin misiniz?`)) {
      await window.api.deleteNote(note.id);
      if (selectedNoteId === note.id) {
        setSelectedNoteId(null);
      }
      refreshNotes();
    }
  };

  const handleAddReminder = () => {
    setContextMenu(null);
    setShowReminderModal(true);
  };

  const formatDate = (ts: number) => {
    try {
      return format(new Date(ts), 'd MMM yyyy', { locale: tr });
    } catch {
      return '';
    }
  };

  // Pinned notes first, then by updated_at
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return b.updated_at - a.updated_at;
  });

  if (!selectedNotebookId) {
    return (
      <div className="note-list-panel">
        <div className="note-list-empty">
          <span className="note-list-empty-icon">📓</span>
          <span>Sol taraftan bir defter seçin</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="note-list-panel">
        <div className="note-list-header">
          <span className="note-list-title">
            {selectedNotebook?.icon} {selectedNotebook?.name ?? 'Notlar'}
          </span>
          <button
            id="new-note-btn"
            className="btn-new-note"
            onClick={handleNewNote}
            title="Yeni Not"
          >
            + Not
          </button>
        </div>

        <div className="note-list-scroll">
          {sortedNotes.length === 0 ? (
            <div className="note-list-empty">
              <span className="note-list-empty-icon">✏️</span>
              <span>Bu defterde henüz not yok</span>
              <span style={{ fontSize: 12, opacity: 0.6 }}>Yeni not oluşturmak için + Not butonuna tıklayın</span>
            </div>
          ) : (
            sortedNotes.map(note => (
              <div
                key={note.id}
                id={`note-card-${note.id}`}
                className={`note-card ${selectedNoteId === note.id ? 'active' : ''}`}
                onClick={() => setSelectedNoteId(note.id)}
                onContextMenu={e => handleContextMenu(e, note)}
              >
                <div className="note-card-header">
                  {note.is_pinned ? <span className="note-pin-icon">📌</span> : null}
                  <span className="note-card-title">{note.title || 'Başlıksız Not'}</span>
                </div>
                <div className="note-card-preview">
                  {note.content_text?.slice(0, 80) || 'Boş not...'}
                </div>
                <div className="note-card-date">
                  {formatDate(note.updated_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: contextMenu.note.is_pinned ? '📌 Sabiti Kaldır' : '📌 Sabitle',
              onClick: handlePin
            },
            { label: '⏰ Hatırlatıcı Ekle', onClick: handleAddReminder },
            { divider: true },
            { label: '🗑️ Notu Sil', onClick: handleDelete, danger: true },
          ]}
        />
      )}
    </>
  );
}
