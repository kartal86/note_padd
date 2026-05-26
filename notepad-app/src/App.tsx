import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Notebook, NoteRow, ReminderRow, SearchResult, Theme } from './types';
import './styles/globals.css';
import './styles/editor.css';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import NoteList from './components/layout/NoteList';
import EditorPane from './components/layout/EditorPane';
import ReminderModal from './components/reminders/ReminderModal';
import ReminderNotification from './components/reminders/ReminderNotification';

// ─── App Context ─────────────────────────────────────────────────────────────

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  notebooks: Notebook[];
  selectedNotebookId: string | null;
  setSelectedNotebookId: (id: string | null) => void;
  notes: NoteRow[];
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  refreshNotebooks: () => void;
  refreshNotes: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SearchResult[];
  showReminderModal: boolean;
  setShowReminderModal: (v: boolean) => void;
  reminders: ReminderRow[];
  refreshReminders: () => void;
  isSearching: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

// ─── Root App Component ───────────────────────────────────────────────────────

function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [firedReminder, setFiredReminder] = useState<{ id: string; title: string; body: string } | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load theme on startup
  useEffect(() => {
    (async () => {
      const res = await window.api.getSettings();
      if (res.success && res.data) {
        const t = (res.data.theme as Theme) || 'dark';
        setTheme(t);
        document.documentElement.setAttribute('data-theme', t);

        // Restore last notebook
        if (res.data.lastNotebookId) {
          setSelectedNotebookId(res.data.lastNotebookId);
        }
        if (res.data.lastNoteId) {
          setSelectedNoteId(res.data.lastNoteId);
        }
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  }, []);

  // Listen for reminder:fired events
  useEffect(() => {
    window.api.onReminderFired((data) => {
      setFiredReminder(data);
      refreshReminders();
    });
    return () => {
      window.api.offReminderFired();
    };
  }, []);

  const refreshNotebooks = useCallback(async () => {
    const res = await window.api.getNotebooks();
    if (res.success && res.data) {
      setNotebooks(res.data);
      // Auto-select first if nothing selected
      if (!selectedNotebookId && res.data.length > 0) {
        setSelectedNotebookId(res.data[0].id);
      }
    }
  }, [selectedNotebookId]);

  const refreshNotes = useCallback(async () => {
    if (!selectedNotebookId) {
      setNotes([]);
      return;
    }
    const res = await window.api.getNotes(selectedNotebookId);
    if (res.success && res.data) {
      setNotes(res.data);
    }
  }, [selectedNotebookId]);

  const refreshReminders = useCallback(async () => {
    const res = await window.api.getReminders();
    if (res.success && res.data) {
      setReminders(res.data);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshNotebooks();
    refreshReminders();
  }, []);

  useEffect(() => {
    if (selectedNotebookId) {
      refreshNotes();
      // Save last selected notebook
      window.api.saveSettings({ lastNotebookId: selectedNotebookId });
    }
  }, [selectedNotebookId]);

  useEffect(() => {
    if (selectedNoteId) {
      window.api.saveSettings({ lastNoteId: selectedNoteId });
    }
  }, [selectedNoteId]);

  // Search debounce
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      const res = await window.api.searchNotes(searchQuery);
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const toggleTheme = useCallback(() => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    window.api.setTheme(newTheme);
  }, [theme]);

  const handleSearchResultClick = (result: SearchResult) => {
    setSelectedNotebookId(result.notebook_id);
    setSelectedNoteId(result.id);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      notebooks,
      selectedNotebookId,
      setSelectedNotebookId,
      notes,
      selectedNoteId,
      setSelectedNoteId,
      refreshNotebooks,
      refreshNotes,
      searchQuery,
      setSearchQuery,
      searchResults,
      showReminderModal,
      setShowReminderModal,
      reminders,
      refreshReminders,
      isSearching,
    }}>
      <div className="app-container" data-theme={theme}>
        <TitleBar />
        <div className="app-body">
          <Sidebar
            onSearchResultClick={handleSearchResultClick}
          />
          <NoteList />
          <EditorPane />
        </div>

        {showReminderModal && (
          <ReminderModal onClose={() => setShowReminderModal(false)} />
        )}

        {firedReminder && (
          <ReminderNotification
            reminder={firedReminder}
            onClose={() => setFiredReminder(null)}
          />
        )}
      </div>
    </AppContext.Provider>
  );
}

export default App;
