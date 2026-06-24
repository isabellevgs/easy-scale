import { useCallback, useEffect, useState } from "react";
import { loadState, saveState, uid } from "../lib/storage";
import { sortPeopleByName } from "../lib/constants";
import { DEFAULT_SHIFT_TIMES, normalizeShiftTimes } from "../lib/shifts";
import { normalizeShiftNeeds, normalizeHolidays } from "../lib/shiftNeeds";
import { downloadBackup, readBackupFile } from "../lib/backup";

export function useAppData() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addPerson = useCallback((nome) => {
    const person = { id: uid("p"), nome: nome.trim() };
    setState((s) => ({ ...s, people: sortPeopleByName([...s.people, person]) }));
    return person;
  }, []);

  const updatePerson = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      people: sortPeopleByName(
        s.people.map((p) => (p.id === id ? { ...p, ...patch } : p))
      ),
    }));
  }, []);

  const removePerson = useCallback((id) => {
    setState((s) => ({
      ...s,
      people: s.people.filter((p) => p.id !== id),
      rules: s.rules.filter((r) => r.personId !== id),
    }));
  }, []);

  const addRule = useCallback((rule) => {
    const newRule = { id: uid("r"), ...rule };
    setState((s) => ({ ...s, rules: [...s.rules, newRule] }));
    return newRule;
  }, []);

  const updateRule = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  const removeRule = useCallback((id) => {
    setState((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) }));
  }, []);

  const updateShiftTimes = useCallback((shiftTimes) => {
    setState((s) => ({ ...s, shiftTimes: normalizeShiftTimes(shiftTimes) }));
  }, []);

  const resetShiftTimes = useCallback(() => {
    setState((s) => ({ ...s, shiftTimes: structuredClone(DEFAULT_SHIFT_TIMES) }));
  }, []);

  const updateShiftNeeds = useCallback((shiftNeeds) => {
    setState((s) => ({ ...s, shiftNeeds: normalizeShiftNeeds(shiftNeeds) }));
  }, []);

  const resetShiftNeeds = useCallback(() => {
    setState((s) => ({ ...s, shiftNeeds: normalizeShiftNeeds(null) }));
  }, []);

  const addHoliday = useCallback((dateISO) => {
    if (typeof dateISO !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return;
    setState((s) => ({
      ...s,
      holidays: normalizeHolidays([...s.holidays, dateISO]),
    }));
  }, []);

  const removeHoliday = useCallback((dateISO) => {
    setState((s) => ({
      ...s,
      holidays: normalizeHolidays(s.holidays.filter((date) => date !== dateISO)),
    }));
  }, []);

  const exportBackup = useCallback(() => {
    downloadBackup(state);
  }, [state]);

  const importBackup = useCallback(async (file) => {
    const nextState = await readBackupFile(file);
    setState(nextState);
    return nextState;
  }, []);

  return {
    people: state.people,
    rules: state.rules,
    shiftTimes: state.shiftTimes,
    shiftNeeds: state.shiftNeeds,
    holidays: state.holidays,
    addPerson,
    updatePerson,
    removePerson,
    addRule,
    updateRule,
    removeRule,
    updateShiftTimes,
    resetShiftTimes,
    updateShiftNeeds,
    resetShiftNeeds,
    addHoliday,
    removeHoliday,
    exportBackup,
    importBackup,
  };
}
