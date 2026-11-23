import { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';

const NewGroupModal = ({ open, onClose, onSend, contacts = [] }) => {
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState([]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((id) => id !== id) : [...prev, id]
    );
  };

  const submit = () => {
    if (!groupName.trim() || selected.length < 2) return;
    onSend({ name: groupName.trim(), memberIds: selected });
  };

  return (
    <Modal open={open} onClose={onClose} title="New group" description="Pick people for the group" size="lg">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <h3 className="label mb-1.5">Group name</h3>
          <input
            className="field"
            placeholder="Space Explorers"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
        </div>

        <div>
          <h3 className="label mb-1.5">Add members ({selected.length})</h3>
          <div className="max-h-[50vh] overflow-y-auto">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 transition hover:bg-app-hover"
                onClick={() => toggle(contact.id)}
              >
                <Avatar user={contact} size="sm" />
                <div className="flex-1 text-sm text-app-text">{contact.name}</div>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected.includes(contact.id) ? 'border-app-accent bg-app-accent text-white' : 'border-app-border bg-transparent'
                  }`}
                >
                  <Plus className="h-3 w-3" />
                </span>
              </button>
            ))}
            {contacts.length === 0 && <p className="px-4 text-sm text-app-muted">No contacts to add</p>}
          </div>
        </div>

        {selected.length < 2 && (
          <p className="text-xs text-app-faint">Select at least two members</p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-app-border px-5 py-3">
        <button type="button" className="btn-ghost" onClick={() => onClose()}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={submit} disabled={selected.length < 2}>
          Create group
        </button>
      </div>
    </Modal>
  );
};

export default NewGroupModal;
