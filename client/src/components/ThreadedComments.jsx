import { useMemo, useState } from 'react';
import api from '../api/client.js';
import toast from 'react-hot-toast';

function avatarUrl(a) {
  if (!a) return '';
  if (a.startsWith('http')) return a;
  return `${import.meta.env.VITE_API_URL || ''}${a}`;
}

function buildTree(flat) {
  const map = {};
  flat.forEach((c) => {
    map[c.id] = { ...c, children: [] };
  });
  const roots = [];
  flat.forEach((c) => {
    const node = map[c.id];
    if (c.parent_id && map[c.parent_id]) {
      map[c.parent_id].children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function CommentNode({ node, user, tmdbId, mediaType, movieMeta, onRefresh, depth }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);

  const submitReply = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Sign in to reply');
      return;
    }
    if (!replyText.trim()) return;
    setBusy(true);
    try {
      await api.post('/api/comments', {
        tmdbId: Number(tmdbId),
        parent_id: node.id,
        content: replyText.trim(),
        media_type: mediaType,
        ...movieMeta,
      });
      setReplyText('');
      setReplyOpen(false);
      onRefresh();
      toast.success('Reply posted');
    } catch {
      toast.error('Failed');
    } finally {
      setBusy(false);
    }
  };

  const vote = async (v) => {
    if (!user) {
      toast.error('Sign in to vote');
      return;
    }
    if (voteBusy) return;
    const next = node.my_vote === v ? 0 : v;
    setVoteBusy(true);
    try {
      await api.post(`/api/comments/${node.id}/react`, { vote: next });
      onRefresh();
      toast.success(next === 0 ? 'Vote cleared' : 'Vote saved');
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.statusText || 'Vote failed';
      toast.error(msg);
    } finally {
      setVoteBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this thread?')) return;
    try {
      await api.delete(`/api/comments/${node.id}`);
      onRefresh();
      toast.success('Removed');
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <li className={`${depth > 0 ? 'ml-4 sm:ml-8 pl-4 border-l border-zinc-800' : ''}`}>
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 mb-3">
        <div className="flex items-start gap-3">
          <img src={avatarUrl(node.avatar)} alt="" className="w-9 h-9 rounded-full border border-zinc-700 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold text-white">{node.username}</span>
              <span className="text-zinc-500 text-xs">{formatTime(node.created_at)}</span>
            </div>
            <p className="text-zinc-200 text-sm mt-2 whitespace-pre-wrap break-words">{node.content}</p>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <button type="button" className="text-xs text-zinc-400 hover:text-white" onClick={() => setReplyOpen((x) => !x)}>
                Reply
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={voteBusy}
                  onClick={() => vote(1)}
                  className={`text-xs px-2 py-1 rounded transition disabled:opacity-40 ${node.my_vote === 1 ? 'bg-red-900/45 text-red-200' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                >
                  ▲ {node.likes_up ?? 0}
                </button>
                <button
                  type="button"
                  disabled={voteBusy}
                  onClick={() => vote(-1)}
                  className={`text-xs px-2 py-1 rounded transition disabled:opacity-40 ${node.my_vote === -1 ? 'bg-red-900/50 text-red-300' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                >
                  ▼ {node.likes_down ?? 0}
                </button>
              </div>
              {user && (user.id === node.user_id || user.role === 'admin') && (
                <button type="button" className="text-xs text-red-400 hover:text-red-300" onClick={remove}>
                  Delete
                </button>
              )}
            </div>
            {replyOpen && user && (
              <form onSubmit={submitReply} className="mt-3 space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  placeholder="Write a reply…"
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-narmax-red outline-none"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="text-xs bg-narmax-red px-4 py-1.5 rounded font-bold disabled:opacity-50"
                >
                  Post reply
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
      {node.children?.length > 0 && (
        <ul className="space-y-0">
          {node.children.map((ch) => (
            <CommentNode
              key={ch.id}
              node={ch}
              user={user}
              tmdbId={tmdbId}
              mediaType={mediaType}
              movieMeta={movieMeta}
              onRefresh={onRefresh}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function ThreadedComments({ flatComments, user, tmdbId, mediaType, movieMeta, onRefresh }) {
  const tree = useMemo(() => buildTree(flatComments || []), [flatComments]);

  return (
    <ul className="space-y-2">
      {tree.map((node) => (
        <CommentNode
          key={node.id}
          node={node}
          user={user}
          tmdbId={tmdbId}
          mediaType={mediaType}
          movieMeta={movieMeta}
          onRefresh={onRefresh}
          depth={0}
        />
      ))}
      {!tree.length && <li className="text-zinc-500 text-sm">No comments yet.</li>}
    </ul>
  );
}
