import { useCallback, useState } from "react";

const STORAGE_KEY = "easyscale:scheduleView";

export const SCHEDULE_VIEW = {
  PEOPLE: "people",
  NEEDS: "needs",
};

function loadViewMode() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === SCHEDULE_VIEW.NEEDS || value === SCHEDULE_VIEW.PEOPLE) return value;
  } catch {
    // ignore
  }
  return SCHEDULE_VIEW.PEOPLE;
}

export function useScheduleViewMode() {
  const [viewMode, setViewModeState] = useState(loadViewMode);

  const setViewMode = useCallback((mode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  return [viewMode, setViewMode];
}
