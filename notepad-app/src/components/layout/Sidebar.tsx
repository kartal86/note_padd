import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../App';
import { Notebook, SearchResult } from '../../types';
import ContextMenu from '../ui/ContextMenu';
import NotebookModal from '../ui/NotebookModal';

const NOTEBOOK_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4', '#a855f7', '#64748b',
];

const NOTEBOOK_ICONS = ['📓', '📔', '📒', '📕', '📗', '📘', '📙', '🗒️', '📋', '📄', '🗂️', '💼'];

interface SidebarProps {
  onSearchResultClick: (result: SearchResult) => void;
}

export default function Sidebar({ onSearchResultClick }: SidebarProps) {
  const {
    notebooks,
    selectedNotebookId,
    setSelectedNotebookId,
    setSelectedNoteId,
    refreshNotebooks,
    searchQuery,
    setSearchQuery,
    searchResults,
    setShowReminderModal,
    reminders,
    isSearching,
  } = useApp();

  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; notebook: Notebook;
  } | null>(null);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});

  const pendingReminders = reminders.filter(r => !r.is_done).length;

  // Load note counts for all notebooks
  const loadNoteCounts = useCallback(async () => {
    const counts: Record<string, number> = {};
    for (const nb of notebooks) {
      const res = await window.api.getNotes(nb.id);
      if (res.success && res.data) {
        counts[nb.id] = res.data.length;
      }
    }
    setNoteCounts(counts);
  }, [notebooks]);

  useEffect(() => {
    loadNoteCounts();
  }, [notebooks]);

  const handleNotebookClick = (id: string) => {
    setSelectedNotebookId(id);
    setSelectedNoteId(null);
    setSearchQuery('');
  };

  const handleContextMenu = (e: React.MouseEvent, notebook: Notebook) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, notebook });
  };

  const handleRename = () => {
    if (contextMenu) {
      setEditingNotebook(contextMenu.notebook);
      setShowNotebookModal(true);
      setContextMenu(null);
    }
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    const nb = contextMenu.notebook;
    setContextMenu(null);
    const count = noteCounts[nb.id] ?? 0;
    const msg = count > 0
      ? `"${nb.name}" defterini ve içindeki ${count} notu silmek istediğinize emin misiniz?`
      : `"${nb.name}" defterini silmek istediğinize emin misiniz?`;

    if (window.confirm(msg)) {
      await window.api.deleteNotebook(nb.id);
      if (selectedNotebookId === nb.id) {
        setSelectedNotebookId(null);
        setSelectedNoteId(null);
      }
      refreshNotebooks();
    }
  };

  const handleNewNotebook = () => {
    setEditingNotebook(null);
    setShowNotebookModal(true);
  };

  const handleModalSave = async (data: { name: string; color: string; icon: string }) => {
    if (editingNotebook) {
      await window.api.updateNotebook(editingNotebook.id, data);
    } else {
      const res = await window.api.createNotebook(data);
      if (res.success && res.data) {
        setSelectedNotebookId(res.data.id);
      }
    }
    refreshNotebooks();
    setShowNotebookModal(false);
    setEditingNotebook(null);
  };

  const isShowingSearch = searchQuery.trim().length > 0;

  return (
    <>
      <div className="sidebar">
        {/* Search */}
        <div className="sidebar-search">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              id="sidebar-search-input"
              className="search-input"
              type="text"
              placeholder="Notlarda ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="sidebar-section">
          {isShowingSearch ? (
            /* Search Results */
            <div>
              <div className="sidebar-section-header">
                {isSearching ? 'Aranıyor...' : `${searchResults.length} sonuç`}
              </div>
              {searchResults.length === 0 && !isSearching ? (
                <div style={{ padding: '16px 8px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                  Sonuç bulunamadı
                </div>
              ) : (
                searchResults.map(result => (
                  <div
                    key={result.id}
                    className="search-result-item"
                    onClick={() => onSearchResultClick(result)}
                    id={`search-result-${result.id}`}
                  >
                    <div className="search-result-title">{result.title}</div>
                    <div className="search-result-notebook">{result.notebook_name}</div>
                    <div
                      className="search-result-snippet"
                      dangerouslySetInnerHTML={{ __html: result.snippet || result.content_text?.slice(0, 80) || '' }}
                    />
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Notebook List */
            <div>
              <div className="sidebar-section-header">Defterler</div>
              {notebooks.map(nb => (
                <div
                  key={nb.id}
                  id={`notebook-item-${nb.id}`}
                  className={`notebook-item ${selectedNotebookId === nb.id ? 'active' : ''}`}
                  onClick={() => handleNotebookClick(nb.id)}
                  onContextMenu={e => handleContextMenu(e, nb)}
                >
                  <span className="notebook-icon">{nb.icon}</span>
                  <span className="notebook-color-dot" style={{ background: nb.color }} />
                  <span className="notebook-name">{nb.name}</span>
                  {noteCounts[nb.id] !== undefined && (
                    <span className="notebook-count">{noteCounts[nb.id]}</span>
                  )}
                </div>
              ))}

              {notebooks.length === 0 && (
                <div style={{ padding: '16px 8px', color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                  Henüz defter yok
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            className="btn-sidebar-action reminders-link"
            onClick={() => setShowReminderModal(true)}
            id="open-reminders-btn"
          >
            <span>⏰</span>
            <span>Hatırlatıcılar</span>
            {pendingReminders > 0 && (
              <span style={{
                background: 'var(--warning)',
                color: 'white',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 10,
                fontWeight: 700,
                marginLeft: 'auto'
              }}>
                {pendingReminders}
              </span>
            )}
          </button>
          <button
            className="btn-sidebar-action"
            onClick={handleNewNotebook}
            id="new-notebook-btn"
          >
            <span>+</span>
            <span>Yeni Defter</span>
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: '✏️ Yeniden Adlandır', onClick: handleRename },
            { label: '🎨 Düzenle', onClick: handleRename },
            { divider: true },
            { label: '🗑️ Sil', onClick: handleDelete, danger: true },
          ]}
        />
      )}

      {/* Notebook Modal */}
      {showNotebookModal && (
        <NotebookModal
          notebook={editingNotebook}
          onSave={handleModalSave}
          onClose={() => {
            setShowNotebookModal(false);
            setEditingNotebook(null);
          }}
          colors={NOTEBOOK_COLORS}
          icons={NOTEBOOK_ICONS}
        />
      )}
    </>
  );
}
