import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../App';
import { NoteRow } from '../../types';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import RichEditor from '../editor/RichEditor';
import Toolbar from '../editor/Toolbar';
import { Editor } from '@tiptap/react';

type SaveStatus = 'idle' | 'saving' | 'saved';

export default function EditorPane() {
  const { selectedNoteId, notes, refreshNotes } = useApp();

  const [note, setNote] = useState<NoteRow | null>(null);
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [editor, setEditor] = useState<Editor | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const currentNoteIdRef = useRef<string | null>(null);

  // Load note when selection changes
  useEffect(() => {
    if (!selectedNoteId) {
      setNote(null);
      setTitle('');
      setEditor(null);
      return;
    }

    isLoadingRef.current = true;
    currentNoteIdRef.current = selectedNoteId;

    (async () => {
      const res = await window.api.getNoteById(selectedNoteId);
      if (res.success && res.data && currentNoteIdRef.current === selectedNoteId) {
        setNote(res.data);
        setTitle(res.data.title);
        setSaveStatus('idle');
      }
      isLoadingRef.current = false;
    })();
  }, [selectedNoteId]);

  const scheduleSave = useCallback((noteId: string, newTitle: string, content: string, contentText: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');

    saveTimerRef.current = setTimeout(async () => {
      try {
        await window.api.updateNote(noteId, {
          title: newTitle,
          content,
          content_text: contentText,
        });
        setSaveStatus('saved');
        refreshNotes();
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error('Save error:', e);
        setSaveStatus('idle');
      }
    }, 1500);
  }, [refreshNotes]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (note && editor) {
      scheduleSave(
        note.id,
        newTitle,
        JSON.stringify(editor.getJSON()),
        editor.getText()
      );
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      editor?.commands.focus();
    }
  };

  const handleEditorChange = useCallback((json: object, text: string) => {
    if (isLoadingRef.current || !note) return;
    scheduleSave(note.id, title, JSON.stringify(json), text);
  }, [note, title, scheduleSave]);

  const formatDate = (ts: number) => {
    try {
      return format(new Date(ts), "d MMMM yyyy, HH:mm", { locale: tr });
    } catch {
      return '';
    }
  };

  if (!selectedNoteId) {
    return (
      <div className="editor-pane">
        <div className="editor-empty-state">
          <span className="editor-empty-icon">✍️</span>
          <span className="editor-empty-title">Bir not seçin</span>
          <span className="editor-empty-subtitle">
            Sol panelden bir not seçin veya yeni not oluşturun
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-pane">
      {/* Toolbar */}
      <Toolbar editor={editor} noteId={selectedNoteId} />

      {/* Title Area */}
      <div className="editor-title-area">
        <input
          id="note-title-input"
          className="editor-title-input"
          type="text"
          placeholder="Başlık..."
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
        />
      </div>

      {/* Meta (date + save status) */}
      <div className="editor-meta">
        <span className="editor-meta-date">
          {note ? formatDate(note.updated_at) : ''}
        </span>
        <span className={`editor-save-status ${saveStatus}`}>
          {saveStatus === 'saving' && '💾 Kaydediliyor...'}
          {saveStatus === 'saved' && '✓ Kaydedildi'}
        </span>
      </div>

      {/* Editor */}
      <div className="editor-content-area">
        {note && (
          <RichEditor
            key={note.id}
            noteId={note.id}
            initialContent={note.content}
            onEditorReady={setEditor}
            onChange={handleEditorChange}
          />
        )}
      </div>
    </div>
  );
}
