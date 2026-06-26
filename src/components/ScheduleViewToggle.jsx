import { Users, Target, Clock3 } from "lucide-react";
import { SCHEDULE_VIEW } from "../hooks/useScheduleViewMode";

export default function ScheduleViewToggle({ value, onChange }) {
  const options = [
    { id: SCHEDULE_VIEW.TIMELINE, label: "Horário", icon: Clock3 },
    { id: SCHEDULE_VIEW.PEOPLE, label: "Pessoas", icon: Users },
    { id: SCHEDULE_VIEW.NEEDS, label: "Necessidade", icon: Target },
  ];

  return (
    <div
      className="inline-flex rounded-lg border border-border-soft bg-surface p-0.5"
      role="group"
      aria-label="Modo de visualização da escala"
    >
      {options.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active ? "bg-surface-3 text-ink" : "text-ink-soft hover:text-ink"
            }`}
            aria-pressed={active}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
