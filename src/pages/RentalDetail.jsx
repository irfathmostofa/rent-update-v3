import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../context/ToastContext";
import {
  ArrowLeft,
  Phone,
  Mail,
  Key,
  Home,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  MessageSquare,
  Wallet,
  Banknote,
  Landmark,
  Smartphone,
  CreditCard,
} from "lucide-react";

const PAYMENT_METHOD_ICON = {
  cash: Banknote,
  bank: Landmark,
  mobile_banking: Smartphone,
  card: CreditCard,
};

export default function RentalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [rental, setRental] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [payingInvoiceId, setPayingInvoiceId] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    loadRental();
  }, [id]);

  async function loadRental() {
    setLoading(true);
    setError("");
    try {
      const { data, error: rentalError } = await supabase
        .from("rentals")
        .select(
          `
          *,
          tenants(*),
          properties(
            id,
            name,
            address,
            city,
            property_type_id
          ),
          cottage_rooms(
            id,
            property_id,
            room_number,
            seat_capacity,
            seat_cost,
            is_occupied,
            properties(id, name, address, city)
          ),
          rental_status(id, name),
          invoices(
            id,
            amount_due,
            due_date,
            is_paid,
            period_start,
            period_end,
            created_at
          )
        `,
        )
        .eq("id", id)
        .single();

      if (rentalError) throw rentalError;

      const invoiceIds = (data.invoices || []).map((i) => i.id);
      const { data: payments } = invoiceIds.length
        ? await supabase
            .from("payments")
            .select("id, invoice_id, amount_paid, payment_method, paid_at, note")
            .in("invoice_id", invoiceIds)
        : { data: [] };

      const invoicesWithPayments = (data.invoices || [])
        .map((inv) => ({
          ...inv,
          payments: (payments || []).filter((p) => p.invoice_id === inv.id),
        }))
        .sort((a, b) => new Date(b.due_date) - new Date(a.due_date));

      setRental({ ...data, invoices: invoicesWithPayments });

      const { data: logRows } = await supabase
        .from("message_logs")
        .select("*")
        .eq("rental_id", id)
        .order("sent_at", { ascending: false });

      setLogs(logRows || []);
    } catch (err) {
      console.error("Error loading rental:", err);
      setError("Could not load this rental. It may have been deleted.");
    } finally {
      setLoading(false);
    }
  }

  function totalPaid(invoice) {
    return (invoice.payments ?? []).reduce(
      (sum, p) => sum + Number(p.amount_paid),
      0,
    );
  }

  function getInvoiceStatus(invoice) {
    if (invoice.is_paid) {
      return { label: "Paid", color: "#16a34a", bg: "#dcfce7", icon: CheckCircle };
    }
    const paid = totalPaid(invoice);
    if (paid > 0) {
      return { label: "Partial", color: "#d97706", bg: "#fef3c7", icon: Clock };
    }
    if (new Date(invoice.due_date) < new Date()) {
      return { label: "Overdue", color: "#dc2626", bg: "#fee2e2", icon: AlertCircle };
    }
    return { label: "Due", color: "#6b7280", bg: "#f3f4f6", icon: XCircle };
  }

  async function recordPayment(invoice) {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    setSubmittingPayment(true);
    try {
      const { error: payError } = await supabase.from("payments").insert({
        invoice_id: invoice.id,
        amount_paid: payAmount,
        payment_method: payMethod,
        note: `Payment for invoice ${invoice.id.slice(0, 8)}`,
      });
      if (payError) throw payError;

      const newTotal = totalPaid(invoice) + Number(payAmount);
      if (newTotal >= Number(invoice.amount_due)) {
        await supabase
          .from("invoices")
          .update({ is_paid: true })
          .eq("id", invoice.id);
        toast.success("Invoice fully paid");
      } else {
        toast.success(
          `Payment recorded — ৳${(Number(invoice.amount_due) - newTotal).toLocaleString()} remaining`,
        );
      }

      setPayingInvoiceId(null);
      setPayAmount("");
      await loadRental();
    } catch (err) {
      toast.error(err.message || "Could not record this payment");
    } finally {
      setSubmittingPayment(false);
    }
  }

  async function handleEndRental() {
    if (!confirm("Are you sure you want to end this rental?")) return;
    try {
      const { error: endError } = await supabase
        .from("rentals")
        .update({
          status_id: 2,
          end_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", id);
      if (endError) throw endError;

      if (rental?.cottage_room_id) {
        const { data: activeRentals } = await supabase
          .from("rentals")
          .select("seats_booked")
          .eq("cottage_room_id", rental.cottage_room_id)
          .eq("status_id", 1)
          .neq("id", id);
        const stillBooked = (activeRentals || []).reduce(
          (sum, r) => sum + (r.seats_booked || 0),
          0,
        );
        await supabase
          .from("cottage_rooms")
          .update({ is_occupied: stillBooked > 0 })
          .eq("id", rental.cottage_room_id);
      }

      toast.success("Rental ended");
      await loadRental();
    } catch (err) {
      toast.error(err.message || "Could not end this rental");
    }
  }

  if (loading) {
    return (
      <div className="rental-detail-page">
        <p className="muted">Loading rental...</p>
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="rental-detail-page">
        <button className="btn-back" onClick={() => navigate("/dashboard/rentals")}>
          <ArrowLeft size={18} /> Back to Rentals
        </button>
        <p className="error-banner">{error || "Rental not found"}</p>
      </div>
    );
  }

  const isApartment = !!rental.property_id;
  const propertyName = isApartment
    ? rental.properties?.name
    : rental.cottage_rooms?.properties?.name;
  const propertyAddress = isApartment
    ? rental.properties?.address
    : rental.cottage_rooms?.properties?.address;
  const roomLabel = !isApartment
    ? `Room ${rental.cottage_rooms?.room_number} · ${rental.seats_booked} seat(s)`
    : null;

  const totalInvoiced = rental.invoices.reduce(
    (sum, i) => sum + Number(i.amount_due),
    0,
  );
  const totalPaidAll = rental.invoices.reduce(
    (sum, i) => sum + totalPaid(i),
    0,
  );
  const balanceDue = totalInvoiced - totalPaidAll;
  const nextDue = rental.invoices.find((i) => !i.is_paid);

  return (
    <div className="rental-detail-page">
      <button className="btn-back" onClick={() => navigate("/dashboard/rentals")}>
        <ArrowLeft size={18} /> Back to Rentals
      </button>

      {/* Header */}
      <div className="detail-header">
        <div>
          <h2>{rental.tenants?.full_name}</h2>
          <p className="subtitle">
            {propertyName} {roomLabel && `· ${roomLabel}`}
          </p>
        </div>
        <span
          className={`status-pill ${rental.status_id === 1 ? "active" : "ended"}`}
        >
          {rental.rental_status?.name || (rental.status_id === 1 ? "Active" : "Ended")}
        </span>
      </div>

      {/* Summary cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <span className="label">Total Invoiced</span>
          <span className="value">৳{totalInvoiced.toLocaleString()}</span>
        </div>
        <div className="summary-card">
          <span className="label">Total Paid</span>
          <span className="value success">৳{totalPaidAll.toLocaleString()}</span>
        </div>
        <div className="summary-card">
          <span className="label">Balance Due</span>
          <span className={`value ${balanceDue > 0 ? "danger" : ""}`}>
            ৳{balanceDue.toLocaleString()}
          </span>
        </div>
        <div className="summary-card">
          <span className="label">Next Due</span>
          <span className="value">
            {nextDue ? new Date(nextDue.due_date).toLocaleDateString() : "—"}
          </span>
        </div>
      </div>

      {/* Info cards */}
      <div className="info-grid">
        <div className="info-card">
          <h4>Tenant Info</h4>
          <p>
            <Phone size={14} /> {rental.tenants?.phone_number}
          </p>
          {rental.tenants?.email && (
            <p>
              <Mail size={14} /> {rental.tenants.email}
            </p>
          )}
          {rental.tenants?.nid_number && (
            <p>
              <Key size={14} /> NID: {rental.tenants.nid_number}
            </p>
          )}
        </div>

        <div className="info-card">
          <h4>Rental Info</h4>
          <p>
            {isApartment ? <Home size={14} /> : <Building2 size={14} />}{" "}
            {propertyName}
          </p>
          {propertyAddress && <p className="muted-line">{propertyAddress}</p>}
          <p>
            <DollarSign size={14} /> ৳{Number(rental.monthly_rent).toLocaleString()}/month
          </p>
          <p>
            <Calendar size={14} /> Started{" "}
            {new Date(rental.start_date).toLocaleDateString()}
          </p>
          <p className="muted-line">Due day: {rental.due_day_of_month} of each month</p>
          {rental.end_date && (
            <p className="muted-line">
              Ended {new Date(rental.end_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {rental.status_id === 1 && (
        <button className="btn-end standalone" onClick={handleEndRental}>
          <XCircle size={16} /> End Rental
        </button>
      )}

      {/* Invoice + Payment history */}
      <div className="history-section">
        <h3>Invoice &amp; Payment History</h3>
        {rental.invoices.length === 0 ? (
          <p className="muted">No invoices yet for this rental.</p>
        ) : (
          <div className="invoice-history-list">
            {rental.invoices.map((invoice) => {
              const status = getInvoiceStatus(invoice);
              const StatusIcon = status.icon;
              const paid = totalPaid(invoice);
              const remaining = Number(invoice.amount_due) - paid;

              return (
                <div key={invoice.id} className="invoice-history-card">
                  <div className="invoice-history-top">
                    <div>
                      <span className="invoice-period">
                        {invoice.period_start} → {invoice.period_end}
                      </span>
                      <span className="invoice-due">
                        Due {new Date(invoice.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className="status-badge"
                      style={{ color: status.color, background: status.bg }}
                    >
                      <StatusIcon size={13} /> {status.label}
                    </span>
                  </div>

                  <div className="invoice-history-amounts">
                    <span>Due: ৳{Number(invoice.amount_due).toLocaleString()}</span>
                    <span>Paid: ৳{paid.toLocaleString()}</span>
                    {remaining > 0 && (
                      <span className="danger">
                        Remaining: ৳{remaining.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {invoice.payments.length > 0 && (
                    <div className="payment-list">
                      {invoice.payments.map((p) => {
                        const Icon = PAYMENT_METHOD_ICON[p.payment_method] || Wallet;
                        return (
                          <div key={p.id} className="payment-row">
                            <Icon size={14} />
                            <span>৳{Number(p.amount_paid).toLocaleString()}</span>
                            <span className="muted-line">
                              {p.payment_method?.replace("_", " ")}
                            </span>
                            <span className="muted-line">
                              {new Date(p.paid_at).toLocaleDateString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!invoice.is_paid &&
                    (payingInvoiceId === invoice.id ? (
                      <div className="pay-form">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          min="0"
                          step="0.01"
                        />
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                        >
                          <option value="cash">Cash</option>
                          <option value="bank">Bank</option>
                          <option value="mobile_banking">Mobile Banking</option>
                          <option value="card">Card</option>
                        </select>
                        <button
                          className="btn-pay"
                          disabled={submittingPayment}
                          onClick={() => recordPayment(invoice)}
                        >
                          {submittingPayment ? "Saving..." : "Save"}
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => {
                            setPayingInvoiceId(null);
                            setPayAmount("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn-pay"
                        onClick={() => {
                          setPayingInvoiceId(invoice.id);
                          setPayAmount(remaining > 0 ? String(remaining) : "");
                        }}
                      >
                        Record Payment
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Communication history */}
      <div className="history-section">
        <h3>Communication History</h3>
        {logs.length === 0 ? (
          <p className="muted">No messages sent for this rental yet.</p>
        ) : (
          <div className="message-log-list">
            {logs.map((log) => (
              <div key={log.id} className="message-log-row">
                <MessageSquare size={14} />
                <div>
                  <p className="message-log-text">{log.final_message}</p>
                  <span className="muted-line">
                    {log.channel} · {log.status} ·{" "}
                    {new Date(log.sent_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .rental-detail-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 24px;
        }

        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          align-self: flex-start;
          background: none;
          border: none;
          color: var(--text-secondary, #475569);
          font-size: 14px;
          cursor: pointer;
          padding: 4px 0;
        }

        .btn-back:hover {
          color: var(--accent-color, #2563eb);
        }

        .detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .detail-header h2 {
          margin: 0 0 4px;
        }

        .detail-header .subtitle {
          color: var(--text-secondary, #64748b);
          margin: 0;
        }

        .status-pill {
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
        }

        .status-pill.active {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-pill.ended {
          background: #f1f5f9;
          color: #64748b;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .summary-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .summary-card .label {
          font-size: 12px;
          color: #94a3b8;
        }

        .summary-card .value {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }

        .summary-card .value.success { color: #16a34a; }
        .summary-card .value.danger { color: #dc2626; }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }

        .info-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }

        .info-card h4 {
          margin: 0 0 10px;
          font-size: 14px;
          color: #475569;
        }

        .info-card p {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 6px 0;
          font-size: 14px;
          color: #0f172a;
        }

        .muted-line {
          font-size: 13px !important;
          color: #94a3b8 !important;
        }

        .btn-end.standalone {
          align-self: flex-start;
        }

        .history-section h3 {
          margin: 0 0 12px;
          font-size: 16px;
        }

        .invoice-history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .invoice-history-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
        }

        .invoice-history-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
          flex-wrap: wrap;
        }

        .invoice-period {
          display: block;
          font-weight: 600;
          font-size: 14px;
        }

        .invoice-due {
          display: block;
          font-size: 12px;
          color: #94a3b8;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }

        .invoice-history-amounts {
          display: flex;
          gap: 16px;
          margin-top: 10px;
          font-size: 13px;
          color: #475569;
          flex-wrap: wrap;
        }

        .invoice-history-amounts .danger {
          color: #dc2626;
          font-weight: 600;
        }

        .payment-list {
          margin-top: 10px;
          border-top: 1px dashed #e2e8f0;
          padding-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .payment-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #334155;
        }

        .pay-form {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pay-form input, .pay-form select {
          padding: 8px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 13px;
        }

        .message-log-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .message-log-row {
          display: flex;
          gap: 10px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 14px;
        }

        .message-log-text {
          margin: 0 0 4px;
          font-size: 14px;
          color: #0f172a;
        }

        .error-banner {
          color: #dc2626;
          background: #fee2e2;
          padding: 12px 16px;
          border-radius: 8px;
        }

        @media (max-width: 640px) {
          .detail-header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
