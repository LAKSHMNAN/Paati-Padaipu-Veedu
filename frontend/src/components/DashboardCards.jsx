const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function DashboardCards({ dashboard }) {
  const cards = [
    { label: "Total Auction Value", value: formatCurrency(dashboard.total_auction_value), tone: "gold" },
    { label: "Paid Auction Value", value: formatCurrency(dashboard.total_paid_auction_value), tone: "green" },
    { label: "Unpaid Auction Value", value: formatCurrency(dashboard.total_unpaid_auction_value), tone: "red" },
    { label: "Member Donations", value: formatCurrency(dashboard.total_member_donations), tone: "blue" },
    { label: "Non-Member Donations", value: formatCurrency(dashboard.total_non_member_donations), tone: "slate" },
    { label: "Total Donations", value: formatCurrency(dashboard.total_donations), tone: "gold" },
    { label: "Registered Members", value: dashboard.total_members || 0, tone: "blue" },
    { label: "Registered Non Members", value: dashboard.total_non_members || 0, tone: "green" },
    { label: "Receipts Issued", value: dashboard.total_receipts || 0, tone: "slate" },
  ];

  return (
    <section className="dashboard-grid">
      {cards.map((card) => (
        <article className={`metric-card metric-card--${card.tone}`} key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}
