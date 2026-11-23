import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';

const NewChatModal = ({ open, onClose, onSend, contacts = [] }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const list = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts.slice(0, 12);
    return contacts.filter((contact) => contact.name?.toLowerCase().includes(query)).slice(0, 12);
  }, [contacts, search]);

  return (
    <Modal open={open} onClose={onClose} title="New chat" description="Choose who to message" size="lg">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-faint" />
          <input
            className="field pl-9"
            placeholder="Search contacts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {list.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 transition hover:bg-app-hover"
              onClick={() => setSelected(contact)}
            >
              <Avatar user={contact} size="sm" />
              <span className="text-sm text-app-text">{contact.name}</span>
            </button>
          ))}
          {list.length === 0 && (
            <p className="px-4 text-sm text-app-muted">No contacts match "{search}"</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-app-border px-5 py-3">
        <button type="button" className="btn-ghost" onClick={() => onClose()}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={() => selected && onSend(selected.id)} disabled={!selected}>
          Start chatting
        </button>
      </div>
    </Modal>
  );
};

export default NewChatModal;
