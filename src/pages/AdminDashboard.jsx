import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  UserCheck,
  UserX,
  UserMinus,
  Clock,
  Mail,
  Phone,
  Calendar,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";

const STATUS_LABELS = {
  1: { label: "Pending", icon: Clock, color: "warning" },
  2: { label: "Active", icon: CheckCircle, color: "success" },
  3: { label: "Hold", icon: AlertCircle, color: "warning" },
  4: { label: "Terminated", icon: XCircle, color: "danger" },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reasonDrafts, setReasonDrafts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOwner, setExpandedOwner] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    hold: 0,
    terminated: 0,
  });
  const [showActionMenu, setShowActionMenu] = useState(null);

  async function loadOwners() {
    setLoading(true);
    const { data } = await supabase
      .from("owners")
      .select(
        `
        *,
        account_status(name),
        roles(name),
        admin_action_logs(
          id,
          action,
          reason,
          created_at,
          admin_id
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (data) {
      setOwners(data);
      // Calculate stats
      const statsData = {
        total: data.length,
        pending: data.filter((o) => o.status_id === 1).length,
        active: data.filter((o) => o.status_id === 2).length,
        hold: data.filter((o) => o.status_id === 3).length,
        terminated: data.filter((o) => o.status_id === 4).length,
      };
      setStats(statsData);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadOwners();
  }, []);

  async function changeStatus(owner, newStatusId, action) {
    const reason = reasonDrafts[owner.id] || null;

    const updatePayload = { status_id: newStatusId };
    if (newStatusId === 2) {
      updatePayload.approved_at = new Date().toISOString();
      updatePayload.approved_by = user.id;
    }
    if (newStatusId === 3) updatePayload.held_reason = reason;
    if (newStatusId === 4) updatePayload.terminated_reason = reason;

    const { error } = await supabase
      .from("owners")
      .update(updatePayload)
      .eq("id", owner.id);
    if (!error) {
      await supabase.from("admin_action_logs").insert({
        admin_id: user.id,
        target_owner_id: owner.id,
        action,
        reason,
      });
      loadOwners();
      setShowActionMenu(null);
      setReasonDrafts((d) => ({ ...d, [owner.id]: "" }));
    }
  }

  const filteredOwners = owners.filter((owner) => {
    const matchesSearch =
      owner.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.phone_number.includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" || owner.status_id === parseInt(statusFilter);
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (statusId) => {
    const classes = {
      1: "badge-warning",
      2: "badge-success",
      3: "badge-warning",
      4: "badge-danger",
    };
    return classes[statusId] || "badge-secondary";
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading owners...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Owners</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.pending}</h3>
            <p>Pending Verification</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <UserCheck size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.active}</h3>
            <p>Active Owners</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon hold">
            <UserMinus size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.hold}</h3>
            <p>On Hold</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon terminated">
            <UserX size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.terminated}</h3>
            <p>Terminated</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="admin-controls">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search owners by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-dropdown">
          <Filter size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="1">Pending</option>
            <option value="2">Active</option>
            <option value="3">Hold</option>
            <option value="4">Terminated</option>
          </select>
        </div>
      </div>

      {/* Owners List */}
      <div className="owners-list">
        {filteredOwners.length === 0 ? (
          <div className="empty-state">
            <Users size={48} className="empty-icon" />
            <h3>No owners found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          filteredOwners.map((owner) => {
            const StatusIcon = STATUS_LABELS[owner.status_id]?.icon || Users;
            const isExpanded = expandedOwner === owner.id;

            return (
              <div
                key={owner.id}
                className={`owner-card ${isExpanded ? "expanded" : ""}`}
              >
                <div className="owner-card-header">
                  <div className="owner-info">
                    <div className="owner-avatar">
                      {owner.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="owner-details">
                      <h3>{owner.full_name}</h3>
                      <div className="owner-meta">
                        <span className="meta-item">
                          <Mail size={14} />
                          {owner.email}
                        </span>
                        <span className="meta-item">
                          <Phone size={14} />
                          {owner.phone_number}
                        </span>
                        <span className="meta-item">
                          <Calendar size={14} />
                          Joined {formatDate(owner.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="owner-actions">
                    <span
                      className={`badge ${getStatusBadgeClass(owner.status_id)}`}
                    >
                      <StatusIcon size={14} />
                      {STATUS_LABELS[owner.status_id]?.label || "Unknown"}
                    </span>
                    {owner.roles?.name !== "super_admin" && (
                      <div className="action-menu-container">
                        <button
                          className="action-menu-btn"
                          onClick={() =>
                            setShowActionMenu(
                              showActionMenu === owner.id ? null : owner.id,
                            )
                          }
                        >
                          <MoreVertical size={20} />
                        </button>
                        {showActionMenu === owner.id && (
                          <div className="action-menu-dropdown">
                            {owner.status_id !== 2 && (
                              <button
                                className="action-item activate"
                                onClick={() =>
                                  changeStatus(owner, 2, "activated")
                                }
                              >
                                <CheckCircle size={16} />
                                Activate
                              </button>
                            )}
                            {owner.status_id !== 3 && (
                              <button
                                className="action-item hold"
                                onClick={() => changeStatus(owner, 3, "held")}
                              >
                                <AlertCircle size={16} />
                                Hold
                              </button>
                            )}
                            {owner.status_id !== 4 && (
                              <button
                                className="action-item terminate"
                                onClick={() =>
                                  changeStatus(owner, 4, "terminated")
                                }
                              >
                                <XCircle size={16} />
                                Terminate
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      className="expand-btn"
                      onClick={() =>
                        setExpandedOwner(isExpanded ? null : owner.id)
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div className="owner-expanded-details">
                    {/* Reason Input */}
                    {owner.roles?.name !== "super_admin" && (
                      <div className="reason-section">
                        <label>Reason (for hold/terminate actions):</label>
                        <textarea
                          placeholder="Enter reason for status change..."
                          value={reasonDrafts[owner.id] || ""}
                          onChange={(e) =>
                            setReasonDrafts((d) => ({
                              ...d,
                              [owner.id]: e.target.value,
                            }))
                          }
                          rows={2}
                        />
                      </div>
                    )}

                    {/* Status Change History */}
                    {owner.admin_action_logs &&
                      owner.admin_action_logs.length > 0 && (
                        <div className="action-history">
                          <h4>Action History</h4>
                          <div className="history-list">
                            {owner.admin_action_logs.slice(0, 5).map((log) => (
                              <div key={log.id} className="history-item">
                                <span className="history-action">
                                  {log.action}
                                </span>
                                <span className="history-date">
                                  {formatDate(log.created_at)}
                                </span>
                                {log.reason && (
                                  <span className="history-reason">
                                    "{log.reason}"
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Owner Stats */}
                    <div className="owner-stats">
                      <div className="stat-mini">
                        <span>Role</span>
                        <strong>{owner.roles?.name || "N/A"}</strong>
                      </div>
                      <div className="stat-mini">
                        <span>Status</span>
                        <strong>
                          {STATUS_LABELS[owner.status_id]?.label || "Unknown"}
                        </strong>
                      </div>
                      {owner.held_reason && (
                        <div className="stat-mini full-width">
                          <span>Hold Reason</span>
                          <strong>{owner.held_reason}</strong>
                        </div>
                      )}
                      {owner.terminated_reason && (
                        <div className="stat-mini full-width">
                          <span>Terminated Reason</span>
                          <strong>{owner.terminated_reason}</strong>
                        </div>
                      )}
                      {owner.approved_at && (
                        <div className="stat-mini">
                          <span>Approved At</span>
                          <strong>{formatDate(owner.approved_at)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
