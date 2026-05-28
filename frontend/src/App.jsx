import { useEffect, useMemo, useState } from "react";

import DashboardCards from "./components/DashboardCards";
import ResourceSection from "./components/ResourceSection";
import AuctionTransactionForm from "./components/AuctionTransactionForm";
import AuctionReports from "./components/AuctionReports";
import AuthPage from "./components/AuthPage";
import ModuleIcon from "./components/ModuleIcon";
import { fetchCollection, fetchCurrentUser, fetchDashboard, logoutUser } from "./services/api";

const money = (value) => `Rs. ${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
const amount = (value) => Math.round(Number(value || 0)).toLocaleString("en-IN");
const LOOKUP_LIMIT = 1000;
const paymentStatusBadge = (status) => (
  <span className={`payment-status payment-status--${String(status || "").toLowerCase()}`}>
    {status || "-"}
  </span>
);

export default function App() {
  const [dashboard, setDashboard] = useState({});
  const [members, setMembers] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [relatives, setRelatives] = useState([]);
  const [auctionItems, setAuctionItems] = useState([]);
  const [activeModule, setActiveModule] = useState("dashboard");
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [pendingAuctionTransaction, setPendingAuctionTransaction] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const isAdmin = Boolean(currentUser?.is_admin);

  const loadLookups = async () => {
    const [memberRows, receiptRows, relativeRows, auctionItemRows, dashboardData] = await Promise.allSettled([
      fetchCollection("members", "", { limit: LOOKUP_LIMIT }),
      fetchCollection("receipts", "", { limit: LOOKUP_LIMIT }),
      fetchCollection("relatives", "", { limit: LOOKUP_LIMIT }),
      fetchCollection("auction-items", "", { limit: LOOKUP_LIMIT }),
      fetchDashboard(),
    ]);
    setMembers(memberRows.status === "fulfilled" ? memberRows.value : []);
    setReceipts(receiptRows.status === "fulfilled" ? receiptRows.value : []);
    setRelatives(relativeRows.status === "fulfilled" ? relativeRows.value : []);
    setAuctionItems(auctionItemRows.status === "fulfilled" ? auctionItemRows.value : []);
    setDashboard(dashboardData.status === "fulfilled" ? dashboardData.value : {});
  };

  useEffect(() => {
    fetchCurrentUser()
      .then((user) => {
        setCurrentUser(user);
        if (user) {
          loadLookups().catch(() => null);
        }
      })
      .catch(() => null)
      .finally(() => setAuthChecked(true));
  }, []);

  const handleAuthenticated = (user) => {
    setCurrentUser(user);
    loadLookups().catch(() => null);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setActiveModule("dashboard");
  };

  useEffect(() => {
    if (authChecked && currentUser && !isAdmin && ["member-data", "auction-items"].includes(activeModule)) {
      setActiveModule("dashboard");
    }
  }, [activeModule, authChecked, currentUser, isAdmin]);

  const lookupData = useMemo(
    () => ({
      members: members.map((member) => ({
        value: member.member_id,
        label: `${member.member_id} - ${member.name}`,
        searchText: [
          member.member_id,
          member.name,
          member.primary_phone,
          member.secondary_phone,
          member.patta_name,
        ]
          .filter(Boolean)
          .join(" "),
        meta: member,
      })),
      receipts: receipts.map((receipt) => ({
        value: receipt.receipt_no,
        label: `${receipt.receipt_no} - ${receipt.source_id || ""} - ${receipt.source_name || ""}`,
        searchText: [
          receipt.receipt_no,
          receipt.source_id,
          receipt.source_name,
          receipt.member_name,
          receipt.relative_name,
          receipt.phone_number,
        ]
          .filter(Boolean)
          .join(" "),
        meta: receipt,
      })),
      relatives: relatives.map((relative) => ({
        value: relative.id,
        label: `${relative.non_member_id} - ${relative.name} - ${relative.phone_1}`,
        searchText: [relative.non_member_id, relative.name, relative.phone_1, relative.phone_2, relative.place, relative.type]
          .filter(Boolean)
          .join(" "),
        meta: relative,
      })),
      donationSources: [
        ...members.map((member) => ({
          value: `member:${member.member_id}`,
          label: `${member.member_id} - ${member.name} - ${member.primary_phone}`,
          searchText: [
            member.member_id,
            member.name,
            member.primary_phone,
            member.secondary_phone,
            member.patta_name,
            "member",
          ]
            .filter(Boolean)
            .join(" "),
          meta: { ...member, sourceType: "Member" },
        })),
        ...relatives.map((relative) => ({
          value: `relative:${relative.id}`,
          label: `${relative.non_member_id} - ${relative.name} - ${relative.phone_1}`,
          searchText: [
            relative.non_member_id,
            relative.name,
            relative.phone_1,
            relative.phone_2,
            relative.place,
            relative.type,
            "non-member",
          ]
            .filter(Boolean)
            .join(" "),
          meta: { ...relative, sourceType: "Non-Member" },
        })),
      ],
      auctionItems: auctionItems.map((auctionItem) => ({
        value: auctionItem.id,
        label: auctionItem.auction_item_name,
        meta: auctionItem,
      })),
    }),
    [auctionItems, members, receipts, relatives],
  );

  const findMeta = (collection, value) => collection.find((item) => String(item.value) === String(value))?.meta;

  const masterDataSection = {
    title: "Add Member",
    endpoint: "members",
    rowKey: "member_id",
    description: "Master source of truth for all member-linked workflows. Search by master ID, name, or primary phone.",
    createButtonLabel: "Add Member",
    useModalForm: true,
    showFullRecordOnSingleResult: true,
    searchPlaceholder: "Search by Master ID, Name, or Primary Phone",
    fields: [
      { name: "member_id", label: "Member ID", required: true },
      { name: "name", label: "Name", required: true },
      { name: "patta_name", label: "Patta Name", required: true },
      { name: "primary_phone", label: "Primary Phone", required: true },
      { name: "secondary_phone", label: "Secondary Phone" },
      { name: "address_line1", label: "Address Line 1", required: true },
      { name: "address_line2", label: "Address Line 2" },
      { name: "address_line3", label: "Address Line 3" },
      { name: "city", label: "City", required: true },
      { name: "pincode", label: "Pincode", required: true },
      {
        name: "native_place",
        label: "Native Place",
        type: "select",
        required: true,
        options: [
          { value: "Nerkuppai", label: "Nerkuppai" },
          { value: "Vendanpatti", label: "Vendanpatti" },
        ],
      },
    ],
    columns: [
      { key: "member_id", label: "Member ID" },
      { key: "name", label: "Name" },
      { key: "primary_phone", label: "Primary Phone" },
      { key: "native_place", label: "Native Place" },
    ],
    detailFields: [
      { key: "member_id", label: "Member ID" },
      { key: "name", label: "Name" },
      { key: "patta_name", label: "Patta Name" },
      { key: "primary_phone", label: "Primary Phone" },
      { key: "secondary_phone", label: "Secondary Phone" },
      { key: "address_line1", label: "Address Line 1" },
      { key: "address_line2", label: "Address Line 2" },
      { key: "address_line3", label: "Address Line 3" },
      { key: "city", label: "City" },
      { key: "pincode", label: "Pincode" },
      { key: "native_place", label: "Native Place" },
    ],
  };

  const nonMasterDataSection = {
    title: "Non Member Data",
    endpoint: "relatives",
    rowKey: "id",
    description: "Non-member relationship register for guests and Penn Vitarr entries. Search by non-member ID, name, or phone number.",
    createButtonLabel: "Add Non Member",
    useModalForm: true,
    showFullRecordOnSingleResult: true,
    searchPlaceholder: "Search by Non Member ID, Name, or Phone Number",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "phone_1", label: "Primary Phone", required: true },
      { name: "phone_2", label: "Secondary Phone" },
      { name: "place", label: "Place" },
      {
        name: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { value: "Guest", label: "Guest" },
          { value: "Penn Vitarr", label: "Penn Vitarr" },
        ],
      },
    ],
    columns: [
      { key: "non_member_id", label: "Non member ID" },
      { key: "name", label: "Name" },
      { key: "phone_1", label: "Primary Phone" },
      { key: "phone_2", label: "Secondary Phone" },
      { key: "place", label: "Place" },
      { key: "type", label: "Type" },
    ],
    detailFields: [
      { key: "non_member_id", label: "Non member ID" },
      { key: "name", label: "Name" },
      { key: "phone_1", label: "Primary Phone" },
      { key: "phone_2", label: "Secondary Phone" },
      { key: "place", label: "Place" },
      { key: "type", label: "Type" },
    ],
  };

  const sections = [
    {
      title: "Member Data",
      endpoint: "member-data",
      adminOnly: true,
      description:
        "Combined workspace for master and non master data with separate tables for each record type.",
      nestedSections: [masterDataSection, nonMasterDataSection],
    },
    {
    title: "Receipts",
    endpoint: "receipts",
    rowKey: "receipt_no",
    description: "Receipt numbers linked to a verified member or non-member and matched phone.",
    searchPlaceholder: "Search by receipt, member ID, non-member ID, name, or phone",
    fields: [
      { name: "receipt_no", label: "Receipt No", required: true },
      {
        name: "source_type",
        label: "Source Type",
        type: "select",
        required: true,
        defaultValue: "Member",
        options: [
          { value: "Member", label: "Member" },
          { value: "Non-Member", label: "Non-Member" },
        ],
      },
      {
        name: "member",
        label: "Member",
        type: "select",
        optionsKey: "members",
        visibleWhen: (formState) => formState.source_type !== "Non-Member",
      },
      {
        name: "relative",
        label: "Non-Member",
        type: "select",
        optionsKey: "relatives",
        visibleWhen: (formState) => formState.source_type === "Non-Member",
      },
      { name: "phone_number", label: "Phone Number", required: true },
      { name: "receipt_date", label: "Receipt Date", type: "date", required: true },
    ],
    renderPreview: (formState, options) => {
        const isNonMember = formState.source_type === "Non-Member";
        const source = isNonMember
          ? findMeta(options.relatives || [], formState.relative)
          : findMeta(options.members || [], formState.member);
        return source ? (
          <>
            <h4>{isNonMember ? "Non Member Lookup" : "Member Lookup"}</h4>
            <p>{source.member_id || source.non_member_id}</p>
            <p>{source.name}</p>
            <p>{source.primary_phone || source.phone_1}</p>
          </>
        ) : (
          <p>Select a member or non-member to verify receipt details.</p>
        );
      },
    columns: [
      { key: "receipt_no", label: "Receipt No" },
      { key: "source_type", label: "Type" },
      { key: "source_id", label: "Member/Non member ID" },
      { key: "source_name", label: "Name" },
      { key: "phone_number", label: "Phone" },
      { key: "receipt_date", label: "Date" },
    ],
    },
    {
      title: "Auction Transaction",
      endpoint: "auction-transactions",
      rowKey: "id",
      description: "Auction transaction register with member and non-member ID autofill, token-based item lookup, payment status, and receipt details.",
      searchPlaceholder: "Search by member ID, non-member ID, name, token, item, receipt, or phone",
      deriveFormState: (formState, options) => {
        const member = findMeta(options.members || [], formState.member);
        return {
          ...formState,
          name: member?.name || "",
          primary_phone_number: member?.primary_phone || "",
          native_place: member?.native_place || "",
        };
      },
      fields: [
        { name: "member", label: "Member", type: "select", optionsKey: "members", required: true },
        { name: "name", label: "Name", readOnly: true },
        { name: "primary_phone_number", label: "Primary Phone Number", readOnly: true },
        { name: "native_place", label: "Native Place", readOnly: true },
        { name: "token_number", label: "Token Number", type: "number", required: true },
        { name: "price", label: "Price", type: "number", required: true, step: "1" },
        {
          name: "payment_status",
          label: "Payment Status",
          type: "select",
          required: true,
          options: [
            { value: "Paid", label: "Paid" },
            { value: "Unpaid", label: "Unpaid" },
          ],
        },
        { name: "receipt", label: "Receipt", type: "select", optionsKey: "receipts" },
      ],
      renderPreview: (formState, options) => {
        const member = findMeta(options.members || [], formState.member);
        return (
          <>
            <h4>Auction Transaction Preview</h4>
            <p>Name: {member?.name || "-"}</p>
            <p>Primary Phone Number: {member?.primary_phone || "-"}</p>
            <p>Native Place: {member?.native_place || "-"}</p>
            <p>Token Number: {formState.token_number || "-"}</p>
            <p>Price: {money(formState.price || 0)}</p>
          </>
        );
      },
      columns: [
        { key: "source_type", label: "Type" },
        { key: "source_id", label: "Member/Non member ID" },
        { key: "member_name", label: "Name" },
        { key: "primary_phone_number", label: "Primary Phone Number" },
        { key: "native_place", label: "Place" },
        { key: "token_number", label: "Token" },
        { key: "item_name", label: "Item" },
        { key: "price", label: "Price (Rs)", render: (row) => amount(row.price) },
        { key: "payment_status", label: "Payment Status", render: (row) => paymentStatusBadge(row.payment_status) },
        { key: "receipt_no", label: "Receipt" },
      ],
      detailFields: [
        { key: "source_type", label: "Type" },
        { key: "source_id", label: "Member/Non member ID" },
        { key: "member_name", label: "Name" },
        { key: "primary_phone_number", label: "Primary Phone Number" },
        { key: "native_place", label: "Place" },
        { key: "token_number", label: "Token" },
        { key: "item_name", label: "Item" },
        { key: "price", label: "Price (Rs)", render: (row) => amount(row.price) },
        { key: "payment_status", label: "Payment Status", render: (row) => paymentStatusBadge(row.payment_status) },
        { key: "receipt_no", label: "Receipt" },
      ],
    },
    {
      title: "Reports",
      endpoint: "auction-reports",
      description: "Separate reporting workspace for paid and unpaid auction transactions.",
    },
    {
      title: "Deposits",
      endpoint: "deposits",
      rowKey: "id",
      description: "Receipt-wise deposit tracking and posting history.",
      searchPlaceholder: "Search by receipt number",
      fields: [
        { name: "receipt", label: "Receipt", type: "select", optionsKey: "receipts", required: true },
        { name: "amount", label: "Amount", type: "number", required: true, step: "1" },
        { name: "date", label: "Date", type: "date", required: true },
      ],
      columns: [
        { key: "receipt_no", label: "Receipt No" },
        { key: "amount", label: "Amount", render: (row) => money(row.amount) },
        { key: "date", label: "Date" },
      ],
    },
    {
      title: "Auction Item",
      endpoint: "auction-items",
      adminOnly: true,
      rowKey: "id",
      description: "Manage Auction item records with English and Tamil item names, quantity-based token generation, and used token tracking.",
      searchPlaceholder: "Search by Auction Item Name (English/Tamil)",
      createButtonLabel: "Create Auction Item",
      useModalForm: true,
      fields: [
        { name: "auction_item_name", label: "Auction Item Name", required: true },
        { name: "quantity", label: "Quantity", type: "number", required: true },
      ],
      columns: [
        { key: "auction_item_name", label: "Auction Item Name" },
        { key: "auction_item_name_tamil", label: "Auction Item Name (Tamil)" },
        { key: "quantity", label: "Quantity" },
        { key: "tokens", label: "Tokens" },
        { key: "used_tokens", label: "Used Tokens" },
      ],
      detailFields: [
        { key: "auction_item_name", label: "Auction Item Name" },
        { key: "auction_item_name_tamil", label: "Auction Item Name (Tamil)" },
        { key: "quantity", label: "Quantity" },
        { key: "tokens", label: "Tokens" },
        { key: "used_tokens", label: "Used Tokens" },
      ],
    },
    {
      title: "Auction",
      endpoint: "eelam",
      rowKey: "id",
      description: "Combined member and non-member contribution records.",
      searchPlaceholder: "Search by member ID, non-member ID, name, or phone",
      fields: [
        {
          name: "type",
          label: "Type",
          type: "select",
          required: true,
          options: [
            { value: "Member", label: "Member" },
            { value: "Non-Member", label: "Non-Member" },
          ],
        },
        { name: "member", label: "Member", type: "select", optionsKey: "members" },
        { name: "relative", label: "Relative", type: "select", optionsKey: "relatives" },
        { name: "amount", label: "Amount", type: "number", required: true, step: "1" },
      ],
      renderPreview: (formState, options) => {
        const member = findMeta(options.members || [], formState.member);
        const relative = findMeta(options.relatives || [], formState.relative);
        const source = formState.type === "Member" ? member : relative;
        return (
          <>
            <h4>Source Preview</h4>
            <p>ID: {source?.member_id || source?.non_member_id || "-"}</p>
            <p>Name: {source?.name || "-"}</p>
            <p>Phone: {source?.primary_phone || source?.phone_1 || "-"}</p>
          </>
        );
      },
      columns: [
        { key: "type", label: "Type" },
        { key: "source_id", label: "Member/Non member ID" },
        { key: "source_name", label: "Source" },
        { key: "phone", label: "Phone" },
        { key: "amount", label: "Amount", render: (row) => money(row.amount) },
      ],
    },
    {
      title: "Donations",
      endpoint: "donations",
      rowKey: "id",
      description: "Track donations separately for members and non-members with validated donor selection.",
      searchPlaceholder: "Search by donor type, member ID, non-member ID, name, or phone",
      createButtonLabel: "Donation",
      useModalForm: true,
      preparePayload: (formState) => {
        const [sourceKind, sourceId] = String(formState.donation_source || "").split(":");
        return {
          donor_type: sourceKind === "relative" ? "Non-Member" : "Member",
          member: sourceKind === "member" ? sourceId : null,
          relative: sourceKind === "relative" ? sourceId : null,
          amount: formState.amount,
        };
      },
      fields: [
        {
          name: "donation_source",
          label: "Donor",
          type: "select",
          optionsKey: "donationSources",
          required: true,
          valueFromItem: (item) => (item.member ? `member:${item.member}` : item.relative ? `relative:${item.relative}` : ""),
        },
        { name: "amount", label: "Amount", type: "number", required: true, step: "1" },
      ],
      renderPreview: (formState, options) => {
        const source = findMeta(options.donationSources || [], formState.donation_source);
        return (
          <>
            <h4>Donation Preview</h4>
            <p>Donor Type: {source?.sourceType || "-"}</p>
            <p>ID: {source?.member_id || source?.non_member_id || "-"}</p>
            <p>Name: {source?.name || "-"}</p>
            <p>Phone: {source?.primary_phone || source?.phone_1 || "-"}</p>
          </>
        );
      },
      columns: [
        { key: "donor_type", label: "Donor Type" },
        { key: "source_id", label: "Member/Non member ID" },
        { key: "donor_name", label: "Donor Name" },
        { key: "phone", label: "Phone" },
        { key: "amount", label: "Amount", render: (row) => money(row.amount) },
      ],
      detailFields: [
        { key: "donor_type", label: "Donor Type" },
        { key: "source_id", label: "Member/Non member ID" },
        { key: "source_name", label: "Source" },
        { key: "donor_name", label: "Donor Name" },
        { key: "phone", label: "Phone" },
        { key: "amount", label: "Amount", render: (row) => money(row.amount) },
      ],
    },
  ];

  const dashboardSection = {
    title: "Dashboard",
    endpoint: "dashboard",
    description: "View the current auction, donation, member, and receipt summary before opening modules.",
  };

  const visibleSections = sections.filter((section) => !section.adminOnly || isAdmin);
  const navigationSections = [dashboardSection, ...visibleSections];
  const activeSection = navigationSections.find((section) => section.endpoint === activeModule) || dashboardSection;
  const isDashboardView = activeModule === "dashboard";

  if (!authChecked) {
    return (
      <main className="auth-shell">
        <section className="auth-panel auth-panel--loading">
          <p className="eyebrow">Loading</p>
          <h1>Checking login session...</h1>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className={`app-shell ${isSidebarHidden ? "app-shell--menu-hidden" : ""}`}>
      {isSidebarHidden ? (
        <button
          type="button"
          className="menu-toggle menu-toggle--floating"
          onClick={() => setIsSidebarHidden(false)}
        >
          Show Menu
        </button>
      ) : null}

      <aside className="sidebar" aria-hidden={isSidebarHidden}>
        <button type="button" className="menu-toggle" onClick={() => setIsSidebarHidden(true)}>
          Hide Menu
        </button>
        <p className="eyebrow">Production Console</p>
        <h1>Shri Udayammai Paati Padaippu Veedu</h1>
        <p className="sidebar-copy">
          Structured replacement for the Excel workflow with validation-first forms, searchable tables, and linked records.
        </p>
        <p className="sidebar-section-label">Modules</p>
        <nav>
          {navigationSections.map((section) => (
            <button
              key={section.endpoint}
              type="button"
              className={`sidebar-link ${activeModule === section.endpoint ? "sidebar-link--active" : ""}`}
              onClick={() => setActiveModule(section.endpoint)}
            >
              <ModuleIcon endpoint={section.endpoint} />
              <span>{section.title}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span>Signed in as</span>
          <strong>{currentUser.username}</strong>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="content">
        {isDashboardView ? (
          <>
            <section className="hero">
              <div>
                <p className="eyebrow">Dashboard</p>
                <h2>Totals overview</h2>
                <p>Track auction, donation, member, and receipt totals before opening a working module.</p>
              </div>
            </section>

            <section className="dashboard-stage">
              <DashboardCards dashboard={dashboard} />
              <div className="dashboard-stage__actions">
                <button type="button" onClick={() => setActiveModule("member-data")}>
                  Open Members Data
                </button>
              </div>
            </section>
          </>
        ) : (
          <section className="module-stage" aria-label={activeSection.title}>
            {activeSection.nestedSections ? (
              <div className="module-stack">
                {activeSection.nestedSections.map((section) => (
                  <ResourceSection
                    key={section.endpoint}
                    config={section}
                    lookupData={lookupData}
                    onDataChange={loadLookups}
                  />
                ))}
              </div>
            ) : activeSection.endpoint === "auction-transactions" ? (
              <AuctionTransactionForm
                config={activeSection}
                lookupData={lookupData}
                onDataChange={loadLookups}
                onOpenReceiptTransaction={(transaction) => {
                  setPendingAuctionTransaction(transaction);
                  setActiveModule("receipts");
                }}
              />
            ) : activeSection.endpoint === "auction-reports" ? (
              <AuctionReports />
            ) : (
              <ResourceSection
                config={activeSection}
                lookupData={lookupData}
                onDataChange={loadLookups}
                pendingAuctionTransaction={activeSection.endpoint === "receipts" ? pendingAuctionTransaction : null}
                onReceiptTransactionDone={() => {
                  setPendingAuctionTransaction(null);
                  loadLookups().catch(() => null);
                }}
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
}
