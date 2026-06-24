import { createContext, useContext } from "react";

const ShellContext = createContext({ sidebarCollapsed: false });

export function ShellProvider({ sidebarCollapsed, children }) {
  return (
    <ShellContext.Provider value={{ sidebarCollapsed }}>{children}</ShellContext.Provider>
  );
}

export function useShell() {
  return useContext(ShellContext);
}
