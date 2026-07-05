import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import DataTable from "./DataTable";
import {
  createItem,
  deleteItem,
  fetchCollection,
  getDonationReportUrl,
  patchItem,
  translateAuctionItemName,
  updateItem,
} from "../services/api";

const PAGE_SIZE = 10;
const money = (value) => `Rs. ${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;

const buildInitialState = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue ?? "";
    return acc;
  }, {});

const normalizeWholeRupeeFields = (payload) => {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if ((key === "amount" || key === "price") && value !== "" && value !== null && value !== undefined) {
        return [key, String(Math.round(Number(value || 0)))];
      }
      return [key, value];
    }),
  );
};

function SearchableSelect({ field, options, value, onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  const selectedOption = options.find((option) => String(option.value) === String(value));
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }
    return options.filter((option) =>
      (option.searchText || option.label || "").toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectOption = (nextValue) => {
    if (disabled) {
      return;
    }
    onChange({ target: { name: field.name, value: nextValue } });
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  };

  return (
    <div
      className={`searchable-select ${isOpen ? "searchable-select--open" : ""} ${
        disabled ? "searchable-select--disabled" : ""
      }`}
      ref={rootRef}
    >
      <button
        type="button"
        className="searchable-select__trigger"
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current);
          }
        }}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className={selectedOption ? "" : "searchable-select__placeholder"}>
          {selectedOption?.label || `Select ${field.label}`}
        </span>
      </button>

      <input type="hidden" name={field.name} value={value ?? ""} required={field.required} />

      {isOpen ? (
        <div className="searchable-select__menu">
          <input
            className="searchable-select__search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Search ${field.label} by name or phone`}
            autoFocus
          />
          <div className="searchable-select__options">
            <button
              type="button"
              className={`searchable-select__option ${!value ? "searchable-select__option--active" : ""}`}
              onClick={() => selectOption("")}
            >
              Select {field.label}
            </button>
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`searchable-select__option ${
                    String(option.value) === String(value) ? "searchable-select__option--active" : ""
                  }`}
                  onClick={() => selectOption(option.value)}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <p className="searchable-select__empty">No matching records found.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ResourceSection({ config, lookupData, onDataChange, pendingAuctionTransaction, onReceiptTransactionDone }) {
  const [items, setItems] = useState([]);
  const [formState, setFormState] = useState(buildInitialState(config.fields));
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [quantityPopup, setQuantityPopup] = useState(false);
  const [receiptDuplicatePopup, setReceiptDuplicatePopup] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualTranslationOverrides, setManualTranslationOverrides] = useState({});
  const [lastAutoTranslations, setLastAutoTranslations] = useState({});
  const [pagination, setPagination] = useState({ count: 0, limit: PAGE_SIZE, offset: 0 });

  const translationConfig = config.translationConfig;
  const isPendingReceiptFlow = config.endpoint === "receipts" && Boolean(pendingAuctionTransaction);

  const loadItems = async (term = "", nextOffset = pagination.offset) => {
    try {
      const response = await fetchCollection(config.endpoint, term, {
        limit: PAGE_SIZE,
        offset: nextOffset,
        returnPage: true,
      });
      setItems(response.results);
      setPagination({
        count: response.count,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      if (config.showFullRecordOnSingleResult && term && response.results.length === 1) {
        setSelectedItem(response.results[0]);
      } else if (!term) {
        setSelectedItem(null);
      }
    } catch (loadError) {
      setError(loadError.response?.data?.detail || "Unable to load data.");
    }
  };

  useEffect(() => {
    loadItems(search, 0);
  }, [config.endpoint]);

  const resetForm = () => {
    setFormState(buildInitialState(config.fields));
    setEditingId(null);
    setIsModalOpen(false);
    setManualTranslationOverrides({});
    setLastAutoTranslations({});
  };

  const selectOptions = useMemo(() => lookupData || {}, [lookupData]);
  const visibleFields = useMemo(
    () => config.fields.filter((field) => (field.visibleWhen ? field.visibleWhen(formState) : true)),
    [config.fields, formState],
  );

  useEffect(() => {
    if (!config.deriveFormState) {
      return;
    }
    setFormState((current) => {
      const next = config.deriveFormState(current, selectOptions);
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [config, selectOptions]);

  useEffect(() => {
    if (config.endpoint !== "receipts" || !pendingAuctionTransaction) {
      return;
    }

    setEditingId(null);
    setSelectedItem(null);
    setFeedback("");
    setError("");
    setFormState((current) => ({
      ...current,
      receipt_no: pendingAuctionTransaction.receipt_no || "",
      source_type: pendingAuctionTransaction.source_type || "Member",
      member: pendingAuctionTransaction.member || "",
      relative: pendingAuctionTransaction.relative || "",
      phone_number: pendingAuctionTransaction.primary_phone_number || "",
      receipt_date: "",
    }));
  }, [config.endpoint, pendingAuctionTransaction]);

  useEffect(() => {
    if (!config.useModalForm || typeof document === "undefined") {
      return undefined;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = isModalOpen ? "hidden" : originalOverflow;
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [config.useModalForm, isModalOpen]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (translationConfig) {
      const { sourceField, targetField } = translationConfig;
      if (name === sourceField) {
        setManualTranslationOverrides((current) => {
          if (!current[targetField] || !formState[targetField] || formState[targetField] === lastAutoTranslations[targetField]) {
            return { ...current, [targetField]: false };
          }
          return current;
        });
      }

      if (name === targetField) {
        setManualTranslationOverrides((current) => ({
          ...current,
          [targetField]: Boolean(value) && value !== (lastAutoTranslations[targetField] || ""),
        }));
      }
    }
    setFormState((current) => ({ ...current, [name]: value }));
  };

  useEffect(() => {
    if (!translationConfig || !isModalOpen) {
      return undefined;
    }

    const { sourceField, targetField } = translationConfig;
    const sourceValue = (formState[sourceField] || "").trim();
    const targetValue = formState[targetField] || "";
    const targetManuallyOverridden = manualTranslationOverrides[targetField];

    if (!sourceValue) {
      if (!targetManuallyOverridden && targetValue) {
        setFormState((current) => ({ ...current, [targetField]: "" }));
        setLastAutoTranslations((current) => ({ ...current, [targetField]: "" }));
      }
      return undefined;
    }

    if (targetManuallyOverridden) {
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await translateAuctionItemName(sourceValue);
        const translatedValue = response.auction_item_name_tamil || "";
        setFormState((current) => {
          if ((current[sourceField] || "").trim() !== sourceValue) {
            return current;
          }
          return { ...current, [targetField]: translatedValue };
        });
        setLastAutoTranslations((current) => ({ ...current, [targetField]: translatedValue }));
      } catch {
        // Keep the field editable even if translation is unavailable.
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [config, formState, isModalOpen, lastAutoTranslations, manualTranslationOverrides, translationConfig]);

  const handleSearch = async (event) => {
    event.preventDefault();
    await loadItems(search, 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");
    try {
      const payload = normalizeWholeRupeeFields(config.preparePayload ? config.preparePayload(formState) : formState);
      if (editingId) {
        await updateItem(config.endpoint, editingId, payload);
        setFeedback(`${config.title} updated.`);
      } else {
        const createdItem = await createItem(config.endpoint, payload);
        if (config.endpoint === "receipts" && pendingAuctionTransaction && formState.receipt_no) {
          await patchItem("auction-transactions", pendingAuctionTransaction.id, {
            payment_status: "Paid",
            receipt: formState.receipt_no,
          });
          onReceiptTransactionDone?.();
          setFeedback("Receipt created and auction transaction marked Paid.");
        } else {
          setFeedback(`${config.title} created.`);
        }
        setSelectedItem(createdItem);
      }
      resetForm();
      await loadItems(search, pagination.offset);
      onDataChange?.();
    } catch (submitError) {
      const detail = submitError.response?.data;
      const detailString = typeof detail === "string" ? detail : JSON.stringify(detail);
      
      // Check if error is related to quantity limit
      if (detailString.includes("The requested item is no longer available")) {
        setQuantityPopup(true);
      } else if (
        detailString.includes("This receipt number is already used so use another receipt number")
        && config.endpoint === "receipts"
        && pendingAuctionTransaction
        && formState.receipt_no
      ) {
        try {
          await patchItem("auction-transactions", pendingAuctionTransaction.id, {
            receipt: formState.receipt_no,
          });
          onReceiptTransactionDone?.();
          resetForm();
          await loadItems(search, pagination.offset);
          onDataChange?.();
          setFeedback("Existing receipt linked and auction transaction marked Paid.");
        } catch (linkError) {
          const linkDetail = linkError.response?.data;
          setError(typeof linkDetail === "string" ? linkDetail : JSON.stringify(linkDetail));
        }
      } else if (detailString.includes("This receipt number is already used so use another receipt number")) {
        setReceiptDuplicatePopup(true);
      } else {
        setError(detailString);
      }
    }
  };

  const handleEdit = (item) => {
    const nextState = buildInitialState(config.fields);
    config.fields.forEach((field) => {
      nextState[field.name] = field.valueFromItem ? field.valueFromItem(item) : item[field.name] ?? "";
    });
    setFormState(nextState);
    setEditingId(item[config.rowKey]);
    setSelectedItem(item);
    setFeedback("");
    setError("");
    if (translationConfig) {
      setLastAutoTranslations({
        [translationConfig.targetField]: item[translationConfig.targetField] ?? "",
      });
      setManualTranslationOverrides({
        [translationConfig.targetField]: Boolean(item[translationConfig.targetField]),
      });
    }
    if (config.useModalForm) {
      setIsModalOpen(true);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(`Delete this ${config.title.toLowerCase()} record?`);
    if (!confirmed) {
      return;
    }
    try {
      await deleteItem(config.endpoint, item[config.rowKey]);
      await loadItems(search, pagination.offset);
      onDataChange?.();
      setFeedback(`${config.title} deleted.`);
      if (editingId === item[config.rowKey]) {
        resetForm();
      }
      if (selectedItem?.[config.rowKey] === item[config.rowKey]) {
        setSelectedItem(null);
      }
    } catch (deleteError) {
      const detail = deleteError.response?.data;
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
  };

  const handleOpenCreate = () => {
    setFeedback("");
    setError("");
    setEditingId(null);
    setFormState(buildInitialState(config.fields));
    setManualTranslationOverrides({});
    setLastAutoTranslations({});
    setIsModalOpen(true);
  };

  const handleOpenDonationReport = () => {
    window.open(getDonationReportUrl("pdf", search), "_blank", "noopener,noreferrer");
  };

  const renderForm = () => (
    <form className="record-form" onSubmit={handleSubmit}>
      {visibleFields.map((field) => {
        const options = field.optionsKey ? selectOptions[field.optionsKey] || [] : [];
        const isLockedReceiptField =
          isPendingReceiptFlow && !["receipt_no", "receipt_date"].includes(field.name);
        return (
          <label key={field.name}>
            <span>{field.label}</span>
            {field.type === "select" ? (
              <SearchableSelect
                field={field}
                options={[...(field.options || []), ...options]}
                value={formState[field.name]}
                onChange={handleChange}
                disabled={isLockedReceiptField}
              />
            ) : (
              <input
                type={field.type || "text"}
                name={field.name}
                value={formState[field.name]}
                onChange={handleChange}
                required={field.required}
                readOnly={field.readOnly || isLockedReceiptField}
                step={field.step}
              />
            )}
          </label>
        );
      })}

      {config.renderPreview ? <div className="preview-panel">{config.renderPreview(formState, selectOptions)}</div> : null}

      {error ? <p className="status-message status-message--error">{error}</p> : null}
      {feedback ? <p className="status-message status-message--success">{feedback}</p> : null}

      <div className="form-actions">
        <button type="submit">{editingId ? "Update" : "Create"}</button>
        <button type="button" className="ghost-button" onClick={resetForm}>
          {config.useModalForm ? "Cancel" : "Clear"}
        </button>
      </div>
    </form>
  );

  const modalMarkup =
    config.useModalForm && isModalOpen
      ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={resetForm}
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(43, 33, 22, 0.45)",
            zIndex: 9999,
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={config.createButtonLabel || `Create ${config.title}`}
            style={{
              width: "min(720px, calc(100vw - 32px))",
              maxHeight: "90vh",
              overflow: "auto",
              borderRadius: "24px",
              padding: "24px",
              background: "var(--panel-strong)",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <p className="eyebrow">{editingId ? "Edit Record" : "New Record"}</p>
                <h3>{editingId ? `Update ${config.title}` : config.createButtonLabel || `Create ${config.title}`}</h3>
              </div>
              <button type="button" className="ghost-button" onClick={resetForm}>
                Close
              </button>
            </div>
            {renderForm()}
          </div>
        </div>
        )
      : null;

  const quantityPopupMarkup = quantityPopup
    ? createPortal(
      <div
        className="modal-backdrop"
        role="presentation"
        onClick={() => setQuantityPopup(false)}
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "rgba(43, 33, 22, 0.45)",
          zIndex: 10000,
        }}
      >
        <div
          className="modal-card"
          role="alertdialog"
          aria-modal="true"
          aria-label="Quantity Limit Alert"
          style={{
            width: "min(400px, calc(100vw - 32px))",
            borderRadius: "24px",
            padding: "24px",
            background: "var(--panel-strong)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "24px", marginBottom: "12px" }}>⚠️</p>
            <h3 style={{ marginBottom: "12px" }}>Item Unavailable</h3>
            <p style={{ marginBottom: "24px", color: "var(--text-secondary)" }}>
              The requested item is no longer available. The maximum auction quantity has been reached.
            </p>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setQuantityPopup(false)}
              style={{ width: "100%" }}
            >
              OK
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  const receiptDuplicatePopupMarkup = receiptDuplicatePopup
    ? createPortal(
      <div
        className="modal-backdrop"
        role="presentation"
        onClick={() => setReceiptDuplicatePopup(false)}
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "rgba(43, 33, 22, 0.45)",
          zIndex: 10000,
        }}
      >
        <div
          className="modal-card"
          role="alertdialog"
          aria-modal="true"
          aria-label="Duplicate Receipt Alert"
          style={{
            width: "min(400px, calc(100vw - 32px))",
            borderRadius: "24px",
            padding: "24px",
            background: "var(--panel-strong)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div style={{ textAlign: "center" }}>
            <h3 style={{ marginBottom: "12px" }}>Receipt Number Already Used</h3>
            <p style={{ marginBottom: "24px", color: "var(--text-secondary)" }}>
              This receipt number is already used so use another receipt number
            </p>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setReceiptDuplicatePopup(false)}
              style={{ width: "100%" }}
            >
              OK
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <section className="resource-card" id={config.endpoint}>
      <div className="resource-header">
        <div>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <div className="resource-header__actions">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={config.searchPlaceholder}
            />
            <button type="submit">Search</button>
          </form>
          {config.useModalForm ? (
            <button type="button" className="create-action-button" onClick={handleOpenCreate}>
              <span className="create-action-button__icon">+</span>
              <span>{config.createButtonLabel || `Create ${config.title}`}</span>
            </button>
          ) : null}
          {config.endpoint === "donations" ? (
            <button type="button" className="ghost-button" onClick={handleOpenDonationReport}>
              PDF
            </button>
          ) : null}
        </div>
      </div>

      {feedback && config.useModalForm ? <p className="status-message status-message--success">{feedback}</p> : null}
      {error && config.useModalForm && !isModalOpen ? <p className="status-message status-message--error">{error}</p> : null}

      <div className={`resource-grid ${config.useModalForm ? "resource-grid--full" : ""}`}>
        {!config.useModalForm ? renderForm() : null}

        <DataTable
          columns={config.columns}
          rows={items}
          onEdit={handleEdit}
          onDelete={handleDelete}
          rowKey={config.rowKey}
          pagination={pagination}
          onPageChange={(nextOffset) => loadItems(search, nextOffset)}
        />
      </div>

      {config.detailFields && selectedItem ? (
        <section className="record-details">
          <div className="record-details__header">
            <h3>Full {config.title} Details</h3>
            <p>Showing the complete data for the selected record.</p>
          </div>

          <div className="record-details__grid">
            {config.detailFields.map((field) => (
              <article className="record-detail" key={field.key}>
                <span>{field.label}</span>
                <strong>{field.render ? field.render(selectedItem) : selectedItem[field.key] || "-"}</strong>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {config.endpoint === "receipts" && pendingAuctionTransaction ? (
        <section className="record-details">
          <div className="record-details__header">
            <h3>Auction Transaction Details</h3>
            <p>Enter receipt number and date. Source and phone are filled from the selected transaction.</p>
          </div>

          <div className="record-details__grid">
            <article className="record-detail">
              <span>Transaction ID</span>
              <strong>{pendingAuctionTransaction.id}</strong>
            </article>
            <article className="record-detail">
              <span>Source Type</span>
              <strong>{pendingAuctionTransaction.source_type || "-"}</strong>
            </article>
            <article className="record-detail">
              <span>Member/Non member ID</span>
              <strong>{pendingAuctionTransaction.source_id || pendingAuctionTransaction.member_id || "-"}</strong>
            </article>
            <article className="record-detail">
              <span>Name</span>
              <strong>{pendingAuctionTransaction.member_name || "-"}</strong>
            </article>
            <article className="record-detail">
              <span>Phone</span>
              <strong>{pendingAuctionTransaction.primary_phone_number || "-"}</strong>
            </article>
            <article className="record-detail">
              <span>Item</span>
              <strong>{pendingAuctionTransaction.item_name || "-"}</strong>
            </article>
            <article className="record-detail">
              <span>Token</span>
              <strong>{pendingAuctionTransaction.token_number || "-"}</strong>
            </article>
            <article className="record-detail">
              <span>Amount</span>
              <strong>{pendingAuctionTransaction.price ? money(pendingAuctionTransaction.price) : "-"}</strong>
            </article>
            <article className="record-detail">
              <span>Payment Status</span>
              <strong>{pendingAuctionTransaction.payment_status || "-"}</strong>
            </article>
          </div>
        </section>
      ) : null}

      {modalMarkup && typeof document !== "undefined" ? createPortal(modalMarkup, document.body) : null}
      {quantityPopupMarkup}
      {receiptDuplicatePopupMarkup}
    </section>
  );
}
