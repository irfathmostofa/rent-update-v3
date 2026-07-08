import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle,
  Send,
  Calendar,
  DollarSign,
  Phone,
  Clock,
  Filter,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckCircle,
  Users,
} from "lucide-react";

export default function Overdue() {
  const { user, isSuperAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDays, setFilterDays] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadOverdue();
  }, [user, isSuperAdmin]);

  // FIX: same pattern as the dashboard — cottage rentals link via
  // cottage_room_id, not property_id, so we have to walk both paths to
  // get the complete, correct set of rental ids that belong to this owner.
  async function getOwnerRentalIds(ownerId) {
    const { data: ownerProperties } = await supabase
      .from("properties")
      .select("id, property_type_id")
      .eq("owner_id", ownerId);

    if (!ownerProperties || ownerProperties.length === 0) return [];

    const propertyIds = ownerProperties.map((p) => p.id);
    const cottagePropertyIds = ownerProperties
      .filter((p) => p.property_type_id === 2)
      .map((p) => p.id);

    const rentalIdSet = new Set();

    const { data: apartmentRentals } = await supabase
      .from("rentals")
      .select("id")
      .in("property_id", propertyIds);
    apartmentRentals?.forEach((r) => rentalIdSet.add(r.id));

    if (cottagePropertyIds.length > 0) {
      const { data: cottageRooms } = await supabase
        .from("cottage_rooms")
        .select("id")
        .in("property_id", cottagePropertyIds);

      const roomIds = cottageRooms?.map((r) => r.id) || [];
      if (roomIds.length > 0) {
        const { data: cottageRentals } = await supabase
          .from("rentals")
          .select("id")
          .in("cottage_room_id", roomIds);
        cottageRentals?.forEach((r) => rentalIdSet.add(r.id));
      }
    }

    return Array.from(rentalIdSet);
  }

  async function loadOverdue() {
    setLoading(true);
    try {
      let query = supabase
        .from("overdue_invoices")
        .select("*")
        .order("days_overdue", { ascending: false });

      // FIX: this previously had NO owner scoping at all — every owner
      // saw every other owner's overdue tenants. Super admin still sees
      // everything; owners are restricted to their own rentals.
      if (!isSuperAdmin && user) {
        const ownerRentalIds = await getOwnerRentalIds(user.id);

        if (ownerRentalIds.length === 0) {
          setRows([]);
          setFilteredRows([]);
          setLoading(false);
          return;
        }

        query = query.in("rental_id", ownerRentalIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRows(data ?? []);
      setFilteredRows(data ?? []);
    } catch (error) {
      console.error("Error loading overdue:", error);
    } finally {
      setLoading(false);
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...rows];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.tenant_name?.toLowerCase().includes(term) ||
          r.phone_number?.includes(term),
      );
    }

    // Days overdue filter
    if (filterDays !== "all") {
      if (filterDays === "7") {
        filtered = filtered.filter((r) => r.days_overdue <= 7);
      } else if (filterDays === "15") {
        filtered = filtered.filter(
          (r) => r.days_overdue > 7 && r.days_overdue <= 15,
        );
      } else if (filterDays === "30") {
        filtered = filtered.filter(
          (r) => r.days_overdue > 15 && r.days_overdue <= 30,
        );
      } else if (filterDays === "30+") {
        filtered = filtered.filter((r) => r.days_overdue > 30);
      }
    }

    setFilteredRows(filtered);
  }, [rows, searchTerm, filterDays]);

  function handleSendReminder(row) {
    navigate("/dashboard/messages", {
      state: {
        invoiceId: row.invoice_id,
        rentalId: row.rental_id,
        phone: row.phone_number,
        tenantName: row.tenant_name,
        amount: row.amount_due,
        dueDate: row.due_date,
      },
    });
  }

  function getSeverity(days) {
    if (days <= 7) return { label: "Mild", color: "#f59e0b", bg: "#fef3c7" };
    if (days <= 15)
      return { label: "Moderate", color: "#f97316", bg: "#ffedd5" };
    if (days <= 30) return { label: "Severe", color: "#ef4444", bg: "#fee2e2" };
    return { label: "Critical", color: "#dc2626", bg: "#fef2f2" };
  }

  function clearFilters() {
    setSearchTerm("");
    setFilterDays("all");
  }

  // Calculate summary stats
  const summary = {
    total: filteredRows.length,
    totalAmount: filteredRows.reduce((sum, r) => sum + Number(r.amount_due), 0),
    maxDays:
      filteredRows.length > 0
        ? Math.max(...filteredRows.map((r) => r.days_overdue))
        : 0,
    uniqueTenants: [...new Set(filteredRows.map((r) => r.tenant_name))].length,
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading overdue invoices...</p>
      </div>
    );
  }

  return (
    <div className="overdue-page">
      <div className="page-header">
        <div>
          <h2>Overdue Invoices</h2>
          <p className="subtitle">Track and manage overdue payments</p>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={loadOverdue}>
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon red">
            <AlertTriangle size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary.total}</span>
            <span className="summary-label">Overdue Invoices</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon orange">
            <DollarSign size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">
              ৳{summary.totalAmount.toLocaleString()}
            </span>
            <span className="summary-label">Total Amount Due</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon yellow">
            <Clock size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary.maxDays}</span>
            <span className="summary-label">Max Days Overdue</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon blue">
            <Users size={20} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{summary.uniqueTenants}</span>
            <span className="summary-label">Unique Tenants</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by tenant or phone..."
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

        {(filterDays !== "all" || searchTerm) && (
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
            <label>Days Overdue</label>
            <div className="filter-options">
              <button
                className={filterDays === "all" ? "active" : ""}
                onClick={() => setFilterDays("all")}
              >
                All
              </button>
              <button
                className={filterDays === "7" ? "active" : ""}
                onClick={() => setFilterDays("7")}
              >
                ≤ 7 days
              </button>
              <button
                className={filterDays === "15" ? "active" : ""}
                onClick={() => setFilterDays("15")}
              >
                8-15 days
              </button>
              <button
                className={filterDays === "30" ? "active" : ""}
                onClick={() => setFilterDays("30")}
              >
                16-30 days
              </button>
              <button
                className={filterDays === "30+" ? "active" : ""}
                onClick={() => setFilterDays("30+")}
              >
                30+ days
              </button>
            </div>
          </div>
          <div className="filter-stats">
            <span>{filteredRows.length} overdue invoices found</span>
          </div>
        </div>
      )}

      {/* Overdue List */}
      {filteredRows.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} color="#22c55e" />
          <h3>No Overdue Invoices 🎉</h3>
          <p>All invoices are paid up to date!</p>
        </div>
      ) : (
        <div className="overdue-list">
          {filteredRows.map((row) => {
            const severity = getSeverity(row.days_overdue);
            const isExpanded = expandedRow === row.invoice_id;

            return (
              <div
                className={`overdue-card ${isExpanded ? "expanded" : ""}`}
                key={row.invoice_id}
                style={{ borderLeftColor: severity.color }}
              >
                <div className="overdue-card-header">
                  <div className="tenant-info">
                    <div className="tenant-avatar">
                      {row.tenant_name?.charAt(0) || "T"}
                    </div>
                    <div>
                      <strong className="tenant-name">{row.tenant_name}</strong>
                      <div className="tenant-phone">
                        <Phone size={12} />
                        <span>{row.phone_number}</span>
                      </div>
                    </div>
                  </div>
                  <div className="overdue-badges">
                    <div
                      className="severity-badge"
                      style={{
                        backgroundColor: severity.bg,
                        color: severity.color,
                      }}
                    >
                      <AlertTriangle size={12} />
                      {severity.label}
                    </div>
                    <div className="days-badge">
                      <Clock size={12} />
                      {row.days_overdue} days overdue
                    </div>
                  </div>
                </div>

                <div className="overdue-card-body">
                  <div className="amount-info">
                    <div className="amount-item">
                      <span className="label">Amount Due</span>
                      <span className="value">
                        ৳{Number(row.amount_due).toLocaleString()}
                      </span>
                    </div>
                    <div className="amount-item">
                      <span className="label">Due Date</span>
                      <span className="value">
                        <Calendar size={14} />
                        {row.due_date}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overdue-card-footer">
                  <button
                    className="btn-send-reminder"
                    onClick={() => handleSendReminder(row)}
                  >
                    <Send size={16} />
                    Send Reminder
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
