import { useEffect, useMemo, useState } from "react";

import {
  fetchAuctionTransactionReport,
  getAuctionTransactionReportUrl,
  fetchAuctionTransactionByItemReport,
  getAuctionTransactionByItemReportUrl,
  fetchAuctionTransactionsByItem,
} from "../services/api";
import { fetchCollection } from "../services/api";

const PAGE_SIZE = 10;
const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const amount = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const formatReceiptDate = (value) => {
  if (!value) return "-";
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};
const paymentStatusBadge = (status) => (
  <span className={`payment-status payment-status--${String(status || "").toLowerCase()}`}>
    {status || "-"}
  </span>
);

const statusOptions = [
  { key: "paid", label: "Paid" },
  { key: "unpaid", label: "Unpaid" },
];

const REPORT_MODE_STATUS = "status";
const REPORT_MODE_BY_ITEM = "by-item";

export default function AuctionReports() {
  const [reportMode, setReportMode] = useState(REPORT_MODE_STATUS);
  const [activeStatus, setActiveStatus] = useState("paid");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ count: 0, limit: PAGE_SIZE, offset: 0 });

  // By-item summary report state
  const [byItemReport, setByItemReport] = useState(null);
  const [byItemLoading, setByItemLoading] = useState(false);
  const [byItemError, setByItemError] = useState("");

  // Auction item list for dropdown
  const [auctionItems, setAuctionItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");

  // Item detail (transactions for selected item)
  const [itemDetail, setItemDetail] = useState(null);
  const [itemDetailLoading, setItemDetailLoading] = useState(false);
  const [itemDetailError, setItemDetailError] = useState("");
  const [itemDetailPagination, setItemDetailPagination] = useState({ count: 0, limit: PAGE_SIZE, offset: 0 });

  const summary = report?.summary || {};
  const transactions = report?.transactions || [];
  const isSearchReport = Boolean(appliedSearch);
  const showReceiptColumn = activeStatus === "paid" || isSearchReport;
  const reportColumnCount = showReceiptColumn ? 9 : 8;

  const activeLabel = useMemo(
    () => statusOptions.find((option) => option.key === activeStatus)?.label || "Paid",
    [activeStatus],
  );

  const countCardLabel = isSearchReport ? "Total Count" : `${activeLabel} Count`;
  const amountCardLabel = isSearchReport ? "Total Amount" : `${activeLabel} Amount`;
  const statusCount = isSearchReport ? summary.total_transactions : summary.status_count;
  const statusAmount = isSearchReport ? summary.total_amount : summary.status_amount;
  const totalCardLabel = isSearchReport ? "Paid Amount" : "Total Transactions";
  const totalCardValue = isSearchReport ? money(summary.total_paid_amount) : summary.total_transactions ?? 0;
  const otherLabel = isSearchReport ? "Unpaid" : summary.other_label || "Other";
  const otherAmount = isSearchReport ? summary.total_unpaid_amount : summary.other_amount;
  const firstRecord = pagination.count === 0 ? 0 : pagination.offset + 1;
  const lastRecord = Math.min(pagination.offset + transactions.length, pagination.count);
  const canGoPrevious = pagination.offset > 0;
  const canGoNext = pagination.offset + pagination.limit < pagination.count;

  const loadReport = async (nextSearch = appliedSearch, nextOffset = pagination.offset) => {
    setIsLoading(true);
    setError("");
    try {
      const reportStatus = nextSearch ? "" : activeStatus;
      const data = await fetchAuctionTransactionReport(reportStatus, nextSearch, {
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setReport(data);
      setPagination(data.pagination || { count: data.transactions?.length || 0, limit: PAGE_SIZE, offset: nextOffset });
    } catch (loadError) {
      setError(loadError.response?.data?.detail || "Unable to load auction report.");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadByItemReport = async () => {
    setByItemLoading(true);
    setByItemError("");
    try {
      const data = await fetchAuctionTransactionByItemReport();
      setByItemReport(data);
    } catch (err) {
      setByItemError(err.response?.data?.detail || "Unable to load by-item report.");
      setByItemReport(null);
    } finally {
      setByItemLoading(false);
    }
  };

  const loadAuctionItems = async () => {
    try {
      const items = await fetchCollection("auction-items");
      setAuctionItems(Array.isArray(items) ? items : []);
    } catch {
      setAuctionItems([]);
    }
  };

  const loadItemDetail = async (itemId, offset = 0) => {
    if (!itemId) return;
    setItemDetailLoading(true);
    setItemDetailError("");
    try {
      const data = await fetchAuctionTransactionsByItem(itemId, { limit: PAGE_SIZE, offset });
      setItemDetail(data);
      setItemDetailPagination(data.pagination || { count: 0, limit: PAGE_SIZE, offset });
    } catch (err) {
      setItemDetailError(err.response?.data?.detail || "Unable to load transactions.");
      setItemDetail(null);
    } finally {
      setItemDetailLoading(false);
    }
  };

  const handleItemSelect = (event) => {
    const id = event.target.value;
    setSelectedItemId(id);
    setItemDetail(null);
    setItemDetailPagination({ count: 0, limit: PAGE_SIZE, offset: 0 });
    if (id) loadItemDetail(id, 0);
  };

  useEffect(() => {
    if (reportMode === REPORT_MODE_STATUS) {
      loadReport(appliedSearch, 0);
    } else {
      loadAuctionItems();
    }
  }, [activeStatus, reportMode]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const nextSearch = search.trim();
    setAppliedSearch(nextSearch);
    await loadReport(nextSearch, 0);
  };

  const clearSearch = async () => {
    setSearch("");
    setAppliedSearch("");
    await loadReport("", 0);
  };

  const openExport = (format) => {
    const reportStatus = appliedSearch ? "" : activeStatus;
    window.open(getAuctionTransactionReportUrl(reportStatus, format, appliedSearch), "_blank", "noopener,noreferrer");
  };

  const openByItemExport = (format) => {
    window.open(getAuctionTransactionByItemReportUrl(format), "_blank", "noopener,noreferrer");
  };

  const byItemSummary = byItemReport?.summary || {};
  const byItemRows = byItemReport?.items || [];

  const itemDetailSummary = itemDetail?.summary || {};
  const itemDetailTransactions = itemDetail?.transactions || [];
  const itemDetailCount = itemDetailPagination.count;
  const itemDetailFirst = itemDetailCount === 0 ? 0 : itemDetailPagination.offset + 1;
  const itemDetailLast = Math.min(itemDetailPagination.offset + itemDetailTransactions.length, itemDetailCount);
  const itemDetailCanPrev = itemDetailPagination.offset > 0;
  const itemDetailCanNext = itemDetailPagination.offset + itemDetailPagination.limit < itemDetailCount;

  return (
    <section className="resource-card report-module">
      <div className="resource-header">
        <div>
          <h2>Auction Transaction Reports</h2>
          <p>Fetch paid and unpaid auction transactions with totals, member details, token numbers, and export files.</p>
        </div>
        <div className="report-actions">
          {reportMode === REPORT_MODE_STATUS ? (
            <>
              <button type="button" className="ghost-button" onClick={() => loadReport()} disabled={isLoading}>
                Refresh
              </button>
              <button type="button" onClick={() => openExport("excel")}>
                Excel
              </button>
              <button type="button" onClick={() => openExport("pdf")}>
                PDF
              </button>
            </>
          ) : (
            <>
              <button type="button" className="ghost-button" onClick={() => selectedItemId ? loadItemDetail(selectedItemId, 0) : loadAuctionItems()} disabled={byItemLoading || itemDetailLoading}>
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      <div className="segmented-control" aria-label="Report type">
        <button
          type="button"
          className={reportMode === REPORT_MODE_STATUS ? "segmented-control__button--active" : ""}
          onClick={() => setReportMode(REPORT_MODE_STATUS)}
        >
          By Status
        </button>
        <button
          type="button"
          className={reportMode === REPORT_MODE_BY_ITEM ? "segmented-control__button--active" : ""}
          onClick={() => setReportMode(REPORT_MODE_BY_ITEM)}
        >
          By Auction Item
        </button>
      </div>

      {reportMode === REPORT_MODE_STATUS ? (
        <>
          <div className="segmented-control" aria-label="Report status">
            {statusOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={activeStatus === option.key ? "segmented-control__button--active" : ""}
                onClick={() => setActiveStatus(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <form className="report-search-form" onSubmit={handleSearch}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search report by member ID, non-member ID, name, or phone"
            />
            <button type="submit" disabled={isLoading}>
              Generate Report
            </button>
            {appliedSearch ? (
              <button type="button" className="ghost-button" onClick={clearSearch} disabled={isLoading}>
                Clear
              </button>
            ) : null}
          </form>

          {error ? <p className="status-message status-message--error">{error}</p> : null}

          <div className="dashboard-grid report-summary-grid">
            <article className="metric-card metric-card--green">
              <span>{countCardLabel}</span>
              <strong>{statusCount ?? 0}</strong>
            </article>
            <article className="metric-card metric-card--gold">
              <span>{amountCardLabel}</span>
              <strong>{money(statusAmount)}</strong>
            </article>
            <article className="metric-card metric-card--blue">
              <span>{totalCardLabel}</span>
              <strong>{totalCardValue}</strong>
            </article>
            <article className="metric-card metric-card--red">
              <span>{otherLabel} Amount</span>
              <strong>{money(otherAmount)}</strong>
            </article>
          </div>

          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Token</th>
                  <th>Price (Rs.)</th>
                  <th>Status</th>
                  {showReceiptColumn ? <th>Receipt</th> : null}
                  <th>Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={reportColumnCount} className="empty-state">
                      Loading report...
                    </td>
                  </tr>
                ) : transactions.length ? (
                  transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{transaction.source_id || transaction.non_member_id || "-"}</td>
                      <td>{transaction.member_name || transaction.relative_name || "-"}</td>
                      <td>{transaction.source_type}</td>
                      <td>{transaction.item_name}</td>
                      <td>{transaction.token_number}</td>
                      <td>{amount(transaction.price)}</td>
                      <td>{paymentStatusBadge(transaction.payment_status)}</td>
                      {showReceiptColumn ? <td>{transaction.receipt_no || "-"}</td> : null}
                      <td>{formatReceiptDate(transaction.receipt_date)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={reportColumnCount} className="empty-state">
                      No {isSearchReport ? "searched" : activeLabel.toLowerCase()} auction transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="pagination-bar">
              <span>
                Showing {firstRecord}-{lastRecord} of {pagination.count}
              </span>
              <div className="pagination-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => loadReport(appliedSearch, Math.max(pagination.offset - pagination.limit, 0))}
                  disabled={isLoading || !canGoPrevious}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => loadReport(appliedSearch, pagination.offset + pagination.limit)}
                  disabled={isLoading || !canGoNext}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {byItemError ? <p className="status-message status-message--error">{byItemError}</p> : null}

          <div className="report-search-form">
            <select
              value={selectedItemId}
              onChange={handleItemSelect}
              style={{ width: "320px", flexShrink: 0, padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: "0.875rem" }}
            >
              <option value="">— Select an Auction Item —</option>
              {auctionItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.auction_item_name}
                  {item.auction_item_name_tamil ? ` (${item.auction_item_name_tamil})` : ""}
                </option>
              ))}
            </select>
            {selectedItemId ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => loadItemDetail(selectedItemId, 0)}
                disabled={itemDetailLoading}
              >
                Refresh
              </button>
            ) : null}
          </div>

          {itemDetailError ? <p className="status-message status-message--error">{itemDetailError}</p> : null}

          {itemDetail ? (
            <>
              <div className="dashboard-grid report-summary-grid">
                <article className="metric-card metric-card--blue">
                  <span>Total Tokens</span>
                  <strong>{itemDetailSummary.total_count ?? 0}</strong>
                </article>
                <article className="metric-card metric-card--green">
                  <span>Paid</span>
                  <strong>{itemDetailSummary.paid_count ?? 0}</strong>
                </article>
                <article className="metric-card metric-card--gold">
                  <span>Paid Amount</span>
                  <strong>{money(itemDetailSummary.paid_amount)}</strong>
                </article>
                <article className="metric-card metric-card--red">
                  <span>Unpaid Amount</span>
                  <strong>{money(itemDetailSummary.unpaid_amount)}</strong>
                </article>
              </div>

              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Token</th>
                      <th style={{ textAlign: "right" }}>Price (Rs.)</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                      <th>Receipt</th>
                      <th>Payment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemDetailLoading ? (
                      <tr>
                        <td colSpan={8} className="empty-state">Loading...</td>
                      </tr>
                    ) : itemDetailTransactions.length ? (
                      itemDetailTransactions.map((txn) => (
                        <tr key={txn.id}>
                          <td>{txn.source_id || txn.non_member_id || "-"}</td>
                          <td>{txn.member_name || txn.relative_name || "-"}</td>
                          <td>{txn.source_type}</td>
                          <td>{txn.token_number}</td>
                          <td style={{ textAlign: "right" }}>{amount(txn.price)}</td>
                          <td style={{ textAlign: "center" }}>{paymentStatusBadge(txn.payment_status)}</td>
                          <td>{txn.receipt_no || "-"}</td>
                          <td>{formatReceiptDate(txn.receipt_date)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="empty-state">No transactions found for this item.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="pagination-bar">
                  <span>
                    Showing {itemDetailFirst}-{itemDetailLast} of {itemDetailCount}
                  </span>
                  <div className="pagination-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => loadItemDetail(selectedItemId, Math.max(itemDetailPagination.offset - PAGE_SIZE, 0))}
                      disabled={itemDetailLoading || !itemDetailCanPrev}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => loadItemDetail(selectedItemId, itemDetailPagination.offset + PAGE_SIZE)}
                      disabled={itemDetailLoading || !itemDetailCanNext}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : !selectedItemId ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "32px 0" }}>
              Select an auction item above to view its transactions.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
