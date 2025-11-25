export default function Tabs({ active, onChange, tabs, className = "" }) {
  return (
    <div
      className={`flex gap-1 bg-slate-100 p-1 rounded-xl ${className}`}
      role="tablist"
      aria-label="Tabs"
    >
      {tabs.map((t, idx) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`
            flex-1 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
            ${
              active === t.id
                ? 'bg-white text-primary shadow-md transform scale-105'
                : 'text-slate-600 hover:text-primary hover:bg-white/50'
            }
          `}
          role="tab"
          aria-selected={active === t.id}
          aria-controls={`tabpanel-${t.id}`}
          id={`tab-${t.id}`}
          tabIndex={active === t.id ? 0 : -1}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
