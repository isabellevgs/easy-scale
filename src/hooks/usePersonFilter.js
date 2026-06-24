import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "easyscale:personFilter";

function persistPersonFilter(ids) {
  try {
    if (ids.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function loadPersonFilter() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((id) => typeof id === "string" && id);
      }
    } catch {
      // formato legado: id único em string
    }

    return [raw];
  } catch {
    return [];
  }
}

export function usePersonFilter(people) {
  const [personIds, setPersonIdsState] = useState(loadPersonFilter);

  useEffect(() => {
    const validIds = new Set(people.map((p) => p.id));
    const next = personIds.filter((id) => validIds.has(id));
    if (next.length !== personIds.length) {
      setPersonIdsState(next);
      persistPersonFilter(next);
    }
  }, [people, personIds]);

  const setPersonIds = useCallback((ids) => {
    const next = [...new Set(ids.filter(Boolean))];
    setPersonIdsState(next);
    persistPersonFilter(next);
  }, []);

  const togglePersonId = useCallback((id) => {
    setPersonIdsState((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      persistPersonFilter(next);
      return next;
    });
  }, []);

  const clearPersonFilter = useCallback(() => {
    setPersonIdsState([]);
    persistPersonFilter([]);
  }, []);

  return {
    personIds,
    setPersonIds,
    togglePersonId,
    clearPersonFilter,
    isActive: personIds.length > 0,
  };
}
