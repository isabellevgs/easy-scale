import { createContext, useContext, useMemo } from "react";
import { buildShifts, buildShiftsById } from "../lib/shifts";

const ShiftsContext = createContext(null);

export function ShiftsProvider({ shiftTimes, children }) {
  const value = useMemo(
    () => ({
      shifts: buildShifts(shiftTimes),
      shiftsById: buildShiftsById(shiftTimes),
      shiftTimes,
    }),
    [shiftTimes]
  );

  return <ShiftsContext.Provider value={value}>{children}</ShiftsContext.Provider>;
}

export function useShifts() {
  const context = useContext(ShiftsContext);
  if (!context) {
    throw new Error("useShifts deve ser usado dentro de ShiftsProvider");
  }
  return context;
}
