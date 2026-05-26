import React from 'react';
import { Editor } from '@tiptap/react';

interface ToolbarProps {
  editor: Editor | null;
  noteId: string | null;
}

interface ToolbarButton {
  id: string;
  label: string;
  title: string;
  isActive?: () => boolean;
  onClick: () => void;
}

interface ToolbarGroup {
  buttons: ToolbarButton[];
}

export default function Toolbar({ editor, noteId }: ToolbarProps) {
  if (!editor) {
    return (
      <div className="editor-toolbar">
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Editör yükleniyor...</span>
      </div>
    );
  }

  const handleImageUpload = async () => {
    if (!noteId) return;
    const res = await window.api.openImageDialog();
    if (!res.success) {
      if (res.error) alert(res.error);
      return;
    }
    if (!res.data) return;

    const { buffer, mimeType } = res.data;
    const uint8 = new Uint8Array(buffer);
    const arrayBuffer = uint8.buffer;

    const saveRes = await window.api.saveImage(noteId, arrayBuffer, mimeType);
    if (saveRes.success && saveRes.data) {
      const src = `appimage://${saveRes.data.filename}`;
      editor.chain().focus().setImage({ src }).run();
    } else {
      alert('Resim kaydedilemedi: ' + (saveRes.error || ''));
    }
  };

  const groups: ToolbarGroup[] = [
    {
      buttons: [
        {
          id: 'toolbar-bold',
          label: 'B',
          title: 'Kalın (Ctrl+B)',
          isActive: () => editor.isActive('bold'),
          onClick: () => editor.chain().focus().toggleBold().run(),
        },
        {
          id: 'toolbar-italic',
          label: 'I',
          title: 'İtalik (Ctrl+I)',
          isActive: () => editor.isActive('italic'),
          onClick: () => editor.chain().focus().toggleItalic().run(),
        },
        {
          id: 'toolbar-underline',
          label: 'U',
          title: 'Altı Çizili (Ctrl+U)',
          isActive: () => editor.isActive('underline'),
          onClick: () => editor.chain().focus().toggleUnderline().run(),
        },
        {
          id: 'toolbar-strike',
          label: 'S̶',
          title: 'Üstü Çizili',
          isActive: () => editor.isActive('strike'),
          onClick: () => editor.chain().focus().toggleStrike().run(),
        },
      ],
    },
    {
      buttons: [
        {
          id: 'toolbar-h1',
          label: 'H1',
          title: 'Başlık 1',
          isActive: () => editor.isActive('heading', { level: 1 }),
          onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          id: 'toolbar-h2',
          label: 'H2',
          title: 'Başlık 2',
          isActive: () => editor.isActive('heading', { level: 2 }),
          onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          id: 'toolbar-h3',
          label: 'H3',
          title: 'Başlık 3',
          isActive: () => editor.isActive('heading', { level: 3 }),
          onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        },
      ],
    },
    {
      buttons: [
        {
          id: 'toolbar-bullet-list',
          label: '•',
          title: 'Madde Listesi',
          isActive: () => editor.isActive('bulletList'),
          onClick: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          id: 'toolbar-ordered-list',
          label: '1.',
          title: 'Numaralı Liste',
          isActive: () => editor.isActive('orderedList'),
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          id: 'toolbar-task-list',
          label: '☑',
          title: 'Görev Listesi',
          isActive: () => editor.isActive('taskList'),
          onClick: () => editor.chain().focus().toggleTaskList().run(),
        },
      ],
    },
    {
      buttons: [
        {
          id: 'toolbar-align-left',
          label: '⇤',
          title: 'Sola Hizala',
          isActive: () => editor.isActive({ textAlign: 'left' }),
          onClick: () => editor.chain().focus().setTextAlign('left').run(),
        },
        {
          id: 'toolbar-align-center',
          label: '⇔',
          title: 'Ortala',
          isActive: () => editor.isActive({ textAlign: 'center' }),
          onClick: () => editor.chain().focus().setTextAlign('center').run(),
        },
        {
          id: 'toolbar-align-right',
          label: '⇥',
          title: 'Sağa Hizala',
          isActive: () => editor.isActive({ textAlign: 'right' }),
          onClick: () => editor.chain().focus().setTextAlign('right').run(),
        },
      ],
    },
    {
      buttons: [
        {
          id: 'toolbar-image',
          label: '🖼',
          title: 'Resim Ekle',
          onClick: handleImageUpload,
        },
        {
          id: 'toolbar-hr',
          label: '──',
          title: 'Yatay Çizgi',
          onClick: () => editor.chain().focus().setHorizontalRule().run(),
        },
        {
          id: 'toolbar-blockquote',
          label: '❝',
          title: 'Alıntı',
          isActive: () => editor.isActive('blockquote'),
          onClick: () => editor.chain().focus().toggleBlockquote().run(),
        },
      ],
    },
  ];

  return (
    <div className="editor-toolbar">
      {groups.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="toolbar-divider" />}
          {group.buttons.map(btn => (
            <button
              key={btn.id}
              id={btn.id}
              className={`toolbar-btn ${btn.isActive?.() ? 'active' : ''}`}
              title={btn.title}
              onClick={btn.onClick}
            >
              <span className="toolbar-btn-text">{btn.label}</span>
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}
