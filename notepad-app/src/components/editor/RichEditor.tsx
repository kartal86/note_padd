import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import { Editor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';

interface RichEditorProps {
  noteId: string;
  initialContent: string;
  onEditorReady: (editor: Editor) => void;
  onChange: (json: object, text: string) => void;
}

export default function RichEditor({ noteId, initialContent, onEditorReady, onChange }: RichEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const isLoadingRef = useRef(true);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const parseContent = (raw: string) => {
    if (!raw || raw === '') return '';
    try {
      return JSON.parse(raw);
    } catch {
      return raw; // treat as HTML/plain text
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Image.configure({
        HTMLAttributes: {
          loading: 'lazy',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Yazmaya başlayın...',
      }),
    ],
    content: parseContent(initialContent),
    onUpdate: ({ editor }) => {
      if (!isLoadingRef.current) {
        onChange(editor.getJSON(), editor.getText());
      }
    },
    editorProps: {
      attributes: {
        spellcheck: 'false',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              handleImageFile(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
      onEditorReady(editor);

      // Small delay to mark as not loading (after content is set)
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 100);
    }
  }, [editor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isLoadingRef.current = true;
    };
  }, [noteId]);

  const handleImageFile = useCallback(async (file: File) => {
    if (!editor) return;

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('Resim boyutu 20MB sınırını aşıyor');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Desteklenmeyen resim formatı. PNG, JPG, GIF veya WEBP kullanın.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const res = await window.api.saveImage(noteId, buffer, file.type);

      if (res.success && res.data) {
        const src = `appimage://${res.data.filename}`;
        editor.chain().focus().setImage({ src }).run();
      } else {
        alert('Resim kaydedilemedi: ' + (res.error || 'Bilinmeyen hata'));
      }
    } catch (e) {
      console.error('Image upload error:', e);
    }
  }, [editor, noteId]);

  // Drag and drop
  useEffect(() => {
    const zone = dropZoneRef.current;
    if (!zone) return;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    };

    const onDragLeave = () => {
      zone.classList.remove('drag-over');
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      zone.classList.remove('drag-over');

      const files = e.dataTransfer?.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          handleImageFile(file);
          break;
        }
      }
    };

    zone.addEventListener('dragover', onDragOver);
    zone.addEventListener('dragleave', onDragLeave);
    zone.addEventListener('drop', onDrop);

    return () => {
      zone.removeEventListener('dragover', onDragOver);
      zone.removeEventListener('dragleave', onDragLeave);
      zone.removeEventListener('drop', onDrop);
    };
  }, [handleImageFile]);

  return (
    <div ref={dropZoneRef} style={{ position: 'relative', minHeight: '100%' }}>
      <EditorContent editor={editor} />
    </div>
  );
}
