import { useContext, useMemo } from "react";
import { ShiftContext } from "../context/shift-context";
import { buildShifts, buildShiftsById } from "../lib/shifts";

export function useShifts() {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error("useShifts deve ser usado dentro de ShiftsProvider");
  }
  return context;
}

export function useShiftsValue(shifts) {
  return useMemo(
    () => ({
      shifts: buildShifts(shifts),
      shiftsById: buildShiftsById(shifts),
      shiftsConfig: shifts,
    }),
    [shifts]
  );
}
