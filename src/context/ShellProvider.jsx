import { ShellContext } from "./shell-context";

export function ShellProvider({ sidebarCollapsed, children }) {
  return (
    <ShellContext.Provider value={{ sidebarCollapsed }}>{children}</ShellContext.Provider>
  );
}
