import { ShiftContext } from "./shift-context";
import { useShiftsValue } from "../hooks/useShifts";

export function ShiftsProvider({ shifts, children }) {
  const value = useShiftsValue(shifts);

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}
