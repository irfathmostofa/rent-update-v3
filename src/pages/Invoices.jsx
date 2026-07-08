import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  User,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  Building2,
} from "lucide-react";

export default function Invoices() {
  const { user, isSuperAdmin } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generatingId, setGeneratingId] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");

  async function loadInvoices() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          rentals(
            id,
            tenant_id,
            monthly_rent,
            start_date,
            end_date,
            status_id,
            tenants(
              id,
              full_name,
              phone_number,
              email
            ),
            properties(
              id,
              name,
              address,
              city,
              property_type_id
            ),
            cottage_rooms(
              id,
              room_number,
              seat_capacity,
              seat_cost
            )
          ),
          payments(
            id,
            amount_paid,
            paid_at,
            payment_method,
            note
          )
        `,
        )
        .order("due_date", { ascending: true });

      if (error) throw error;
      setInvoices(data ?? []);
      setFilteredInvoices(data ?? []);
    } catch (error) {
      console.error("Error loading invoices:", error);
      setError("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...invoices];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.rentals?.tenants?.full_name?.toLowerCase().includes(term) ||
          inv.rentals?.tenants?.phone_number?.includes(term) ||
          inv.rentals?.properties?.name?.toLowerCase().includes(term),
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      if (filterStatus === "paid") {
        filtered = filtered.filter((inv) => inv.is_paid);
      } else if (filterStatus === "unpaid") {
        filtered = filtered.filter((inv) => !inv.is_paid);
      } else if (filterStatus === "overdue") {
        filtered = filtered.filter(
          (inv) => !inv.is_paid && new Date(inv.due_date) < new Date(),
        );
      } else if (filterStatus === "upcoming") {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        filtered = filtered.filter(
          (inv) =>
            !inv.is_paid &&
            new Date(inv.due_date) >= new Date() &&
            new Date(inv.due_date) <= nextWeek,
        );
      }
    }

    // Period filter
    if (filterPeriod !== "all") {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      if (filterPeriod === "current_month") {
        filtered = filtered.filter((inv) => {
          const dueDate = new Date(inv.due_date);
          return (
            dueDate.getMonth() === currentMonth &&
            dueDate.getFullYear() === currentYear
          );
        });
      } else if (filterPeriod === "last_month") {
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        filtered = filtered.filter((inv) => {
          const dueDate = new Date(inv.due_date);
          return (
            dueDate.getMonth() === lastMonth.getMonth() &&
            dueDate.getFullYear() === lastMonth.getFullYear()
          );
        });
      } else if (filterPeriod === "next_month") {
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        filtered = filtered.filter((inv) => {
          const dueDate = new Date(inv.due_date);
          return (
            dueDate.getMonth() === nextMonth.getMonth() &&
            dueDate.getFullYear() === nextMonth.getFullYear()
          );
        });
      }
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchTerm, filterStatus, filterPeriod]);

  function totalPaid(invoice) {
    return (invoice.payments ?? []).reduce(
      (sum, p) => sum + Number(p.amount_paid),
      0,
    );
  }

  function getStatusInfo(invoice) {
    if (invoice.is_paid) {
      return {
        label: "Paid",
        color: "#22c55e",
        bg: "#dcfce7",
        icon: CheckCircle,
      };
    }
    if (new Date(invoice.due_date) < new Date()) {
      return {
        label: "Overdue",
        color: "#dc2626",
        bg: "#fee2e2",
        icon: AlertCircle,
      };
    }
    const daysUntilDue = Math.ceil(
      (new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntilDue <= 3) {
      return {
        label: "Due Soon",
        color: "#f59e0b",
        bg: "#fef3c7",
        icon: Clock,
      };
    }
    return { label: "Pending", color: "#6b7280", bg: "#f3f4f6", icon: XCircle };
  }

  // Check if next invoice already exists for this rental
  async function checkNextInvoiceExists(invoice) {
    try {
      const prevStart = new Date(invoice.period_start);
      const nextStart = new Date(prevStart);
      nextStart.setDate(prevStart.getDate() + 30);
      const nextStartStr = nextStart.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("invoices")
        .select("id")
        .eq("rental_id", invoice.rental_id)
        .eq("period_start", nextStartStr)
        .maybeSingle();

      if (error) throw error;
      return !!data; // Returns true if next invoice exists
    } catch (error) {
      console.error("Error checking next invoice:", error);
      return true; // Assume exists to prevent duplicate generation
    }
  }

  async function recordPayment(invoice) {
    setError("");
    setSuccess("");

    if (!payAmount || parseFloat(payAmount) <= 0) {
      setError("Please enter a valid payment amount");
      return;
    }

    try {
      const { error } = await supabase.from("payments").insert({
        invoice_id: invoice.id,
        amount_paid: payAmount,
        payment_method: payMethod,
        note: `Payment for invoice ${invoice.id.slice(0, 8)}`,
      });

      if (error) throw error;

      const newTotal = totalPaid(invoice) + Number(payAmount);
      if (newTotal >= Number(invoice.amount_due)) {
        await supabase
          .from("invoices")
          .update({ is_paid: true })
          .eq("id", invoice.id);
        setSuccess("Invoice fully paid!");
      } else {
        setSuccess(
          `Payment recorded. Remaining: ৳${(Number(invoice.amount_due) - newTotal).toLocaleString()}`,
        );
      }

      setPayingId(null);
      setPayAmount("");
      await loadInvoices();
    } catch (error) {
      setError(error.message);
    }
  }

  async function generateNextInvoice(invoice) {
    setError("");
    setSuccess("");
    setGeneratingId(invoice.id);

    try {
      // Check if next invoice already exists
      const nextExists = await checkNextInvoiceExists(invoice);
      if (nextExists) {
        setError("Next month's invoice already exists for this rental");
        setGeneratingId(null);
        return;
      }

      const prevStart = new Date(invoice.period_start);
      const nextStart = new Date(prevStart);
      nextStart.setDate(prevStart.getDate() + 30);
      const nextEnd = new Date(nextStart);
      nextEnd.setDate(nextStart.getDate() + 29);
      const nextDue = new Date(nextStart);
      nextDue.setDate(nextStart.getDate() + 30);

      const { error } = await supabase.from("invoices").insert({
        rental_id: invoice.rental_id,
        period_start: nextStart.toISOString().slice(0, 10),
        period_end: nextEnd.toISOString().slice(0, 10),
        due_date: nextDue.toISOString().slice(0, 10),
        amount_due: invoice.amount_due,
      });

      if (error) throw error;
      setSuccess("Next month's invoice generated successfully!");
      await loadInvoices();
    } catch (error) {
      setError(error.message);
    } finally {
      setGeneratingId(null);
    }
  }

  async function deleteInvoice(invoiceId) {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;
      setSuccess("Invoice deleted successfully");
      await loadInvoices();
    } catch (error) {
      setError(error.message);
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterPeriod("all");
  }

  function toggleExpand(invoiceId) {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  }

  function getPaymentMethodIcon(method) {
    const icons = {
      cash: "💵",
      bkash: "📱",
      nagad: "📱",
      bank: "🏦",
    };
    return icons[method] || "💳";
  }

  // Check if a rental has a next invoice already
  function hasNextInvoice(invoice) {
    const prevStart = new Date(invoice.period_start);
    const nextStart = new Date(prevStart);
    nextStart.setDate(prevStart.getDate() + 30);
    const nextStartStr = nextStart.toISOString().slice(0, 10);

    return invoices.some(
      (inv) =>
        inv.rental_id === invoice.rental_id &&
        inv.period_start === nextStartStr,
    );
  }

  // Get the latest invoice for a rental to check if we should show the button
  function getLatestInvoiceForRental(rentalId) {
    const rentalInvoices = invoices.filter((inv) => inv.rental_id === rentalId);
    return rentalInvoices.length > 0
      ? rentalInvoices.reduce((latest, current) =>
          new Date(current.period_start) > new Date(latest.period_start)
            ? current
            : latest,
        )
      : null;
  }

  // Calculate summary statistics
  const summary = {
    total: filteredInvoices.length,
    paid: filteredInvoices.filter((i) => i.is_paid).length,
    unpaid: filteredInvoices.filter((i) => !i.is_paid).length,
    overdue: filteredInvoices.filter(
      (i) => !i.is_paid && new Date(i.due_date) < new Date(),
    ).length,
    totalAmount: filteredInvoices.reduce(
      (sum, i) => sum + Number(i.amount_due),
      0,
    ),
    totalPaidAmount: filteredInvoices.reduce((sum, i) => sum + totalPaid(i), 0),
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading invoices...</p>
      </div>
    );
  }

  return (
    <div className="invoices-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Invoices</h2>
          <p className="subtitle">Manage all invoices and payments</p>
        </div>
        <button className="btn-primary" onClick={() => loadInvoices()}>
          <RefreshCw size={20} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card total">
          <div className="summary-icon">
            <CreditCard size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary.total}</span>
            <span className="summary-label">Total Invoices</span>
          </div>
        </div>
        <div className="summary-card paid">
          <div className="summary-icon">
            <CheckCircle size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary.paid}</span>
            <span className="summary-label">Paid</span>
          </div>
        </div>
        <div className="summary-card unpaid">
          <div className="summary-icon">
            <XCircle size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary.unpaid}</span>
            <span className="summary-label">Unpaid</span>
          </div>
        </div>
        <div className="summary-card overdue">
          <div className="summary-icon">
            <AlertCircle size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary.overdue}</span>
            <span className="summary-label">Overdue</span>
          </div>
        </div>
        <div className="summary-card revenue">
          <div className="summary-icon">
            <DollarSign size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">
              ৳{summary.totalPaidAmount.toLocaleString()}
            </span>
            <span className="summary-label">Total Collected</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by tenant, property, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} />
          Filters
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {(filterStatus !== "all" || filterPeriod !== "all" || searchTerm) && (
          <button className="clear-filters" onClick={clearFilters}>
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label>Status</label>
            <div className="filter-options">
              <button
                className={filterStatus === "all" ? "active" : ""}
                onClick={() => setFilterStatus("all")}
              >
                All
              </button>
              <button
                className={filterStatus === "paid" ? "active" : ""}
                onClick={() => setFilterStatus("paid")}
              >
                Paid
              </button>
              <button
                className={filterStatus === "unpaid" ? "active" : ""}
                onClick={() => setFilterStatus("unpaid")}
              >
                Unpaid
              </button>
              <button
                className={filterStatus === "overdue" ? "active" : ""}
                onClick={() => setFilterStatus("overdue")}
              >
                Overdue
              </button>
              <button
                className={filterStatus === "upcoming" ? "active" : ""}
                onClick={() => setFilterStatus("upcoming")}
              >
                Due Soon
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label>Period</label>
            <div className="filter-options">
              <button
                className={filterPeriod === "all" ? "active" : ""}
                onClick={() => setFilterPeriod("all")}
              >
                All
              </button>
              <button
                className={filterPeriod === "current_month" ? "active" : ""}
                onClick={() => setFilterPeriod("current_month")}
              >
                This Month
              </button>
              <button
                className={filterPeriod === "last_month" ? "active" : ""}
                onClick={() => setFilterPeriod("last_month")}
              >
                Last Month
              </button>
              <button
                className={filterPeriod === "next_month" ? "active" : ""}
                onClick={() => setFilterPeriod("next_month")}
              >
                Next Month
              </button>
            </div>
          </div>

          <div className="filter-stats">
            <span>{filteredInvoices.length} invoices found</span>
          </div>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Invoices Grid */}
      <div className="invoices-grid">
        {filteredInvoices.map((invoice) => {
          const status = getStatusInfo(invoice);
          const StatusIcon = status.icon;
          const paid = totalPaid(invoice);
          const remaining = Number(invoice.amount_due) - paid;
          const dueDate = new Date(invoice.due_date);
          const daysUntilDue = Math.ceil(
            (dueDate - new Date()) / (1000 * 60 * 60 * 24),
          );

          // Check if this is the latest invoice for this rental
          const latestInvoice = getLatestInvoiceForRental(invoice.rental_id);
          const isLatest = latestInvoice?.id === invoice.id;

          // Check if next invoice already exists
          const hasNext = hasNextInvoice(invoice);

          // Only show "Generate Next" button if:
          // 1. Invoice is paid
          // 2. This is the latest invoice for the rental
          // 3. No next invoice exists yet
          const showGenerateButton = invoice.is_paid && isLatest && !hasNext;

          return (
            <div className="invoice-card" key={invoice.id}>
              <div className="invoice-card-header">
                <div className="tenant-info">
                  <User size={16} />
                  <strong>
                    {invoice.rentals?.tenants?.full_name || "Unknown"}
                  </strong>
                </div>
                <div
                  className="invoice-status"
                  style={{
                    backgroundColor: status.bg,
                    padding: "4px 12px",
                    borderRadius: "12px",
                    color: status.color,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                  }}
                >
                  <StatusIcon size={14} />
                  <span>{status.label}</span>
                </div>
              </div>

              <div className="invoice-card-body">
                <div className="property-info">
                  <Building2 size={14} />
                  <span>{invoice.rentals?.properties?.name || "Property"}</span>
                </div>

                <div className="invoice-details">
                  <div className="detail-item">
                    <Calendar size={14} />
                    <span>
                      {invoice.period_start} → {invoice.period_end}
                    </span>
                  </div>
                  <div className="detail-item">
                    <Clock size={14} />
                    <span>
                      Due: {invoice.due_date}
                      {!invoice.is_paid && daysUntilDue > 0 && (
                        <span className="days-until">
                          {" "}
                          ({daysUntilDue} days left)
                        </span>
                      )}
                      {!invoice.is_paid && daysUntilDue <= 0 && (
                        <span className="days-overdue">
                          {" "}
                          (Overdue by {Math.abs(daysUntilDue)} days)
                        </span>
                      )}
                    </span>
                  </div>
                  {invoice.rentals?.tenants?.phone_number && (
                    <div className="detail-item">
                      <Phone size={14} />
                      <span>{invoice.rentals.tenants.phone_number}</span>
                    </div>
                  )}
                </div>

                <div className="amount-section">
                  <div className="amount-due">
                    <span className="label">Amount Due</span>
                    <span className="value">
                      ৳{Number(invoice.amount_due).toLocaleString()}
                    </span>
                  </div>
                  {paid > 0 && (
                    <>
                      <div className="amount-paid">
                        <span className="label">Paid</span>
                        <span className="value paid">
                          ৳{paid.toLocaleString()}
                        </span>
                      </div>
                      <div className="amount-remaining">
                        <span className="label">Remaining</span>
                        <span
                          className={`value ${remaining > 0 ? "remaining" : "settled"}`}
                        >
                          {remaining > 0
                            ? `৳${remaining.toLocaleString()}`
                            : "Settled"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {invoice.payments?.length > 0 && (
                  <div className="payment-history">
                    <small>Recent Payments:</small>
                    {invoice.payments.slice(0, 3).map((payment, idx) => (
                      <div key={idx} className="payment-item">
                        <span>
                          {getPaymentMethodIcon(payment.payment_method)}{" "}
                          {payment.payment_method}
                        </span>
                        <span>
                          ৳{Number(payment.amount_paid).toLocaleString()}
                        </span>
                        <span className="payment-date">
                          {new Date(payment.paid_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {invoice.payments.length > 3 && (
                      <span className="more-payments">
                        +{invoice.payments.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Show indicator if next invoice exists */}
                {!showGenerateButton &&
                  invoice.is_paid &&
                  isLatest &&
                  hasNext && (
                    <div className="next-invoice-indicator">
                      <CheckCircle size={14} color="#22c55e" />
                      <span>Next month's invoice already generated</span>
                    </div>
                  )}

                {!showGenerateButton && invoice.is_paid && !isLatest && (
                  <div className="next-invoice-indicator">
                    <Clock size={14} color="#6b7280" />
                    <span>Not the latest invoice</span>
                  </div>
                )}

                {/* Expanded details */}
                {expandedInvoice === invoice.id && (
                  <div className="invoice-expanded">
                    <div className="rental-details">
                      <h5>Rental Details</h5>
                      <p>
                        <strong>Monthly Rent:</strong> ৳
                        {invoice.rentals?.monthly_rent?.toLocaleString()}
                      </p>
                      <p>
                        <strong>Started:</strong> {invoice.rentals?.start_date}
                      </p>
                      {invoice.rentals?.end_date && (
                        <p>
                          <strong>Ended:</strong> {invoice.rentals?.end_date}
                        </p>
                      )}
                      {invoice.rentals?.properties?.address && (
                        <p>
                          <strong>Address:</strong>{" "}
                          {invoice.rentals.properties.address}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="invoice-card-footer">
                <button
                  className="btn-expand"
                  onClick={() => toggleExpand(invoice.id)}
                >
                  {expandedInvoice === invoice.id ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                  {expandedInvoice === invoice.id
                    ? "Show Less"
                    : "Show Details"}
                </button>

                <div className="invoice-actions">
                  {!invoice.is_paid && (
                    <>
                      {payingId === invoice.id ? (
                        <div className="payment-form">
                          <input
                            type="number"
                            placeholder="Amount"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="payment-input"
                          />
                          <select
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value)}
                            className="payment-select"
                          >
                            <option value="cash">Cash</option>
                            <option value="bkash">bKash</option>
                            <option value="nagad">Nagad</option>
                            <option value="bank">Bank</option>
                          </select>
                          <button
                            className="btn-confirm"
                            onClick={() => recordPayment(invoice)}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => setPayingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-pay"
                          onClick={() => {
                            setPayingId(invoice.id);
                            setPayAmount(
                              String(
                                remaining > 0 ? remaining : invoice.amount_due,
                              ),
                            );
                          }}
                        >
                          <CreditCard size={16} />
                          Pay Now
                        </button>
                      )}
                    </>
                  )}

                  {showGenerateButton && (
                    <button
                      className="btn-generate"
                      onClick={() => generateNextInvoice(invoice)}
                      disabled={generatingId === invoice.id}
                    >
                      <Plus size={16} />
                      {generatingId === invoice.id
                        ? "Generating..."
                        : "Next Month"}
                    </button>
                  )}

                  <button
                    className="btn-delete"
                    onClick={() => deleteInvoice(invoice.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="empty-state">
            <CreditCard size={48} />
            <h3>No invoices found</h3>
            <p>
              {searchTerm || filterStatus !== "all" || filterPeriod !== "all"
                ? "Try adjusting your filters"
                : "Invoices will appear here when rentals are created"}
            </p>
            {(searchTerm ||
              filterStatus !== "all" ||
              filterPeriod !== "all") && (
              <button className="btn-secondary" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

  
    </div>
  );
}
