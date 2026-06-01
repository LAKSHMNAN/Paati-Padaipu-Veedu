import ModuleIcon from "./ModuleIcon";

export default function ModuleSwitcher({ sections, activeModule, onSelect }) {
  return (
    <section className="module-switcher">
      <div className="module-switcher__copy">
        <p className="eyebrow">Modules</p>
        <h3>Work one module at a time</h3>
        <p>
          Each workflow is separated into its own module so members, receipts, transactions, and related records stay
          easier to manage.
        </p>
      </div>

      <div className="module-switcher__grid">
        {sections.map((section) => {
          const isActive = activeModule === section.endpoint;
          return (
            <button
              key={section.endpoint}
              type="button"
              className={`module-pill ${isActive ? "module-pill--active" : ""}`}
              onClick={() => onSelect(section.endpoint)}
            >
              <span className="module-pill__header">
                <ModuleIcon endpoint={section.endpoint} />
                <span className="module-pill__title">{section.title}</span>
              </span>
              <span className="module-pill__description">{section.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
