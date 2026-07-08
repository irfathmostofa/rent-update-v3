import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  MessageSquare,
  Send,
  Plus,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Phone,
  User,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Mail,
  Zap,
  Users,
} from "lucide-react";

function renderTemplate(content, vars) {
  return content.replace(/{(\w+)}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export default function Messages() {
  const { user, isSuperAdmin } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const prefill = location.state;

  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Template form fields
  const [templateType, setTemplateType] = useState("reminder");
  const [content, setContent] = useState(
    "Hi {tenant_name}, your rent of ৳{amount} was due on {due_date}. Please pay at your earliest convenience.",
  );

  // Send message fields
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [searchLogs, setSearchLogs] = useState("");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [tenantSearch, setTenantSearch] = useState("");

  // Preview variables
  const [previewVars, setPreviewVars] = useState({
    tenant_name: prefill?.tenantName ?? "",
    amount: prefill?.amount ?? "",
    due_date: prefill?.dueDate ?? "",
  });

  // Template search
  const [templateSearch, setTemplateSearch] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: t }, { data: l }, { data: tenantsData }] =
        await Promise.all([
          supabase
            .from("message_templates")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("message_logs")
            .select("*")
            .order("sent_at", { ascending: false })
            .limit(50),
          supabase
            .from("tenants")
            .select("id, full_name, phone_number, email")
            .eq("owner_id", user.id)
            .order("full_name", { ascending: true }),
        ]);
      setTemplates(t ?? []);
      setFilteredTemplates(t ?? []);
      setLogs(l ?? []);
      setTenants(tenantsData ?? []);

      // If prefill has phone, try to find matching tenant
      if (prefill?.phone) {
        const matchingTenant = tenantsData?.find(
          (t) => t.phone_number === prefill.phone,
        );
        if (matchingTenant) {
          setSelectedTenantId(matchingTenant.id);
          setPhone(matchingTenant.phone_number);
          setPreviewVars({
            tenant_name: matchingTenant.full_name,
            amount: prefill?.amount ?? "",
            due_date: prefill?.dueDate ?? "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load messages data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter templates
  useEffect(() => {
    let filtered = [...templates];
    if (templateSearch) {
      const term = templateSearch.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.template_type.toLowerCase().includes(term) ||
          t.content.toLowerCase().includes(term),
      );
    }
    setFilteredTemplates(filtered);
  }, [templates, templateSearch]);

  // Filter tenants
  const filteredTenants = tenants.filter((tenant) => {
    if (tenantSearch) {
      const term = tenantSearch.toLowerCase();
      return (
        tenant.full_name.toLowerCase().includes(term) ||
        tenant.phone_number.includes(term)
      );
    }
    return true;
  });

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (searchLogs) {
      const term = searchLogs.toLowerCase();
      if (
        !log.recipient_phone.includes(term) &&
        !log.final_message.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    if (filterChannel !== "all" && log.channel !== filterChannel) return false;
    if (filterStatus !== "all" && log.status !== filterStatus) return false;
    return true;
  });

  // Handle tenant selection
  function handleTenantSelect(tenantId) {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      setSelectedTenantId(tenantId);
      setPhone(tenant.phone_number);
      setPreviewVars((prev) => ({
        ...prev,
        tenant_name: tenant.full_name,
      }));
    }
  }

  async function saveTemplate(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const isEditing = !!editingTemplate;
      const templateData = {
        owner_id: user.id,
        template_type: templateType,
        content: content,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("message_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);
        if (error) throw error;
        setSuccess("Template updated successfully!");
        toast.success("Template updated");
      } else {
        const { error } = await supabase
          .from("message_templates")
          .insert(templateData);
        if (error) throw error;
        setSuccess("Template created successfully!");
        toast.success("Template created");
      }

      setShowForm(false);
      setEditingTemplate(null);
      resetForm();
      await loadData();
    } catch (error) {
      setError(error.message);
      toast.error(error.message || "Could not save this template");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTemplate(id) {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setSuccess("Template deleted successfully!");
      toast.success("Template deleted");
      await loadData();
    } catch (error) {
      setError(error.message);
      toast.error(error.message || "Could not delete this template");
    }
  }

  function editTemplate(template) {
    setEditingTemplate(template);
    setTemplateType(template.template_type);
    setContent(template.content);
    setShowForm(true);
  }

  function resetForm() {
    setTemplateType("reminder");
    setContent(
      "Hi {tenant_name}, your rent of ৳{amount} was due on {due_date}. Please pay at your earliest convenience.",
    );
    setEditingTemplate(null);
    setError("");
    setSuccess("");
  }

  function duplicateTemplate(template) {
    setEditingTemplate(null);
    setTemplateType(template.template_type);
    setContent(template.content);
    setShowForm(true);
    setSuccess("Template duplicated! Edit and save to create a new one.");
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard!");
    setTimeout(() => setSuccess(""), 3000);
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const finalMessage = selectedTemplate
    ? renderTemplate(selectedTemplate.content, previewVars)
    : "";

  async function sendViaWhatsApp() {
    if (!selectedTemplate || !phone) {
      setError("Please select a template and enter a phone number");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Get rental_id and invoice_id if available from prefill or find active rental
      let rentalId = prefill?.rentalId ?? null;
      let invoiceId = prefill?.invoiceId ?? null;

      // If no rental_id but we have a tenant, try to find active rental
      if (!rentalId && selectedTenantId) {
        const { data: rentalData } = await supabase
          .from("rentals")
          .select("id")
          .eq("tenant_id", selectedTenantId)
          .eq("status_id", 1)
          .maybeSingle();
        if (rentalData) {
          rentalId = rentalData.id;
        }
      }

      const { error } = await supabase.from("message_logs").insert({
        rental_id: rentalId,
        invoice_id: invoiceId,
        template_id: selectedTemplate.id,
        channel: "whatsapp",
        recipient_phone: phone,
        final_message: finalMessage,
        status: "sent",
      });

      if (error) throw error;

      const cleanPhone = phone.replace(/[^\d]/g, "");
      window.open(
        `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMessage)}`,
        "_blank",
      );
      setSuccess("Message sent successfully!");
      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendViaSMS() {
    if (!selectedTemplate || !phone) {
      setError("Please select a template and enter a phone number");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      let rentalId = prefill?.rentalId ?? null;
      let invoiceId = prefill?.invoiceId ?? null;

      if (!rentalId && selectedTenantId) {
        const { data: rentalData } = await supabase
          .from("rentals")
          .select("id")
          .eq("tenant_id", selectedTenantId)
          .eq("status_id", 1)
          .maybeSingle();
        if (rentalData) {
          rentalId = rentalData.id;
        }
      }

      const { error } = await supabase.from("message_logs").insert({
        rental_id: rentalId,
        invoice_id: invoiceId,
        template_id: selectedTemplate.id,
        channel: "sms",
        recipient_phone: phone,
        final_message: finalMessage,
        status: "sent",
      });

      if (error) throw error;
      setSuccess("SMS logged successfully! (SMS integration would send here)");
      await loadData();
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case "sent":
        return CheckCircle;
      case "failed":
        return XCircle;
      case "pending":
        return Clock;
      default:
        return AlertCircle;
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "sent":
        return "#22c55e";
      case "failed":
        return "#ef4444";
      case "pending":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  }

  function getStatusBg(status) {
    switch (status) {
      case "sent":
        return "#dcfce7";
      case "failed":
        return "#fee2e2";
      case "pending":
        return "#fef3c7";
      default:
        return "#f3f4f6";
    }
  }

  function getChannelIcon(channel) {
    return channel === "whatsapp" ? "💬" : "📱";
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="page-header">
        <div>
          <h2>Messages</h2>
          <p className="subtitle">
            Manage templates and send messages to tenants
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? "Cancel" : "New Template"}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Template Form */}
      {showForm && (
        <form className="template-form" onSubmit={saveTemplate}>
          <div className="form-grid">
            <div className="form-section">
              <h4>{editingTemplate ? "Edit Template" : "Create Template"}</h4>
              <label>
                Template Type
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  required
                >
                  <option value="reminder">Reminder</option>
                  <option value="invoice">Invoice</option>
                  <option value="overdue">Overdue</option>
                  <option value="welcome">Welcome</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label>
                Message Content
                <div className="template-help">
                  <small>
                    Use {"{tenant_name}"}, {"{amount}"}, {"{due_date}"}
                  </small>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  required
                  placeholder="Write your template message here..."
                />
              </label>
              <div className="preview-container">
                <label>Preview:</label>
                <div className="preview-box">
                  {renderTemplate(content, {
                    tenant_name: "John Doe",
                    amount: "15,000",
                    due_date: "2024-01-15",
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                editingTemplate ? editTemplate(editingTemplate) : resetForm()
              }
            >
              Reset
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingTemplate
                  ? "Update Template"
                  : "Create Template"}
            </button>
          </div>
        </form>
      )}

      {/* Templates Section */}
      <div className="templates-section">
        <div className="section-header">
          <h3>Templates</h3>
          <div className="section-actions">
            <div className="search-bar-small">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
              />
            </div>
            <button className="btn-refresh" onClick={loadData}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="templates-grid">
          {filteredTemplates.length === 0 ? (
            <div className="empty-state-small">
              <MessageSquare size={32} />
              <p>No templates yet. Create your first template!</p>
            </div>
          ) : (
            filteredTemplates.map((t) => (
              <div className="template-card" key={t.id}>
                <div className="template-header">
                  <span
                    className={`template-badge template-${t.template_type}`}
                  >
                    {t.template_type}
                  </span>
                  <div className="template-actions">
                    <button
                      className="btn-icon"
                      onClick={() => duplicateTemplate(t)}
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => editTemplate(t)}
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={() => deleteTemplate(t.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="template-content">
                  <p>{t.content}</p>
                </div>
                <div className="template-footer">
                  <span className="template-date">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                  <button
                    className="btn-use"
                    onClick={() => {
                      setSelectedTemplateId(t.id);
                      document
                        .getElementById("send-section")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <Send size={14} />
                    Use
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Send Message Section */}
      <div id="send-section" className="send-section">
        <div className="section-header">
          <h3>Send Message</h3>
        </div>

        <div className="send-card">
          <div className="send-grid">
            <div className="send-left">
              <label>
                Select Template
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">Choose a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.template_type}: {t.content.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <Users size={14} />
                Select Tenant
                <div className="tenant-select-wrapper">
                  {/* <div className="tenant-search">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Search tenants..."
                      value={tenantSearch}
                      onChange={(e) => setTenantSearch(e.target.value)}
                    />
                  </div> */}
                  <select
                    value={selectedTenantId}
                    onChange={(e) => handleTenantSelect(e.target.value)}
                    className="tenant-select"
                  >
                    <option value="">Select a tenant...</option>
                    {filteredTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} - {t.phone_number}
                      </option>
                    ))}
                  </select>
                </div>
                {tenants.length === 0 && (
                  <p className="muted-text">
                    No tenants found. Add tenants first.
                  </p>
                )}
              </label>

              <label>
                <Phone size={14} />
                Recipient Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 8801XXXXXXXXX"
                />
              </label>

              <div className="preview-vars">
                <label>Preview Variables</label>
                <div className="vars-grid">
                  <input
                    placeholder="Tenant name"
                    value={previewVars.tenant_name}
                    onChange={(e) =>
                      setPreviewVars((v) => ({
                        ...v,
                        tenant_name: e.target.value,
                      }))
                    }
                  />
                  <input
                    placeholder="Amount (e.g., 15000)"
                    value={previewVars.amount}
                    onChange={(e) =>
                      setPreviewVars((v) => ({ ...v, amount: e.target.value }))
                    }
                  />
                  <input
                    placeholder="Due date (e.g., 2024-01-15)"
                    value={previewVars.due_date}
                    type="date"
                    onChange={(e) =>
                      setPreviewVars((v) => ({
                        ...v,
                        due_date: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="send-right">
              <label>Message Preview</label>
              <div className="message-preview">
                {finalMessage ? (
                  <div className="preview-content">{finalMessage}</div>
                ) : (
                  <div className="preview-placeholder">
                    <MessageSquare size={24} />
                    <p>Select a template to preview</p>
                  </div>
                )}
              </div>

              <div className="send-actions">
                <button
                  className="btn-whatsapp"
                  onClick={sendViaWhatsApp}
                  disabled={!selectedTemplateId || !phone || submitting}
                >
                  <Send size={16} />
                  Send via WhatsApp
                </button>
                <button
                  className="btn-sms"
                  onClick={sendViaSMS}
                  disabled={!selectedTemplateId || !phone || submitting}
                >
                  <Mail size={16} />
                  Send via SMS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Logs */}
      <div className="logs-section">
        <div className="section-header">
          <h3>Message Logs</h3>
          <div className="section-actions">
            <button
              className="filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              Filters
              {showFilters ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>
            <button className="btn-refresh" onClick={loadData}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filter-panel-small">
            <div className="filter-group">
              <label>Channel</label>
              <div className="filter-options">
                <button
                  className={filterChannel === "all" ? "active" : ""}
                  onClick={() => setFilterChannel("all")}
                >
                  All
                </button>
                <button
                  className={filterChannel === "whatsapp" ? "active" : ""}
                  onClick={() => setFilterChannel("whatsapp")}
                >
                  WhatsApp
                </button>
                <button
                  className={filterChannel === "sms" ? "active" : ""}
                  onClick={() => setFilterChannel("sms")}
                >
                  SMS
                </button>
              </div>
            </div>
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
                  className={filterStatus === "sent" ? "active" : ""}
                  onClick={() => setFilterStatus("sent")}
                >
                  Sent
                </button>
                <button
                  className={filterStatus === "pending" ? "active" : ""}
                  onClick={() => setFilterStatus("pending")}
                >
                  Pending
                </button>
                <button
                  className={filterStatus === "failed" ? "active" : ""}
                  onClick={() => setFilterStatus("failed")}
                >
                  Failed
                </button>
              </div>
            </div>
            <div className="filter-group">
              <label>Search</label>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchLogs}
                onChange={(e) => setSearchLogs(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="logs-list">
          {filteredLogs.length === 0 ? (
            <div className="empty-state-small">
              <Clock size={32} />
              <p>No messages sent yet</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const StatusIcon = getStatusIcon(log.status);
              const statusColor = getStatusColor(log.status);
              const statusBg = getStatusBg(log.status);

              return (
                <div className="log-item" key={log.id}>
                  <div className="log-header">
                    <div className="log-info">
                      <span className="log-channel">
                        {getChannelIcon(log.channel)} {log.channel}
                      </span>
                      <span className="log-phone">
                        <Phone size={12} /> {log.recipient_phone}
                      </span>
                    </div>
                    <div
                      className="log-status"
                      style={{ backgroundColor: statusBg, color: statusColor }}
                    >
                      <StatusIcon size={12} />
                      {log.status}
                    </div>
                  </div>
                  <div className="log-message">{log.final_message}</div>
                  <div className="log-footer">
                    <span className="log-time">
                      {new Date(log.sent_at).toLocaleString()}
                    </span>
                    <button
                      className="btn-icon"
                      onClick={() => copyToClipboard(log.final_message)}
                      title="Copy message"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
