import { useContext } from "react";
import { ShellContext } from "../context/shell-context";

export function useShell() {
  return useContext(ShellContext);
}
