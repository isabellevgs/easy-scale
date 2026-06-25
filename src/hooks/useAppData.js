import { useCallback, useEffect, useRef, useState } from "react";
import { loadState, saveState, uid } from "../lib/storage";
import {
  sortPeopleByName,
  isValidPersonColor,
  normalizeHexColor,
  normalizePersonIntervalMinutes,
  DEFAULT_PERSON_INTERVAL_MINUTES,
  PEOPLE_PALETTE,
} from "../lib/constants";
import {
  DEFAULT_SHIFTS,
  normalizeShifts,
  isDefaultShifts,
  getShiftIds,
} from "../lib/shifts";
import {
  normalizeShiftNeedsForShifts,
  normalizeHolidays,
  pruneShiftNeeds,
} from "../lib/shiftNeeds";
import { downloadBackup, readBackupFile } from "../lib/backup";
import {
  normalizeConsistencyRules,
  pruneConsistencyRulesForShifts,
  removePersonFromConsistencyRules,
} from "../lib/consistencyRules";

function normalizeShiftItem(raw) {
  const [item] = normalizeShifts([raw]);
  return item;
}

export function useAppData() {
  const [state, setState] = useState(loadState);
  const saveListenersRef = useRef([]);

  const waitForSave = useCallback(() => {
    return new Promise((resolve) => {
      saveListenersRef.current.push(resolve);
    });
  }, []);

  const runAndSave = useCallback(
    (updater) => {
      const savePromise = waitForSave();
      setState(updater);
      return savePromise;
    },
    [waitForSave]
  );

  useEffect(() => {
    const result = saveState(state);
    const listeners = saveListenersRef.current.splice(0);
    listeners.forEach((listener) => listener(result));
  }, [state]);

  const addPerson = useCallback(
    (data) => {
      const nome = (typeof data === "string" ? data : data?.nome ?? "").trim();
      const person = { id: uid("p"), nome };
      if (typeof data === "object" && data) {
        const cargo = data.cargo?.trim();
        if (cargo) person.cargo = cargo;
        if (isValidPersonColor(data.color)) {
          person.color = normalizeHexColor(data.color);
        }
      }
      person.intervalMinutes = normalizePersonIntervalMinutes(
        typeof data === "object" && data
          ? data.intervalMinutes ?? DEFAULT_PERSON_INTERVAL_MINUTES
          : DEFAULT_PERSON_INTERVAL_MINUTES
      );
      return runAndSave((s) => {
        if (!person.color) {
          person.color = PEOPLE_PALETTE[s.people.length % PEOPLE_PALETTE.length];
        }
        return {
          ...s,
          people: sortPeopleByName([...s.people, person]),
        };
      }).then((result) => ({ ...result, person }));
    },
    [runAndSave]
  );

  const updatePerson = useCallback(
    (id, patch) => {
      return runAndSave((s) => ({
        ...s,
        people: sortPeopleByName(
          s.people.map((p) => (p.id === id ? { ...p, ...patch } : p))
        ),
      }));
    },
    [runAndSave]
  );

  const removePerson = useCallback(
    (id) => {
      return runAndSave((s) => ({
        ...s,
        people: s.people.filter((p) => p.id !== id),
        rules: s.rules.filter((r) => r.personId !== id),
        consistencyRules: removePersonFromConsistencyRules(s.consistencyRules, id),
      }));
    },
    [runAndSave]
  );

  const addRule = useCallback(
    (rule) => {
      const newRule = { id: uid("r"), ...rule };
      return runAndSave((s) => ({ ...s, rules: [...s.rules, newRule] })).then((result) => ({
        ...result,
        rule: newRule,
      }));
    },
    [runAndSave]
  );

  const updateRule = useCallback(
    (id, patch) => {
      return runAndSave((s) => ({
        ...s,
        rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }));
    },
    [runAndSave]
  );

  const removeRule = useCallback(
    (id) => {
      return runAndSave((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) }));
    },
    [runAndSave]
  );

  const addShift = useCallback(
    (shiftData) => {
      const shift = normalizeShiftItem({
        id: uid("shift"),
        ...shiftData,
      });
      return runAndSave((s) => {
        const shifts = [...s.shifts, shift];
        return {
          ...s,
          shifts,
          shiftNeeds: normalizeShiftNeedsForShifts(s.shiftNeeds, shifts),
        };
      }).then((result) => ({ ...result, shift }));
    },
    [runAndSave]
  );

  const updateShift = useCallback(
    (id, patch) => {
      return runAndSave((s) => {
        const shifts = s.shifts.map((shift) =>
          shift.id === id ? normalizeShiftItem({ ...shift, ...patch, id }) : shift
        );
        return {
          ...s,
          shifts,
          shiftNeeds: normalizeShiftNeedsForShifts(s.shiftNeeds, shifts),
        };
      });
    },
    [runAndSave]
  );

  const removeShift = useCallback(
    (id) => {
      return runAndSave((s) => {
        const shifts = s.shifts.filter((shift) => shift.id !== id);
        const shiftIds = getShiftIds(shifts);
        return {
          ...s,
          shifts,
          rules: s.rules.map((rule) => ({
            ...rule,
            shifts: Array.isArray(rule.shifts) ? rule.shifts.filter((shiftId) => shiftId !== id) : [],
          })),
          shiftNeeds: pruneShiftNeeds(
            normalizeShiftNeedsForShifts(s.shiftNeeds, shifts),
            shiftIds
          ),
          consistencyRules: pruneConsistencyRulesForShifts(s.consistencyRules, shiftIds),
        };
      });
    },
    [runAndSave]
  );

  const resetShifts = useCallback(() => {
    const shifts = structuredClone(DEFAULT_SHIFTS);
    return runAndSave((s) => ({
      ...s,
      shifts,
      shiftNeeds: normalizeShiftNeedsForShifts(s.shiftNeeds, shifts),
    }));
  }, [runAndSave]);

  const updateShiftNeeds = useCallback(
    (shiftNeeds) => {
      return runAndSave((s) => ({
        ...s,
        shiftNeeds: normalizeShiftNeedsForShifts(shiftNeeds, s.shifts),
      }));
    },
    [runAndSave]
  );

  const resetShiftNeeds = useCallback(() => {
    return runAndSave((s) => ({
      ...s,
      shiftNeeds: normalizeShiftNeedsForShifts(null, s.shifts),
    }));
  }, [runAndSave]);

  const addHoliday = useCallback(
    (dateISO) => {
      if (typeof dateISO !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
        return Promise.resolve({ ok: false, error: "Data inválida." });
      }
      return runAndSave((s) => ({
        ...s,
        holidays: normalizeHolidays([...s.holidays, dateISO]),
      }));
    },
    [runAndSave]
  );

  const removeHoliday = useCallback(
    (dateISO) => {
      return runAndSave((s) => ({
        ...s,
        holidays: normalizeHolidays(s.holidays.filter((date) => date !== dateISO)),
      }));
    },
    [runAndSave]
  );

  const updateConsistencyRules = useCallback(
    (consistencyRules) => {
      return runAndSave((s) => ({
        ...s,
        consistencyRules: normalizeConsistencyRules(consistencyRules, getShiftIds(s.shifts)),
      }));
    },
    [runAndSave]
  );

  const exportBackup = useCallback(() => {
    downloadBackup(state);
  }, [state]);

  const importBackup = useCallback(
    async (file) => {
      try {
        const nextState = await readBackupFile(file);
        try {
          localStorage.removeItem("easyscale:personFilter");
        } catch {
          // ignore
        }
        const savePromise = waitForSave();
        setState(nextState);
        const result = await savePromise;
        if (!result.ok) return result;
        return { ok: true, state: nextState };
      } catch (err) {
        return {
          ok: false,
          error: err?.message || "Não foi possível importar o backup.",
        };
      }
    },
    [waitForSave]
  );

  return {
    people: state.people,
    rules: state.rules,
    shifts: state.shifts,
    shiftNeeds: state.shiftNeeds,
    holidays: state.holidays,
    consistencyRules: state.consistencyRules,
    addPerson,
    updatePerson,
    removePerson,
    addRule,
    updateRule,
    removeRule,
    addShift,
    updateShift,
    removeShift,
    resetShifts,
    isDefaultShifts: isDefaultShifts(state.shifts),
    updateShiftNeeds,
    resetShiftNeeds,
    addHoliday,
    removeHoliday,
    exportBackup,
    importBackup,
    updateConsistencyRules,
  };
}
