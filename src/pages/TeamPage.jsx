import { useEffect, useState } from "react";
import { UserPlus, Trash2, Pencil } from "lucide-react";
import { Button, Card, Modal, Field, inputClass, IconButton, PersonAvatar } from "../components/ui";
import ColorPicker from "../components/ColorPicker";
import {
  colorForPerson,
  defaultColorForPerson,
  normalizeHexColor,
  personColorError,
  isValidPersonColor,
} from "../lib/constants";
import { usePersist } from "../hooks/usePersist";
import PageContainer from "../components/PageContainer";

export default function TeamPage({ people, rules, addPerson, updatePerson, removePerson }) {
  const { persist } = usePersist();
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

  function handleSave({ nome, cargo, color }) {
    if (!nome.trim()) return;

    const patch = { nome: nome.trim() };
    const cargoTrim = cargo?.trim();
    patch.cargo = cargoTrim || undefined;
    patch.color = isValidPersonColor(color) ? normalizeHexColor(color) : undefined;

    const action = editing
      ? () => updatePerson(editing.id, patch)
      : () => addPerson(patch);
    const successMessage = editing ? "Funcionário atualizado." : "Funcionário adicionado.";

    persist(action, successMessage, "Não foi possível salvar o funcionário.").then((result) => {
      if (result?.ok) setModalOpen(false);
    });
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
                  {[p.cargo, `${ruleCountFor(p.id)} regra${ruleCountFor(p.id) !== 1 ? "s" : ""} de escala`]
                    .filter(Boolean)
                    .join(" · ")}
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
        person={editing}
        people={people}
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
              persist(
                () => removePerson(confirmDelete.id),
                "Funcionário removido.",
                "Não foi possível remover o funcionário."
              ).then((result) => {
                if (result?.ok) setConfirmDelete(null);
              });
            }}
          >
            Remover
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}

function resolveInitialHex(person) {
  if (person?.color && isValidPersonColor(person.color)) {
    return normalizeHexColor(person.color);
  }
  return "";
}

function PersonModal({ open, person, people, title, onClose, onSave }) {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [hexInput, setHexInput] = useState("");
  const [colorError, setColorError] = useState("");

  useEffect(() => {
    if (!open) return;
    setNome(person?.nome ?? "");
    setCargo(person?.cargo ?? "");
    setHexInput(resolveInitialHex(person));
    setColorError("");
  }, [person, open]);

  function handleHexChange(value) {
    setHexInput(value);
    setColorError("");
  }

  const defaultPreviewColor = person
    ? defaultColorForPerson(person.id, people)
    : "#5e636e";

  const previewColor = (() => {
    const hex = normalizeHexColor(hexInput);
    if (hex && !personColorError(hex)) return hex;
    return defaultPreviewColor;
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="person-form">
            Salvar
          </Button>
        </div>
      }
    >
      <form
        id="person-form"
        onSubmit={(e) => {
          e.preventDefault();
          const hex = normalizeHexColor(hexInput);
          const error = personColorError(hex);
          if (error) {
            setColorError(error);
            return;
          }
          if (!hex) {
            setColorError("Informe um código hex válido (ex.: #a855f7).");
            return;
          }
          onSave({ nome, cargo, color: hex });
        }}
      >
        <div className="mb-4 flex items-center gap-3">
          <PersonAvatar nome={nome || "?"} color={previewColor} size={40} />
          <p className="text-[13px] text-ink-soft">Pré-visualização da cor no avatar</p>
        </div>

        <Field label="Nome">
          <input
            autoFocus
            className={inputClass}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Mariana Souza"
          />
        </Field>

        <Field label="Cargo" hint="Opcional">
          <input
            className={inputClass}
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            //placeholder="Ex.: Enfermeira, Técnico..."
          />
        </Field>

        <Field label="Cor">
          <ColorPicker
            key={person?.id ?? "new"}
            value={hexInput}
            onChange={handleHexChange}
            error={colorError}
            fallbackColor={defaultPreviewColor}
          />
        </Field>
      </form>
    </Modal>
  );
}
