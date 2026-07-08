import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Users,
  Home,
  Building2,
  DollarSign,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  Key,
  User,
  Eye,
  Briefcase,
  GraduationCap,
  Building,
  UserCog,
  PhoneCall,
  AlertCircle,
} from "lucide-react";

export default function Rentals() {
  const { user, isSuperAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [filteredRentals, setFilteredRentals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRental, setEditingRental] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedRental, setExpandedRental] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProperty, setFilterProperty] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [propertyOptions, setPropertyOptions] = useState([]);

  // Tenant Types
  const [tenantTypes, setTenantTypes] = useState([]);

  // Form fields - Tenant Information
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [tenantNid, setTenantNid] = useState("");
  const [tenantTypeId, setTenantTypeId] = useState("");
  const [occupation, setOccupation] = useState("");

  // Student fields
  const [studentDepartment, setStudentDepartment] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");

  // Job holder fields
  const [companyName, setCompanyName] = useState("");
  const [designation, setDesignation] = useState("");

  // Emergency contact
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Form fields - Rental Details
  const [propertyId, setPropertyId] = useState("");
  const [cottageRoomId, setCottageRoomId] = useState("");
  const [seatsBooked, setSeatsBooked] = useState(1);
  const [monthlyRent, setMonthlyRent] = useState("");
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [dueDay, setDueDay] = useState(1);

  const selectedProperty = properties.find((p) => p.id === propertyId);

  // Status options
  const statusOptions = [
    { id: 1, label: "Active", color: "#22c55e", bg: "#dcfce7" },
    { id: 2, label: "Closed", color: "#6b7280", bg: "#f3f4f6" },
    { id: 3, label: "Notice Period", color: "#f59e0b", bg: "#fef3c7" },
  ];

  async function loadData() {
    setLoading(true);
    try {
      // Load tenant types
      const { data: tenantTypesData, error: tenantTypesError } = await supabase
        .from("tenant_types")
        .select("*")
        .order("name");

      if (tenantTypesError) throw tenantTypesError;
      setTenantTypes(tenantTypesData ?? []);

      // Load properties
      const { data: propertyRows, error: propertyError } = await supabase
        .from("properties")
        .select("*, apartment_details(*), cottage_rooms(*)");

      if (propertyError) throw propertyError;
      setProperties(propertyRows ?? []);

      // Extract property options for filter
      const options =
        propertyRows?.map((p) => ({
          id: p.id,
          name: p.name,
        })) || [];
      setPropertyOptions(options);

      // Load rentals with all related data
      const { data: rentalRows, error: rentalError } = await supabase
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
            is_occupied
          ),
          rental_status(name),
          invoices(
            id,
            amount_due,
            due_date,
            is_paid,
            period_start,
            period_end
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (rentalError) throw rentalError;

      // Get payments for each rental
      const rentalsWithPayments = await Promise.all(
        (rentalRows || []).map(async (rental) => {
          const { data: payments } = await supabase
            .from("payments")
            .select("id, amount_paid, paid_at, payment_method")
            .in("invoice_id", rental.invoices?.map((i) => i.id) || []);

          return {
            ...rental,
            payments: payments || [],
          };
        }),
      );

      setRentals(rentalsWithPayments);
      setFilteredRentals(rentalsWithPayments);
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load rentals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // The mobile FAB dispatches this event when the user taps "New Rental"
  useEffect(() => {
    function handleOpenAddRental() {
      resetForm();
      setShowModal(true);
    }
    window.addEventListener("openAddRental", handleOpenAddRental);
    return () =>
      window.removeEventListener("openAddRental", handleOpenAddRental);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...rentals];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.tenants?.full_name?.toLowerCase().includes(term) ||
          r.tenants?.phone_number?.includes(term) ||
          r.properties?.name?.toLowerCase().includes(term) ||
          r.cottage_rooms?.room_number?.includes(term),
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status_id === parseInt(filterStatus));
    }

    // Property filter
    if (filterProperty !== "all") {
      filtered = filtered.filter(
        (r) =>
          r.property_id === filterProperty ||
          r.cottage_rooms?.property_id === filterProperty,
      );
    }

    setFilteredRentals(filtered);
  }, [rentals, searchTerm, filterStatus, filterProperty]);

  // Get status info
  function getStatusInfo(statusId) {
    const status = statusOptions.find((s) => s.id === statusId);
    return status || statusOptions[0];
  }

  // Get status icon
  function getStatusIcon(statusId) {
    switch (statusId) {
      case 1:
        return CheckCircle;
      case 2:
        return XCircle;
      case 3:
        return Clock;
      default:
        return Clock;
    }
  }

  // Live seat math for a cottage room
  function getRoomBookedSeats(roomId, excludeRentalId = null) {
    return rentals
      .filter(
        (r) =>
          r.cottage_room_id === roomId &&
          r.status_id === 1 &&
          r.id !== excludeRentalId,
      )
      .reduce((sum, r) => sum + (r.seats_booked || 0), 0);
  }

  function getRoomAvailableSeats(room, excludeRentalId = null) {
    if (!room) return 0;
    const booked = getRoomBookedSeats(room.id, excludeRentalId);
    return Math.max((room.seat_capacity || 0) - booked, 0);
  }

  // Reset form
  function resetForm() {
    setTenantName("");
    setTenantPhone("");
    setTenantEmail("");
    setTenantNid("");
    setTenantTypeId("");
    setOccupation("");
    setStudentDepartment("");
    setStudentIdNumber("");
    setCompanyName("");
    setDesignation("");
    setEmergencyContactName("");
    setEmergencyContactPhone("");
    setPropertyId("");
    setCottageRoomId("");
    setSeatsBooked(1);
    setMonthlyRent("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setDueDay(1);
    setEditingRental(null);
    setError("");
  }

  // Handle edit
  async function handleEdit(rental) {
    setEditingRental(rental);
    const tenant = rental.tenants;
    setTenantName(tenant?.full_name || "");
    setTenantPhone(tenant?.phone_number || "");
    setTenantEmail(tenant?.email || "");
    setTenantNid(tenant?.nid_number || "");
    setTenantTypeId(tenant?.tenant_type_id || "");
    setOccupation(tenant?.occupation || "");
    setStudentDepartment(tenant?.student_department || "");
    setStudentIdNumber(tenant?.student_id_number || "");
    setCompanyName(tenant?.company_name || "");
    setDesignation(tenant?.designation || "");
    setEmergencyContactName(tenant?.emergency_contact_name || "");
    setEmergencyContactPhone(tenant?.emergency_contact_phone || "");
    setPropertyId(
      rental.property_id || rental.cottage_rooms?.property_id || "",
    );
    setCottageRoomId(rental.cottage_room_id || "");
    setSeatsBooked(rental.seats_booked || 1);
    setMonthlyRent(rental.monthly_rent || "");
    setStartDate(rental.start_date || "");
    setDueDay(rental.due_day_of_month || 1);
    setShowModal(true);
  }

  // Handle delete
  async function handleDelete(rentalId) {
    if (
      !confirm(
        "Are you sure you want to delete this rental? This will also delete all associated invoices and payments.",
      )
    )
      return;

    try {
      const rental = rentals.find((r) => r.id === rentalId);

      const { error } = await supabase
        .from("rentals")
        .delete()
        .eq("id", rentalId);

      if (error) throw error;

      if (rental?.cottage_room_id) {
        await updateCottageRoomOccupancy(rental.cottage_room_id);
      }

      toast.success("Rental deleted");
      await loadData();
    } catch (error) {
      setError(error.message);
      toast.error(error.message || "Could not delete this rental");
    }
  }

  // Handle end rental
  async function handleEndRental(rentalId) {
    if (!confirm("Are you sure you want to end this rental?")) return;

    try {
      const { error } = await supabase
        .from("rentals")
        .update({
          status_id: 2,
          end_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", rentalId);

      if (error) throw error;

      const rental = rentals.find((r) => r.id === rentalId);
      if (rental?.cottage_room_id) {
        await updateCottageRoomOccupancy(rental.cottage_room_id);
      }

      toast.success("Rental ended");
      await loadData();
    } catch (error) {
      setError(error.message);
      toast.error(error.message || "Could not end this rental");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const isApartment = selectedProperty?.property_type_id === 1;
      const isEditing = !!editingRental;

      // Guard against overbooking
      if (!isApartment && cottageRoomId) {
        const room = selectedProperty?.cottage_rooms?.find(
          (r) => r.id === cottageRoomId,
        );
        const available = getRoomAvailableSeats(
          room,
          isEditing ? editingRental.id : null,
        );
        if (seatsBooked > available) {
          setError(
            `Only ${available} seat(s) available in this room. Reduce the seats booked.`,
          );
          setSubmitting(false);
          return;
        }
      }

      // 1. Find or create tenant with ALL fields
      let { data: tenant } = await supabase
        .from("tenants")
        .select("*")
        .eq("phone_number", tenantPhone)
        .maybeSingle();

      if (!tenant) {
        const tenantData = {
          full_name: tenantName,
          phone_number: tenantPhone,
          email: tenantEmail || null,
          nid_number: tenantNid || null,
          tenant_type_id: tenantTypeId || null,
          occupation: occupation || null,
          student_department: studentDepartment || null,
          student_id_number: studentIdNumber || null,
          company_name: companyName || null,
          designation: designation || null,
          emergency_contact_name: emergencyContactName || null,
          emergency_contact_phone: emergencyContactPhone || null,
          owner_id: user.id,
        };

        const { data: newTenant, error: tenantError } = await supabase
          .from("tenants")
          .insert(tenantData)
          .select()
          .single();

        if (tenantError) throw tenantError;
        tenant = newTenant;
      } else {
        // Update existing tenant with any new information
        const updateData = {
          full_name: tenantName,
          email: tenantEmail || null,
          nid_number: tenantNid || null,
          tenant_type_id: tenantTypeId || null,
          occupation: occupation || null,
          student_department: studentDepartment || null,
          student_id_number: studentIdNumber || null,
          company_name: companyName || null,
          designation: designation || null,
          emergency_contact_name: emergencyContactName || null,
          emergency_contact_phone: emergencyContactPhone || null,
        };

        const { error: updateError } = await supabase
          .from("tenants")
          .update(updateData)
          .eq("id", tenant.id);

        if (updateError) throw updateError;
      }

      const rentalPayload = {
        tenant_id: tenant.id,
        property_id: isApartment ? propertyId : null,
        cottage_room_id: isApartment ? null : cottageRoomId || null,
        seats_booked: isApartment ? 1 : seatsBooked,
        monthly_rent: monthlyRent,
        start_date: startDate,
        due_day_of_month: dueDay,
        status_id: 1,
      };

      let rental;

      if (isEditing) {
        const { data, error: rentalError } = await supabase
          .from("rentals")
          .update(rentalPayload)
          .eq("id", editingRental.id)
          .select()
          .single();

        if (rentalError) throw rentalError;
        rental = data;

        if (!isApartment && cottageRoomId) {
          await updateCottageRoomOccupancy(cottageRoomId);
        }
        if (
          editingRental.cottage_room_id &&
          editingRental.cottage_room_id !== cottageRoomId
        ) {
          await updateCottageRoomOccupancy(editingRental.cottage_room_id);
        }
      } else {
        const { data, error: rentalError } = await supabase
          .from("rentals")
          .insert(rentalPayload)
          .select()
          .single();

        if (rentalError) throw rentalError;
        rental = data;

        // Create first invoice
        const start = new Date(startDate);
        const periodEnd = new Date(start);
        periodEnd.setDate(start.getDate() + 29);
        const dueDate = new Date(start);
        dueDate.setDate(start.getDate() + 30);

        const { error: invoiceError } = await supabase.from("invoices").insert({
          rental_id: rental.id,
          period_start: start.toISOString().slice(0, 10),
          period_end: periodEnd.toISOString().slice(0, 10),
          due_date: dueDate.toISOString().slice(0, 10),
          amount_due: monthlyRent,
        });

        if (invoiceError) throw invoiceError;

        if (!isApartment && cottageRoomId) {
          await updateCottageRoomOccupancy(cottageRoomId);
        }
      }

      setSubmitting(false);
      setShowModal(false);
      toast.success(isEditing ? "Rental updated" : "Rental created");
      resetForm();
      await loadData();
    } catch (error) {
      setError(error.message);
      toast.error(
        error.message || "Something went wrong while saving the rental",
      );
      setSubmitting(false);
    }
  }

  // Helper function to update cottage room occupancy
  async function updateCottageRoomOccupancy(roomId) {
    try {
      const { data: room, error: roomError } = await supabase
        .from("cottage_rooms")
        .select("seat_capacity")
        .eq("id", roomId)
        .single();

      if (roomError) throw roomError;

      const { data: activeRentals, error: rentalError } = await supabase
        .from("rentals")
        .select("seats_booked")
        .eq("cottage_room_id", roomId)
        .eq("status_id", 1);

      if (rentalError) throw rentalError;

      const totalBookedSeats =
        activeRentals?.reduce((sum, r) => sum + (r.seats_booked || 0), 0) || 0;

      const isFullyOccupied = totalBookedSeats >= room.seat_capacity;

      const { error: updateError } = await supabase
        .from("cottage_rooms")
        .update({ is_occupied: isFullyOccupied })
        .eq("id", roomId);

      if (updateError) throw updateError;

      return isFullyOccupied;
    } catch (error) {
      console.error("Error updating cottage room occupancy:", error);
      throw error;
    }
  }

  // Clear filters
  function clearFilters() {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterProperty("all");
  }

  // Toggle expand
  function toggleExpand(rentalId) {
    setExpandedRental(expandedRental === rentalId ? null : rentalId);
  }

  // Calculate total paid
  function getTotalPaid(rental) {
    return rental.payments?.reduce((sum, p) => sum + p.amount_paid, 0) || 0;
  }

  // Calculate outstanding balance
  function getOutstandingBalance(rental) {
    const totalInvoices =
      rental.invoices?.reduce((sum, i) => sum + i.amount_due, 0) || 0;
    const totalPaid = getTotalPaid(rental);
    return totalInvoices - totalPaid;
  }

  // Get tenant type label
  function getTenantTypeLabel(typeId) {
    const type = tenantTypes.find((t) => t.id === typeId);
    return type?.name || "Unknown";
  }

  return (
    <div className="rentals-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Rentals</h2>
          <p className="subtitle">Manage all rental agreements</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus size={20} />
          New Rental
        </button>
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

        {(filterStatus !== "all" || filterProperty !== "all" || searchTerm) && (
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
              {statusOptions.map((status) => (
                <button
                  key={status.id}
                  className={filterStatus === String(status.id) ? "active" : ""}
                  onClick={() => setFilterStatus(String(status.id))}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Property</label>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
            >
              <option value="all">All Properties</option>
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-stats">
            <span>{filteredRentals.length} rentals found</span>
          </div>
        </div>
      )}

      {/* Rentals Grid */}
      {loading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading rentals...</p>
        </div>
      ) : (
        <div className="rentals-grid">
          {filteredRentals.map((rental) => {
            const statusInfo = getStatusInfo(rental.status_id);
            const StatusIcon = getStatusIcon(rental.status_id);
            const totalPaid = getTotalPaid(rental);
            const outstanding = getOutstandingBalance(rental);
            const tenant = rental.tenants;

            return (
              <div className="rental-card" key={rental.id}>
                <div className="rental-card-header">
                  <div className="tenant-info">
                    <User size={16} />
                    <strong>{tenant?.full_name}</strong>
                    {tenant?.tenant_type_id && (
                      <span className="tenant-type-badge">
                        {getTenantTypeLabel(tenant.tenant_type_id)}
                      </span>
                    )}
                  </div>
                  <div
                    className="rental-status"
                    style={{
                      backgroundColor: statusInfo.bg,
                      padding: "4px 12px",
                      borderRadius: "12px",
                      color: statusInfo.color,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                    }}
                  >
                    <StatusIcon size={14} />
                    <span>{statusInfo.label}</span>
                  </div>
                </div>

                <div className="rental-card-body">
                  <div className="property-info">
                    {rental.properties ? (
                      <>
                        <Building2 size={14} />
                        <span>{rental.properties.name}</span>
                        {rental.properties.city && (
                          <span className="city">{rental.properties.city}</span>
                        )}
                      </>
                    ) : (
                      rental.cottage_rooms && (
                        <>
                          <Home size={14} />
                          <span>Room {rental.cottage_rooms.room_number}</span>
                        </>
                      )
                    )}
                  </div>

                  <div className="rental-stats">
                    <div className="stat-item">
                      <DollarSign size={14} />
                      <span>৳{rental.monthly_rent?.toLocaleString()}/mo</span>
                    </div>
                    <div className="stat-item">
                      <Calendar size={14} />
                      <span>Started: {rental.start_date}</span>
                    </div>
                    {rental.seats_booked > 1 && (
                      <div className="stat-item">
                        <Users size={14} />
                        <span>{rental.seats_booked} seats</span>
                      </div>
                    )}
                    {rental.end_date && (
                      <div className="stat-item">
                        <XCircle size={14} />
                        <span>Ended: {rental.end_date}</span>
                      </div>
                    )}
                  </div>

                  {tenant && (
                    <div className="tenant-contact-info">
                      <Phone size={12} />
                      <span>{tenant.phone_number}</span>
                      {tenant.email && (
                        <>
                          <Mail size={12} />
                          <span>{tenant.email}</span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="financial-summary">
                    <div className="summary-item">
                      <span className="label">Total Paid</span>
                      <span className="value paid">
                        ৳{totalPaid.toLocaleString()}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Outstanding</span>
                      <span
                        className={`value ${outstanding > 0 ? "outstanding" : "settled"}`}
                      >
                        {outstanding > 0
                          ? `৳${outstanding.toLocaleString()}`
                          : "Settled"}
                      </span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedRental === rental.id && (
                    <div className="rental-expanded">
                      <div className="tenant-details">
                        <h5>Contact Details</h5>
                        <p>
                          <Phone size={14} /> {tenant?.phone_number}
                        </p>
                        {tenant?.email && (
                          <p>
                            <Mail size={14} /> {tenant.email}
                          </p>
                        )}
                        {tenant?.nid_number && (
                          <p>
                            <Key size={14} /> NID: {tenant.nid_number}
                          </p>
                        )}
                        {tenant?.tenant_type_id && (
                          <p>
                            <Users size={14} /> Type:{" "}
                            {getTenantTypeLabel(tenant.tenant_type_id)}
                          </p>
                        )}
                        {tenant?.occupation && (
                          <p>
                            <Briefcase size={14} /> Occupation:{" "}
                            {tenant.occupation}
                          </p>
                        )}
                        {tenant?.student_department && (
                          <p>
                            <GraduationCap size={14} /> Department:{" "}
                            {tenant.student_department}
                          </p>
                        )}
                        {tenant?.student_id_number && (
                          <p>
                            <User size={14} /> Student ID:{" "}
                            {tenant.student_id_number}
                          </p>
                        )}
                        {tenant?.company_name && (
                          <p>
                            <Building size={14} /> Company:{" "}
                            {tenant.company_name}
                          </p>
                        )}
                        {tenant?.designation && (
                          <p>
                            <UserCog size={14} /> Designation:{" "}
                            {tenant.designation}
                          </p>
                        )}
                        {tenant?.emergency_contact_name && (
                          <p>
                            <PhoneCall size={14} /> Emergency:{" "}
                            {tenant.emergency_contact_name} (
                            {tenant.emergency_contact_phone || "No phone"})
                          </p>
                        )}
                      </div>

                      <div className="invoice-summary">
                        <h5>Invoices</h5>
                        {rental.invoices?.length > 0 ? (
                          <div className="invoice-list">
                            {rental.invoices.slice(0, 5).map((inv) => (
                              <div key={inv.id} className="invoice-item">
                                <span className="period">
                                  {inv.period_start} to {inv.period_end}
                                </span>
                                <span className="amount">
                                  ৳{inv.amount_due}
                                </span>
                                <span
                                  className={`status ${inv.is_paid ? "paid" : "unpaid"}`}
                                >
                                  {inv.is_paid ? "Paid" : "Unpaid"}
                                </span>
                              </div>
                            ))}
                            {rental.invoices.length > 5 && (
                              <span className="more">
                                +{rental.invoices.length - 5} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="muted">No invoices yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rental-card-footer">
                  <button
                    className="btn-expand"
                    onClick={() => toggleExpand(rental.id)}
                  >
                    {expandedRental === rental.id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                    {expandedRental === rental.id
                      ? "Show Less"
                      : "Show Details"}
                  </button>
                  <div className="rental-actions">
                    <button
                      className="btn-view"
                      onClick={() =>
                        navigate(`/dashboard/rentals/${rental.id}`)
                      }
                    >
                      <Eye size={16} />
                      Details
                    </button>
                    {rental.status_id === 1 && (
                      <button
                        className="btn-end"
                        onClick={() => handleEndRental(rental.id)}
                      >
                        <XCircle size={16} />
                        End Rental
                      </button>
                    )}
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(rental)}
                    >
                      <Edit size={16} />
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(rental.id)}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredRentals.length === 0 && (
            <div className="empty-state">
              <Home size={48} />
              <h3>No rentals found</h3>
              <p>
                {searchTerm ||
                filterStatus !== "all" ||
                filterProperty !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first rental agreement"}
              </p>
              {(searchTerm ||
                filterStatus !== "all" ||
                filterProperty !== "all") && (
                <button className="btn-secondary" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingRental ? "Edit Rental" : "New Rental"}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                resetForm();
                setShowModal(false);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              form="rental-form"
            >
              {submitting
                ? "Saving..."
                : editingRental
                  ? "Update Rental"
                  : "Create Rental"}
            </button>
          </>
        }
      >
        <form id="rental-form" onSubmit={handleSubmit} className="rental-form">
          {error && <p className="error-text">{error}</p>}

          <div className="form-grid">
            <div className="form-section">
              <h4>Tenant Information</h4>
              <label>
                Tenant Type
                <select
                  value={tenantTypeId}
                  onChange={(e) => setTenantTypeId(e.target.value)}
                  className="customInput"
                >
                  <option value="">Select tenant type</option>
                  {tenantTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Full Name *
                <input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                  placeholder="Enter tenant name"
                  className="customInput"
                />
              </label>

              <label>
                Phone Number *
                <input
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  required
                  placeholder="01XXXXXXXXX"
                  className="customInput"
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  placeholder="tenant@email.com"
                  className="customInput"
                />
              </label>

              <label>
                NID Number
                <input
                  value={tenantNid}
                  onChange={(e) => setTenantNid(e.target.value)}
                  placeholder="NID number (optional)"
                  className="customInput"
                />
              </label>

              {tenantTypeId && (
                <>
                  {tenantTypes.find((t) => t.id === parseInt(tenantTypeId))
                    ?.name === "student" && (
                    <>
                      <div className="grid-2">
                        <label>
                          Department
                          <input
                            value={studentDepartment}
                            onChange={(e) =>
                              setStudentDepartment(e.target.value)
                            }
                            placeholder="e.g., Computer Science"
                            className="customInput"
                          />
                        </label>
                        <label>
                          Student ID
                          <input
                            value={studentIdNumber}
                            onChange={(e) => setStudentIdNumber(e.target.value)}
                            placeholder="Student ID number"
                            className="customInput"
                          />
                        </label>
                      </div>
                    </>
                  )}

                  {tenantTypes.find((t) => t.id === parseInt(tenantTypeId))
                    ?.name === "job_holder" && (
                    <>
                      {" "}
                      <label>
                        Occupation
                        <input
                          value={occupation}
                          onChange={(e) => setOccupation(e.target.value)}
                          placeholder="Enter occupation"
                          className="customInput"
                        />
                      </label>
                      <div className="grid-2">
                        <label>
                          Company Name
                          <input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Company name"
                            className="customInput"
                          />
                        </label>
                        <label>
                          Designation
                          <input
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            placeholder="Job title"
                            className="customInput"
                          />
                        </label>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="emergency-contact">
                <h5 style={{ fontSize: "14px", marginBottom: "8px" }}>
                  Emergency Contact
                </h5>
                <div className="grid-2">
                  <label>
                    Contact Name
                    <input
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="Emergency contact name"
                      className="customInput"
                    />
                  </label>
                  <label>
                    Contact Phone
                    <input
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="Emergency contact phone"
                      className="customInput"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Rental Details</h4>

              <label>
                Property *
                <select
                  value={propertyId}
                  onChange={(e) => {
                    setPropertyId(e.target.value);
                    setCottageRoomId("");
                    const prop = properties.find(
                      (p) => p.id === e.target.value,
                    );
                    if (prop?.property_type_id === 1) {
                      setMonthlyRent(
                        prop.apartment_details?.monthly_rent || "",
                      );
                    }
                  }}
                  required
                  className="customInput"
                >
                  <option value="">Select property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (
                      {p.property_type_id === 1 ? "Apartment" : "Cottage"})
                    </option>
                  ))}
                </select>
              </label>

              {selectedProperty?.property_type_id === 1 && (
                <div className="property-info">
                  <p className="muted">
                    <DollarSign size={14} />
                    Suggested rent: ৳
                    {selectedProperty.apartment_details?.monthly_rent?.toLocaleString()}
                    /mo
                  </p>
                  {selectedProperty.apartment_details?.area_sqft && (
                    <p className="muted">
                      Area: {selectedProperty.apartment_details.area_sqft} sqft
                    </p>
                  )}
                </div>
              )}

              {selectedProperty?.property_type_id === 2 && (
                <>
                  <label>
                    Room *
                    <select
                      value={cottageRoomId}
                      onChange={(e) => {
                        setCottageRoomId(e.target.value);
                        const room = selectedProperty.cottage_rooms?.find(
                          (r) => r.id === e.target.value,
                        );
                        if (room) {
                          const available = getRoomAvailableSeats(
                            room,
                            editingRental?.id,
                          );
                          const seats = Math.min(
                            seatsBooked || 1,
                            available || 1,
                          );
                          setSeatsBooked(seats);
                          setMonthlyRent(room.seat_cost * seats);
                        }
                      }}
                      required
                      className="customInput"
                    >
                      <option value="">Select room</option>
                      {selectedProperty.cottage_rooms
                        ?.map((r) => ({
                          ...r,
                          available: getRoomAvailableSeats(
                            r,
                            editingRental?.id,
                          ),
                        }))
                        .filter(
                          (r) =>
                            r.available > 0 ||
                            r.id === editingRental?.cottage_room_id,
                        )
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            Room {r.room_number} — {r.available}/
                            {r.seat_capacity} seats free — ৳{r.seat_cost}/seat
                            {r.available === 0 && " (Full)"}
                          </option>
                        ))}
                    </select>
                  </label>

                  <div className="grid-2">
                    <label>
                      Seats Booked *
                      <input
                        type="number"
                        min="1"
                        max={
                          getRoomAvailableSeats(
                            selectedProperty.cottage_rooms?.find(
                              (r) => r.id === cottageRoomId,
                            ),
                            editingRental?.id,
                          ) || 10
                        }
                        value={seatsBooked}
                        onChange={(e) => {
                          const room = selectedProperty.cottage_rooms?.find(
                            (r) => r.id === cottageRoomId,
                          );
                          const available = getRoomAvailableSeats(
                            room,
                            editingRental?.id,
                          );
                          const val = Math.min(
                            parseInt(e.target.value) || 1,
                            available || 1,
                          );
                          setSeatsBooked(val);
                          if (room) {
                            setMonthlyRent(room.seat_cost * val);
                          }
                        }}
                        required
                        className="customInput"
                      />
                      {cottageRoomId && (
                        <span className="hint">
                          {getRoomAvailableSeats(
                            selectedProperty.cottage_rooms?.find(
                              (r) => r.id === cottageRoomId,
                            ),
                            editingRental?.id,
                          )}{" "}
                          seat(s) available in this room
                        </span>
                      )}
                    </label>
                    <label>
                      Rent per seat
                      <input
                        type="number"
                        value={
                          selectedProperty.cottage_rooms?.find(
                            (r) => r.id === cottageRoomId,
                          )?.seat_cost || ""
                        }
                        disabled
                        className="customInput"
                      />
                    </label>
                  </div>
                </>
              )}

              <div className="grid-2">
                <label>
                  Monthly Rent (Total) *
                  <input
                    type="number"
                    min="0"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    required
                    placeholder="Total monthly rent"
                    className="customInput"
                  />
                </label>
                <label>
                  Due Day of Month *
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(parseInt(e.target.value) || 1)}
                    required
                    className="customInput"
                  />
                </label>
              </div>

              <label>
                Start Date *
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="customInput"
                />
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
