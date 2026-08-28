'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChecklistItem } from '@/lib/types';
import { useToast } from './Toast';

export default function TaskChecklist({ taskId, userId }: { taskId: string; userId: string }) {
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('task_checklist_items')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) showToast(error.message, 'error');
        setItems(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, supabase, showToast]);

  async function addItem() {
    const text = newItemText.trim();
    if (!text) return;
    setNewItemText('');
    const { data, error } = await supabase
      .from('task_checklist_items')
      .insert({ task_id: taskId, user_id: userId, text, position: items.length })
      .select()
      .single();
    if (error || !data) {
      showToast(error?.message ?? 'Failed to add item', 'error');
      return;
    }
    setItems((prev) => [...prev, data]);
  }

  async function toggleDone(item: ChecklistItem) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    const { error } = await supabase
      .from('task_checklist_items')
      .update({ done: !item.done })
      .eq('id', item.id);
    if (error) {
      showToast(error.message, 'error');
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)));
    }
  }

  async function saveEdit(item: ChecklistItem) {
    const text = editingText.trim();
    setEditingId(null);
    if (!text || text === item.text) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, text } : i)));
    const { error } = await supabase
      .from('task_checklist_items')
      .update({ text })
      .eq('id', item.id);
    if (error) showToast(error.message, 'error');
  }

  async function deleteItem(item: ChecklistItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const { error } = await supabase.from('task_checklist_items').delete().eq('id', item.id);
    if (error) showToast(error.message, 'error');
  }

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-black">Checklist</label>
        {items.length > 0 && (
          <span className="text-xs text-black/40">
            {doneCount}/{items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-black/30">Loading…</div>
      ) : (
        items.length > 0 && (
          <div className="mb-1.5 flex flex-col gap-0.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-black/[0.02]"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleDone(item)}
                  className="h-4 w-4 shrink-0 accent-[#584738]"
                />
                {editingId === item.id ? (
                  <input
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={() => saveEdit(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    className="min-w-0 flex-1 rounded border border-[#584738]/40 px-1 text-sm outline-none"
                  />
                ) : (
                  <span
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingText(item.text);
                    }}
                    className={`min-w-0 flex-1 cursor-text break-words text-sm ${
                      item.done ? 'text-black/40 line-through' : 'text-black'
                    }`}
                  >
                    {item.text}
                  </span>
                )}
                <button
                  onClick={() => deleteItem(item)}
                  aria-label="Remove item"
                  className="shrink-0 text-black/20 opacity-0 hover:text-[#E24B4A] group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )
      )}

      <div className="flex items-center gap-2">
        <input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="Add an item…"
          className="min-w-0 flex-1 rounded-md border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#584738]"
        />
        <button
          onClick={addItem}
          className="shrink-0 rounded-md border border-black/15 px-2.5 py-1.5 text-xs font-medium text-black hover:bg-black/5"
        >
          Add
        </button>
      </div>
    </div>
  );
}
