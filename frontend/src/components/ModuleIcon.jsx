const MODULE_ICON_CONFIG = {
  dashboard: {
    color: "#f0b84d",
    paths: ["M4 5h6v6H4z", "M14 5h6v6h-6z", "M4 15h6v4H4z", "M14 15h6v4h-6z"],
  },
  "member-data": {
    color: "#59b37b",
    paths: [
      "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
      "M3.5 19a5.5 5.5 0 0 1 11 0",
      "M16 10a2.5 2.5 0 1 0 0-5",
      "M16.5 14a4.5 4.5 0 0 1 4 5",
    ],
  },
  receipts: {
    color: "#4ca3dd",
    paths: ["M7 3h10v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4z", "M9.5 8h5", "M9.5 12h5", "M9.5 16h3"],
  },
  "auction-transactions": {
    color: "#e07a5f",
    paths: ["M7 7l4 4", "M10 4l6 6", "M5 9l4-4", "M14 12l-4 4", "M4 20h9", "M13 17l5 5"],
  },
  "auction-reports": {
    color: "#7c8cff",
    paths: ["M5 19V5", "M5 19h15", "M9 16v-5", "M13 16V8", "M17 16v-8"],
  },
  deposits: {
    color: "#2aa89b",
    paths: ["M4 9l8-5 8 5", "M6 10h12", "M7 10v7", "M12 10v7", "M17 10v7", "M5 19h14"],
  },
  "auction-items": {
    color: "#c889ff",
    paths: ["M4 8l8-4 8 4-8 4z", "M4 8v8l8 4 8-4V8", "M12 12v8"],
  },
  eelam: {
    color: "#ff9f43",
    paths: ["M12 3c3 3 5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 2-6 5-9z", "M12 19c1.7-1.8 2.5-3.6 2.5-5.5"],
  },
  donations: {
    color: "#e85d8a",
    paths: [
      "M12 20s-7-4.4-7-10a3.8 3.8 0 0 1 7-2.1A3.8 3.8 0 0 1 19 10c0 5.6-7 10-7 10z",
    ],
  },
};

export default function ModuleIcon({ endpoint }) {
  const config = MODULE_ICON_CONFIG[endpoint] || MODULE_ICON_CONFIG.dashboard;

  return (
    <span className="module-icon" style={{ "--module-icon-color": config.color }} aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img">
        {config.paths.map((path) => (
          <path key={path} d={path} />
        ))}
      </svg>
    </span>
  );
}
