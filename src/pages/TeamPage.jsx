import { useEffect, useState } from "react";
import { UserPlus, Trash2, Pencil } from "lucide-react";
import { Button, Card, Modal, Field, inputClass, IconButton, PersonAvatar } from "../components/ui";
import { colorForPerson } from "../lib/constants";
import PageContainer from "../components/PageContainer";

export default function TeamPage({ people, rules, addPerson, updatePerson, removePerson }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // person or null
  const [confirmDelete, setConfirmDelete] = useState(null);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(person) {
    setEditing(person);
    setModalOpen(true);
  }

  function handleSave(nome) {
    if (!nome.trim()) return;
    if (editing) {
      updatePerson(editing.id, { nome: nome.trim() });
    } else {
      addPerson(nome);
    }
    setModalOpen(false);
  }

  function ruleCountFor(personId) {
    return rules.filter((r) => r.personId === personId).length;
  }

  return (
    <PageContainer size="narrow">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Equipe</h1>
          <p className="mt-0.5 text-[14px] text-ink-soft">Cadastre quem trabalha com você.</p>
        </div>
        <Button onClick={openNew}>
          <UserPlus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {people.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-3">
            <UserPlus className="h-5 w-5 text-ink-faint" />
          </div>
          <h2 className="text-[15px] font-medium text-ink">Nenhum funcionário ainda</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Adicione a primeira pessoa para montar a escala.
          </p>
          <Button className="mt-5" onClick={openNew}>
            Adicionar funcionário
          </Button>
        </Card>
      ) : (
        <Card className="divide-y divide-border-soft">
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
              <PersonAvatar nome={p.nome} color={colorForPerson(p.id, people)} />
              <div className="flex-1">
                <p className="text-[14px] font-medium text-ink">{p.nome}</p>
                <p className="text-[12px] text-ink-faint">
                  {ruleCountFor(p.id)} regra{ruleCountFor(p.id) !== 1 ? "s" : ""} de escala
                </p>
              </div>
              <IconButton onClick={() => openEdit(p)} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton variant="danger" onClick={() => setConfirmDelete(p)} aria-label="Remover">
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          ))}
        </Card>
      )}

      <PersonModal
        open={modalOpen}
        initial={editing?.nome ?? ""}
        title={editing ? "Editar funcionário" : "Adicionar funcionário"}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remover funcionário">
        <p className="text-[14px] text-ink-soft">
          Tem certeza que deseja remover <strong className="text-ink">{confirmDelete?.nome}</strong>?
          As regras de escala dessa pessoa também serão removidas.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              removePerson(confirmDelete.id);
              setConfirmDelete(null);
            }}
          >
            Remover
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}

function PersonModal({ open, initial, title, onClose, onSave }) {
  const [nome, setNome] = useState(initial);

  // sincroniza quando o modal reabre com outro valor inicial
  useEffect(() => {
    setNome(initial);
  }, [initial, open]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(nome);
        }}
      >
        <Field label="Nome">
          <input
            autoFocus
            className={inputClass}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Mariana Souza"
          />
        </Field>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
