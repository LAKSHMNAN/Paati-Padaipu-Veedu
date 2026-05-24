import { useEffect, useMemo, useState } from "react";

import { fetchAuctionTransactionReport, getAuctionTransactionReportUrl } from "../services/api";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const paymentStatusBadge = (status) => (
  <span className={`payment-status payment-status--${String(status || "").toLowerCase()}`}>
    {status || "-"}
  </span>
);

const statusOptions = [
  { key: "paid", label: "Paid" },
  { key: "unpaid", label: "Unpaid" },
];

export default function AuctionReports() {
  const [activeStatus, setActiveStatus] = useState("paid");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const summary = report?.summary || {};
  const transactions = report?.transactions || [];
  const isSearchReport = Boolean(appliedSearch);
  const showReceiptColumn = activeStatus === "paid" || isSearchReport;
  const reportColumnCount = showReceiptColumn ? 10 : 9;

  const activeLabel = useMemo(
    () => statusOptions.find((option) => option.key === activeStatus)?.label || "Paid",
    [activeStatus],
  );

  const reportLabel = isSearchReport ? "Matching" : activeLabel;
  const statusCount = isSearchReport ? summary.total_transactions : summary.status_count;
  const statusAmount = isSearchReport ? summary.total_amount : summary.status_amount;
  const totalCardLabel = isSearchReport ? "Paid Amount" : "Total Transactions";
  const totalCardValue = isSearchReport ? money(summary.total_paid_amount) : summary.total_transactions ?? 0;
  const otherLabel = isSearchReport ? "Unpaid" : summary.other_label || "Other";
  const otherAmount = isSearchReport ? summary.total_unpaid_amount : summary.other_amount;

  const loadReport = async (nextSearch = appliedSearch) => {
    setIsLoading(true);
    setError("");
    try {
      const reportStatus = nextSearch ? "" : activeStatus;
      const data = await fetchAuctionTransactionReport(reportStatus, nextSearch);
      setReport(data);
    } catch (loadError) {
      setError(loadError.response?.data?.detail || "Unable to load auction report.");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeStatus]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const nextSearch = search.trim();
    setAppliedSearch(nextSearch);
    await loadReport(nextSearch);
  };

  const clearSearch = async () => {
    setSearch("");
    setAppliedSearch("");
    await loadReport("");
  };

  const openExport = (format) => {
    const reportStatus = appliedSearch ? "" : activeStatus;
    window.open(getAuctionTransactionReportUrl(reportStatus, format, appliedSearch), "_blank", "noopener,noreferrer");
  };

  return (
    <section className="resource-card report-module">
      <div className="resource-header">
        <div>
          <h2>Auction Transaction Reports</h2>
          <p>Fetch paid and unpaid auction transactions with totals, member details, token numbers, and export files.</p>
        </div>
        <div className="report-actions">
          <button type="button" className="ghost-button" onClick={() => loadReport()} disabled={isLoading}>
            Refresh
          </button>
          <button type="button" onClick={() => openExport("excel")}>
            Excel
          </button>
          <button type="button" onClick={() => openExport("pdf")}>
            PDF
          </button>
        </div>
      </div>

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
          <span>{reportLabel} Count</span>
          <strong>{statusCount ?? 0}</strong>
        </article>
        <article className="metric-card metric-card--gold">
          <span>{reportLabel} Amount</span>
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
              <th>ID</th>
              <th>Member/Non member ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Item</th>
              <th>Token</th>
              <th>Price</th>
              <th>Status</th>
              {showReceiptColumn ? <th>Receipt</th> : null}
              <th>Date</th>
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
                  <td>{transaction.id}</td>
                  <td>{transaction.source_id || transaction.non_member_id || "-"}</td>
                  <td>{transaction.member_name || transaction.relative_name || "-"}</td>
                  <td>{transaction.source_type}</td>
                  <td>{transaction.item_name}</td>
                  <td>{transaction.token_number}</td>
                  <td>{money(transaction.price)}</td>
                  <td>{paymentStatusBadge(transaction.payment_status)}</td>
                  {showReceiptColumn ? <td>{transaction.receipt_no || "-"}</td> : null}
                  <td>{transaction.created_at ? new Date(transaction.created_at).toLocaleString("en-IN") : "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={reportColumnCount} className="empty-state">
                  No {reportLabel.toLowerCase()} auction transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
