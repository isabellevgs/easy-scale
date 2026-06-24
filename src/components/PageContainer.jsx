import { useShell } from "../context/ShellContext";

const WIDTHS = {
  narrow: {
    expanded: "max-w-3xl",
    collapsed: "max-w-3xl md:max-w-4xl",
  },
  default: {
    expanded: "max-w-4xl",
    collapsed: "max-w-4xl md:max-w-6xl",
  },
  wide: {
    expanded: "max-w-5xl",
    collapsed: "max-w-5xl md:max-w-none",
  },
};

export default function PageContainer({ children, size = "default", className = "" }) {
  const { sidebarCollapsed } = useShell();
  const width = WIDTHS[size][sidebarCollapsed ? "collapsed" : "expanded"];

  return (
    <div
      className={`mx-auto w-full ${width} transition-[max-width] duration-200 ease-out ${className}`}
    >
      {children}
    </div>
  );
}
