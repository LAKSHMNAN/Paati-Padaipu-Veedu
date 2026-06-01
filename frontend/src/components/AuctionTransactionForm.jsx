import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import DataTable from "./DataTable";
import { createItem, deleteItem, fetchCollection, updateItem } from "../services/api";

const PAGE_SIZE = 10;

const INITIAL_ITEM_FORM_STATE = {
  auction_item_id: "",
  token_number: "",
  price: "",
  payment_status: "Unpaid",
};

const SOURCE_MODES = {
  MEMBER: "Member",
  NON_MEMBER: "Non-Member",
};

const TOKEN_ALREADY_USED_MESSAGE = "this token number is already used";

const hasTokenNumberError = (detail) => {
  const tokenErrors = Array.isArray(detail?.token_number) ? detail.token_number : [];
  return tokenErrors.length > 0;
};

const parseTokenList = (value) =>
  String(value || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

export default function AuctionTransactionForm({ config, lookupData, onDataChange, onOpenReceiptTransaction }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [duplicateTokenMessage, setDuplicateTokenMessage] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPaymentStatus, setEditPaymentStatus] = useState("Paid");
  const [sourceSearchQuery, setSourceSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState(null);
  const [itemFormState, setItemFormState] = useState(INITIAL_ITEM_FORM_STATE);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pagination, setPagination] = useState({ count: 0, limit: PAGE_SIZE, offset: 0 });

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
    } catch (loadError) {
      setError(loadError.response?.data?.detail || "Unable to load data.");
    }
  };

  useEffect(() => {
    loadItems(search, 0);
  }, [config.endpoint]);

  const sourceOptions = useMemo(() => {
    const memberOptions = (lookupData.members || []).map((record) => ({
      ...record,
      sourceType: SOURCE_MODES.MEMBER,
      sourceId: record.meta?.member_id,
      sourcePhone: record.meta?.primary_phone,
      sourceMeta: { ...record.meta, __sourceType: SOURCE_MODES.MEMBER },
    }));
    const nonMemberOptions = (lookupData.relatives || []).map((record) => ({
      ...record,
      sourceType: SOURCE_MODES.NON_MEMBER,
      sourceId: record.meta?.non_member_id,
      sourcePhone: record.meta?.phone_1,
      sourceMeta: { ...record.meta, __sourceType: SOURCE_MODES.NON_MEMBER },
    }));
    return [...memberOptions, ...nonMemberOptions];
  }, [lookupData.members, lookupData.relatives]);

  const filteredSourceOptions = useMemo(() => {
    const query = sourceSearchQuery.trim().toLowerCase();
    if (!query) {
      return sourceOptions;
    }

    return sourceOptions.filter((record) => {
      const meta = record.meta || {};
      const searchableParts = [
        record.value,
        record.label,
        record.sourceType,
        record.sourceId,
        meta.name,
        meta.primary_phone,
        meta.secondary_phone,
        meta.native_place,
        meta.non_member_id,
        meta.phone_1,
        meta.phone_2,
        meta.type,
        record.searchText,
      ];

      return searchableParts.filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [sourceOptions, sourceSearchQuery]);

  const availableAuctionItems = useMemo(
    () =>
      (lookupData.auctionItems || [])
        .map((record) => {
          const tokens = parseTokenList(record.meta?.tokens);
          const usedTokens = new Set(parseTokenList(record.meta?.used_tokens));
          const availableTokens = tokens.filter((token) => !usedTokens.has(token));
          return {
            ...record,
            availableTokens,
          };
        })
        .filter((record) => record.availableTokens.length > 0),
    [lookupData.auctionItems],
  );

  const selectedAuctionItem = useMemo(
    () => availableAuctionItems.find((record) => String(record.value) === String(itemFormState.auction_item_id)),
    [availableAuctionItems, itemFormState.auction_item_id],
  );

  useEffect(() => {
    const query = sourceSearchQuery.trim().toLowerCase();
    if (!query) {
      return;
    }

    const exactMatch = filteredSourceOptions.find((record) => {
      const meta = record.meta || {};
      const exactValues = [
        record.value,
        record.sourceId,
        meta.member_id,
        meta.non_member_id,
        meta.name,
        meta.primary_phone,
        meta.secondary_phone,
        meta.phone_1,
        meta.phone_2,
      ];

      return exactValues
        .filter(Boolean)
        .some((value) => String(value).toLowerCase() === query);
    });

    if (exactMatch) {
      setSelectedSource(exactMatch.sourceMeta);
      return;
    }

    if (filteredSourceOptions.length === 1) {
      setSelectedSource(filteredSourceOptions[0].sourceMeta);
    }
  }, [filteredSourceOptions, sourceSearchQuery]);

  const handleSearch = async (event) => {
    event.preventDefault();
    await loadItems(search, 0);
  };

  const resetCreateState = () => {
    setSourceSearchQuery("");
    setSelectedSource(null);
    setItemFormState(INITIAL_ITEM_FORM_STATE);
    setError("");
    setDuplicateTokenMessage("");
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    resetCreateState();
  };

  const openCreateModal = () => {
    setError("");
    setFeedback("");
    setDuplicateTokenMessage("");
    if (availableAuctionItems.length === 0) {
      setDuplicateTokenMessage("All auction item has finished");
      return;
    }
    setCreateModalOpen(true);
    setSourceSearchQuery("");
    setSelectedSource(null);
    setItemFormState(INITIAL_ITEM_FORM_STATE);
  };

  const handleSourceSelect = (record) => {
    setSelectedSource(record.sourceMeta);
    setSourceSearchQuery(record.sourceMeta?.name || record.sourceId || record.value || "");
  };

  const handleItemFormChange = (event) => {
    const { name, value } = event.target;
    setItemFormState((current) => ({
      ...current,
      [name]: value,
      ...(name === "auction_item_id" ? { token_number: "" } : {}),
    }));
  };

  const handleSubmitTransaction = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");

    if (!selectedSource) {
      setError("Select a member or non-member before creating the transaction.");
      return;
    }
    if (!itemFormState.auction_item_id) {
      setError("Select an auction item before creating the transaction.");
      return;
    }
    if (!itemFormState.token_number) {
      setError("Select an available token number before creating the transaction.");
      return;
    }

    try {
      const isMember = selectedSource.__sourceType === SOURCE_MODES.MEMBER;
      const payload = {
        member: isMember ? selectedSource.member_id : null,
        relative: isMember ? null : selectedSource.id,
        token_number: itemFormState.token_number,
        price: itemFormState.price,
        payment_status: "Unpaid",
        receipt: null,
      };

      await createItem(config.endpoint, payload);
      setFeedback("Auction Transaction created successfully.");
      closeCreateModal();
      await loadItems(search, pagination.offset);
      onDataChange?.();
    } catch (submitError) {
      const detail = submitError.response?.data;
      if (hasTokenNumberError(detail)) {
        setDuplicateTokenMessage(TOKEN_ALREADY_USED_MESSAGE);
        setError("");
        return;
      }
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditPaymentStatus(item.payment_status);
    setEditModalOpen(true);
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm("Delete this auction transaction record?");
    if (!confirmed) {
      return;
    }
    try {
      await deleteItem(config.endpoint, item.id);
      await loadItems(search, pagination.offset);
      onDataChange?.();
      setFeedback("Auction Transaction deleted.");
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
    } catch (deleteError) {
      const detail = deleteError.response?.data;
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
  };

  const handleOpenReceiptTransaction = (item) => {
    onOpenReceiptTransaction?.(item);
  };

  const handleUpdatePaymentStatus = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");

    try {
      await updateItem(config.endpoint, selectedItem.id, { payment_status: editPaymentStatus });
      setFeedback("Payment status updated successfully.");
      setEditModalOpen(false);
      await loadItems(search, pagination.offset);
      onDataChange?.();
      setSelectedItem(null);
    } catch (updateError) {
      const detail = updateError.response?.data;
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setError("");
  };

  const closeDuplicateTokenPopup = () => {
    setDuplicateTokenMessage("");
  };

  const selectedSourceIsMember = selectedSource?.__sourceType === SOURCE_MODES.MEMBER;
  const modalTitle = "Select Data And Enter Transaction";
  const searchLabel = "Search Member or Non Member";
  const searchPlaceholder = "Search by member/non-member ID, name, or phone number";

  const editTransactionModal = editModalOpen && selectedItem
    ? createPortal(
        <div className="modal-backdrop" role="presentation" onClick={closeEditModal}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Edit auction transaction payment status"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(500px, calc(100vw - 32px))" }}
          >
            <div className="modal-card__header">
              <div>
                <p className="eyebrow">Update Payment Status</p>
                <h3 style={{ marginTop: "8px" }}>Edit Auction Transaction</h3>
              </div>
              <button type="button" className="ghost-button" onClick={closeEditModal}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: "18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="record-detail">
                  <span>Member/Item</span>
                  <strong>{selectedItem.item_name || "-"}</strong>
                </div>
                <div className="record-detail">
                  <span>Price</span>
                  <strong>Rs. {selectedItem.price || "-"}</strong>
                </div>
              </div>

              <form className="record-form" onSubmit={handleUpdatePaymentStatus}>
                <label>
                  <span>Payment Status</span>
                  <select
                    value={editPaymentStatus}
                    onChange={(event) => setEditPaymentStatus(event.target.value)}
                    required
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </label>

                {error ? <p className="status-message status-message--error">{error}</p> : null}

                <div className="form-actions">
                  <button type="submit">Update Payment Status</button>
                  <button type="button" className="ghost-button" onClick={closeEditModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  const createTransactionModal = createModalOpen
    ? createPortal(
        <div className="modal-backdrop" role="presentation" onClick={closeCreateModal}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Create auction transaction"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(760px, calc(100vw - 32px))" }}
          >
            <div className="modal-card__header">
              <div>
                <p className="eyebrow">Auction Transaction</p>
                <h3 style={{ marginTop: "8px" }}>{modalTitle}</h3>
              </div>
              <button type="button" className="ghost-button" onClick={closeCreateModal}>
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: "18px" }}>
              <div>
                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ fontWeight: 600 }}>{searchLabel}</span>
                  <input
                    type="text"
                    value={sourceSearchQuery}
                    onChange={(event) => {
                      setSourceSearchQuery(event.target.value);
                      if (!event.target.value.trim()) {
                        setSelectedSource(null);
                      }
                    }}
                    placeholder={searchPlaceholder}
                  />
                </label>
              </div>

              {sourceSearchQuery.trim() ? (
                <div
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "18px",
                    background: "rgba(139, 94, 52, 0.04)",
                    overflow: "hidden",
                  }}
                >
                  {filteredSourceOptions.length ? (
                    filteredSourceOptions.slice(0, 6).map((record, index) => {
                      const isMemberRecord = record.sourceType === SOURCE_MODES.MEMBER;
                      const isActive = isMemberRecord
                        ? String(record.meta?.member_id) === String(selectedSource?.member_id)
                        : String(record.meta?.id) === String(selectedSource?.id);

                      return (
                        <button
                          key={record.value}
                          type="button"
                          onClick={() => handleSourceSelect(record)}
                          style={{
                            width: "100%",
                            padding: "14px 16px",
                            borderRadius: 0,
                            border: "none",
                            borderBottom:
                              index === Math.min(filteredSourceOptions.length, 6) - 1
                                ? "none"
                                : "1px solid var(--line)",
                            background: isActive ? "rgba(139, 94, 52, 0.14)" : "transparent",
                            color: "var(--text)",
                            textAlign: "left",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <strong style={{ marginBottom: 0 }}>{record.meta?.name}</strong>
                          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                            {isMemberRecord
                              ? `${record.meta?.member_id} | ${record.meta?.primary_phone} | ${record.meta?.native_place}`
                              : `${record.meta?.non_member_id} | ${record.meta?.phone_1} | ${record.meta?.type}`}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p style={{ margin: 0, padding: "14px 16px", color: "var(--muted)" }}>
                      No matching member or non-member found.
                    </p>
                  )}
                </div>
              ) : null}

              {selectedSource ? (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <div className="record-detail">
                      <span>Type</span>
                      <strong>{selectedSource.__sourceType}</strong>
                    </div>
                    <div className="record-detail">
                      <span>{selectedSourceIsMember ? "Member ID" : "Non member ID"}</span>
                      <strong>{selectedSourceIsMember ? selectedSource.member_id : selectedSource.non_member_id}</strong>
                    </div>
                    <div className="record-detail">
                      <span>Name</span>
                      <strong>{selectedSource.name}</strong>
                    </div>
                    <div className="record-detail">
                      <span>Primary Phone Number</span>
                      <strong>{selectedSourceIsMember ? selectedSource.primary_phone : selectedSource.phone_1}</strong>
                    </div>
                    <div className="record-detail">
                      <span>{selectedSourceIsMember ? "Native Place" : "Non Member Type"}</span>
                      <strong>{selectedSourceIsMember ? selectedSource.native_place : selectedSource.type}</strong>
                    </div>
                  </div>

                  <form className="record-form" onSubmit={handleSubmitTransaction}>
                    <label>
                      <span>Auction Item Name</span>
                      <select
                        name="auction_item_id"
                        value={itemFormState.auction_item_id}
                        onChange={handleItemFormChange}
                        required
                      >
                        <option value="">Select auction item</option>
                        {availableAuctionItems.map((record) => (
                          <option key={record.value} value={record.value}>
                            {record.meta?.auction_item_name || record.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Token Number</span>
                      <select
                        name="token_number"
                        value={itemFormState.token_number}
                        onChange={handleItemFormChange}
                        required
                        disabled={!selectedAuctionItem}
                      >
                        <option value="">
                          {selectedAuctionItem ? "Select token number" : "Select auction item first"}
                        </option>
                        {(selectedAuctionItem?.availableTokens || []).map((token) => (
                          <option key={token} value={token}>
                            {token}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Price</span>
                      <input
                        type="number"
                        name="price"
                        value={itemFormState.price}
                        onChange={handleItemFormChange}
                        required
                        step="0.01"
                        placeholder="Enter price"
                      />
                    </label>

                    {error ? <p className="status-message status-message--error">{error}</p> : null}

                    <div className="form-actions">
                      <button type="submit">Create Transaction</button>
                      <button type="button" className="ghost-button" onClick={closeCreateModal}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="preview-panel">
                  <h4>Selected Data Details</h4>
                  <p>
                    Search a member or non-member by ID, name, or phone number. The selected details
                    will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  const duplicateTokenPopup = duplicateTokenMessage
    ? createPortal(
        <div className="modal-backdrop popup-backdrop" role="presentation" onClick={closeDuplicateTokenPopup}>
          <div
            className="popup-card"
            role="alertdialog"
            aria-modal="true"
            aria-label="Token already used"
            onClick={(event) => event.stopPropagation()}
          >
            <p>{duplicateTokenMessage}</p>
            <button type="button" onClick={closeDuplicateTokenPopup}>
              OK
            </button>
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
          <div className="auction-transaction-actions">
            <button
              type="button"
              className="create-action-button"
              onClick={openCreateModal}
            >
              <span className="create-action-button__icon">+</span>
              <span>Add Transaction</span>
            </button>
          </div>
        </div>
      </div>

      {feedback ? <p className="status-message status-message--success">{feedback}</p> : null}
      {error && !createModalOpen ? <p className="status-message status-message--error">{error}</p> : null}

      <DataTable
        columns={config.columns}
        rows={items}
        onEdit={handleEdit}
        onDelete={handleDelete}
        rowKey={config.rowKey}
        pagination={pagination}
        onPageChange={(nextOffset) => loadItems(search, nextOffset)}
        extraActions={(row) =>
          row.payment_status === "Unpaid" ? (
            <button type="button" className="danger-button" onClick={() => handleOpenReceiptTransaction(row)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:"5px",verticalAlign:"middle"}}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              Payment
            </button>
          ) : null
        }
      />

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
                <strong>{selectedItem[field.key] || "-"}</strong>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {createTransactionModal}

      {editTransactionModal}

      {duplicateTokenPopup}
    </section>
  );
}
