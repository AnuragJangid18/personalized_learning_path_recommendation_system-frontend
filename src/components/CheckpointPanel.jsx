import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function CheckpointPanel({ snapshotProvider, onRestore }) {
  // snapshotProvider() should return the object to save: { student, completed, stats, currentLesson, lesson }
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'error', 'success'

  useEffect(()=>{ if (user) fetchList(); }, [user]);

  function showMessage(msg, type = 'success') {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  }

  async function fetchList() {
    if (!user) {
      setList([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/checkpoint');
      setList(res.data || []);
    } catch (e) {
      console.error('Failed to fetch checkpoints:', e);
      if (e?.response?.status === 401) {
        showMessage('Please log in to view checkpoints', 'error');
      } else {
        showMessage('Failed to load checkpoints', 'error');
      }
      setList([]);
    } finally { setLoading(false); }
  }

  // Replace prompt with a custom input for checkpoint name
  const [showNameInput, setShowNameInput] = useState(false);
  const [checkpointName, setCheckpointName] = useState("");
  const [pendingSnapshot, setPendingSnapshot] = useState(null);

  async function saveCheckpoint() {
    if (!user) return showMessage('Login required', 'error');
    
    const snapshot = snapshotProvider();
    
    // Validate snapshot
    if (!snapshot.student?.id) {
      return showMessage('No student profile. Create one first.', 'error');
    }
    
    setPendingSnapshot(snapshot);
    const timestamp = new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit'
    });
    setCheckpointName(`Checkpoint - ${timestamp}`);
    setShowNameInput(true);
  }

  async function confirmSaveCheckpoint() {
    setSaving(true);
    try {
      await api.post('/checkpoint', { name: checkpointName, snapshot: pendingSnapshot });
      await fetchList();
      showMessage('✓ Checkpoint saved successfully', 'success');
    } catch (e) {
      console.error(e);
      showMessage(e?.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
      setShowNameInput(false);
      setCheckpointName("");
      setPendingSnapshot(null);
    }
  }

  function cancelSaveCheckpoint() {
    setShowNameInput(false);
    setCheckpointName("");
    setPendingSnapshot(null);
  }

  async function restore(id, cpName) {
    try {
      const res = await api.get(`/checkpoint/${id}`);
      const data = res.data;
      if (!data?.snapshot) {
        showMessage('No snapshot found', 'error');
        return;
      }
      onRestore(data.snapshot);
      showMessage(`✓ Restored: ${cpName}`, 'success');
    } catch (e) {
      console.error(e);
      showMessage('Restore failed', 'error');
    }
  }

  async function remove(id, cpName) {
    if (!confirm(`Delete "${cpName}"?`)) return;
    try {
      await api.delete(`/checkpoint/${id}`);
      await fetchList();
      showMessage(`✓ Deleted checkpoint`, 'success');
    } catch (e) {
      console.error(e);
      showMessage('Delete failed', 'error');
    }
  }

  return (
    <div className="space-y-3">
      {/* Message Toast */}
      {message && (
        <div
          className={`text-sm p-2 rounded transition-colors duration-200 ${
            messageType === 'error'
              ? 'bg-red-100 text-red-800'
              : 'bg-green-100 text-green-800'
          }`}
          aria-live="polite"
          role="status"
        >
          {message}
        </div>
      )}

      <div className="flex gap-2">
        <button className="sv-btn-primary" onClick={saveCheckpoint} disabled={!user || saving}>
          {saving ? <span className="animate-spin inline-block mr-1">🔄</span> : '💾 Save'}
        </button>
        <button className="sv-btn-accent" onClick={fetchList} disabled={loading}>
          {loading ? <span className="animate-spin inline-block mr-1">🔄</span> : '🔄 Refresh'}
        </button>
      </div>

      {/* Custom input modal for checkpoint name */}
      {showNameInput && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-xs space-y-4">
            <div className="font-semibold text-lg">Name your checkpoint</div>
            <input
              className="w-full p-2 rounded border border-borderLight bg-white text-black"
              value={checkpointName}
              onChange={e => setCheckpointName(e.target.value)}
              autoFocus
              maxLength={50}
            />
            <div className="flex gap-2 justify-end">
              <button className="sv-btn-accent px-3 py-1" onClick={confirmSaveCheckpoint} disabled={saving || !checkpointName.trim()}>
                {saving ? <span className="animate-spin inline-block mr-1">🔄</span> : 'Save'}
              </button>
              <button className="sv-btn-danger px-3 py-1" onClick={cancelSaveCheckpoint} disabled={saving}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm text-textLight">Saved Checkpoints ({list.length})</div>
      <div className="space-y-2">
        {loading ? (
          <div className="text-sm text-textLight">Loading...</div>
        ) : list.length === 0 ? (
          <div className="text-xs text-textLight italic">No checkpoints yet. Save one to get started!</div>
        ) : (
          list.map(cp => {
            const progressCount = cp.snapshotSummary?.keys?.includes('completed') ? 'Progress saved' : 'Checkpoint data';
              return (
              <div
                key={cp.id}
                className="flex items-center justify-between gap-2 border border-borderLight p-3 rounded bg-slate-50 hover:bg-slate-100 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-sm">{cp.name}</div>
                  <div className="text-xs text-textLight">{new Date(cp.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    className="sv-btn-accent text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent"
                    aria-label={`Load checkpoint ${cp.name}`}
                    onClick={()=>restore(cp.id, cp.name)}
                  >
                    📂 Load
                  </button>
                  <button
                    className="sv-btn-danger text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-danger"
                    aria-label={`Delete checkpoint ${cp.name}`}
                    onClick={()=>remove(cp.id, cp.name)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
