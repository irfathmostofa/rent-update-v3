import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  Building2,
  Users,
  FileText,
  DollarSign,
  AlertCircle,
  Home,
  UserPlus,
  Clock,
  CheckCircle,
  Sofa,
  Bed,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Overview() {
  const { user, isSuperAdmin, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeRentals: 0,
    totalTenants: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    availableCottageSeats: 0,
    availableApartments: 0,
    totalCottageRooms: 0,
    totalApartmentUnits: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [recentRentals, setRecentRentals] = useState([]);

  // FIX: cottage rentals link via cottage_room_id, NOT property_id
  // (property_id is left null for room-based bookings). Any owner query
  // that only did `.in("property_id", propertyIds)` was silently dropping
  // every cottage rental, invoice, and payment. This helper returns the
  // full, correct set of rental ids for an owner across BOTH apartment
  // and cottage properties.
  async function getOwnerRentalIds(ownerId) {
    const { data: ownerProperties } = await supabase
      .from("properties")
      .select("id, property_type_id")
      .eq("owner_id", ownerId);

    if (!ownerProperties || ownerProperties.length === 0) {
      return { rentalIds: [], propertyIds: [] };
    }

    const propertyIds = ownerProperties.map((p) => p.id);
    const cottagePropertyIds = ownerProperties
      .filter((p) => p.property_type_id === 2)
      .map((p) => p.id);

    const rentalIdSet = new Set();

    // Apartment rentals (property_id is set directly on the rental)
    const { data: apartmentRentals } = await supabase
      .from("rentals")
      .select("id")
      .in("property_id", propertyIds);
    apartmentRentals?.forEach((r) => rentalIdSet.add(r.id));

    // Cottage rentals (link via cottage_room_id -> cottage_rooms.property_id)
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

    return { rentalIds: Array.from(rentalIdSet), propertyIds };
  }

  async function loadDashboardData() {
    setLoading(true);
    try {
      let propertiesCount = 0;
      let activeRentalsCount = 0;
      let totalTenantsCount = 0;
      let availableCottageSeats = 0;
      let availableApartments = 0;
      let totalCottageRooms = 0;
      let totalApartmentUnits = 0;

      // Rental ids relevant to this user — used to scope invoices/payments
      // below. For super admin this stays empty/unused (no scoping needed).
      let ownerRentalIds = [];

      if (isSuperAdmin) {
        // Super Admin - get ALL data (no owner filter)
        const [
          { count: allProperties },
          { count: allActiveRentals },
          { count: allTenants },
          { data: allCottageRooms },
          { data: allApartmentDetails },
        ] = await Promise.all([
          supabase
            .from("properties")
            .select("*", { count: "exact", head: true }), // No owner filter for super admin
          supabase
            .from("rentals")
            .select("*", { count: "exact", head: true })
            .eq("status_id", 1), // Active rentals only
          supabase.from("tenants").select("*", { count: "exact", head: true }), // All tenants
          supabase.from("cottage_rooms").select("id, seat_capacity"), // All cottage rooms
          supabase.from("apartment_details").select("property_id"), // All apartment details
        ]);

        propertiesCount = allProperties || 0;
        activeRentalsCount = allActiveRentals || 0;
        totalTenantsCount = allTenants || 0;
        totalCottageRooms = allCottageRooms?.length || 0;
        totalApartmentUnits = allApartmentDetails?.length || 0;

        // FIX: compute occupied seats purely from active rentals — never
        // from the is_occupied flag, which can be stale/out of sync with
        // actual seats_booked (e.g. partially booked rooms).
        if (allCottageRooms && allCottageRooms.length > 0) {
          const totalSeats = allCottageRooms.reduce(
            (sum, r) => sum + (r.seat_capacity || 0),
            0,
          );

          const { data: activeCottageRentals } = await supabase
            .from("rentals")
            .select("cottage_room_id, seats_booked")
            .eq("status_id", 1)
            .not("cottage_room_id", "is", null);

          const occupiedSeats = (activeCottageRentals || []).reduce(
            (sum, r) => sum + (r.seats_booked || 0),
            0,
          );

          availableCottageSeats = Math.max(0, totalSeats - occupiedSeats);
        }

        // Calculate available apartments
        if (allApartmentDetails && allApartmentDetails.length > 0) {
          const apartmentPropertyIds = allApartmentDetails.map(
            (a) => a.property_id,
          );

          const { data: rentedApartments } = await supabase
            .from("rentals")
            .select("property_id")
            .eq("status_id", 1)
            .in("property_id", apartmentPropertyIds);

          const rentedPropertyIds = new Set(
            rentedApartments?.map((r) => r.property_id) || [],
          );
          availableApartments = apartmentPropertyIds.filter(
            (id) => !rentedPropertyIds.has(id),
          ).length;
        }
      } else {
        // Owner - get only their data
        const { rentalIds, propertyIds } = await getOwnerRentalIds(user.id);
        ownerRentalIds = rentalIds;

        propertiesCount = propertyIds.length;

        if (propertyIds.length > 0) {
          // FIX: active rental count now includes cottage rentals too,
          // by counting status_id=1 rentals among ownerRentalIds instead
          // of only `.in("property_id", propertyIds)`.
          if (ownerRentalIds.length > 0) {
            const { count: rentalCount } = await supabase
              .from("rentals")
              .select("*", { count: "exact", head: true })
              .in("id", ownerRentalIds)
              .eq("status_id", 1);
            activeRentalsCount = rentalCount || 0;
          }

          // Get tenants - from tenants table with owner_id
          const { count: tenantCount } = await supabase
            .from("tenants")
            .select("*", { count: "exact", head: true })
            .eq("owner_id", user.id);

          totalTenantsCount = tenantCount || 0;

          // Get cottage rooms for this owner
          const { data: ownerPropertiesFull } = await supabase
            .from("properties")
            .select("id, property_type_id")
            .eq("owner_id", user.id);

          const cottagePropertyIds = (ownerPropertiesFull || [])
            .filter((p) => p.property_type_id === 2)
            .map((p) => p.id);

          if (cottagePropertyIds.length > 0) {
            const { data: cottageRooms } = await supabase
              .from("cottage_rooms")
              .select("id, seat_capacity, property_id")
              .in("property_id", cottagePropertyIds);

            totalCottageRooms = cottageRooms?.length || 0;

            if (cottageRooms && cottageRooms.length > 0) {
              const totalSeats = cottageRooms.reduce(
                (sum, r) => sum + (r.seat_capacity || 0),
                0,
              );

              // FIX: same is_occupied-independent calculation as above
              const roomIds = cottageRooms.map((r) => r.id);
              const { data: activeCottageRentals } = await supabase
                .from("rentals")
                .select("cottage_room_id, seats_booked")
                .eq("status_id", 1)
                .in("cottage_room_id", roomIds);

              const occupiedSeats = (activeCottageRentals || []).reduce(
                (sum, r) => sum + (r.seats_booked || 0),
                0,
              );

              availableCottageSeats = Math.max(0, totalSeats - occupiedSeats);
            }
          }

          // Get apartment details for this owner
          const apartmentPropertyIds = (ownerPropertiesFull || [])
            .filter((p) => p.property_type_id === 1)
            .map((p) => p.id);

          if (apartmentPropertyIds.length > 0) {
            const { data: apartmentDetails } = await supabase
              .from("apartment_details")
              .select("property_id")
              .in("property_id", apartmentPropertyIds);

            totalApartmentUnits = apartmentDetails?.length || 0;

            if (apartmentDetails && apartmentDetails.length > 0) {
              const aptPropertyIds = apartmentDetails.map((a) => a.property_id);

              const { data: rentedApartments } = await supabase
                .from("rentals")
                .select("property_id")
                .eq("status_id", 1)
                .in("property_id", aptPropertyIds);

              const rentedPropertyIds = new Set(
                rentedApartments?.map((r) => r.property_id) || [],
              );
              availableApartments = aptPropertyIds.filter(
                (id) => !rentedPropertyIds.has(id),
              ).length;
            }
          }
        }
      }

      // Get invoices with proper filtering
      // FIX: for owners, scope by ownerRentalIds (apartments + cottages)
      // instead of re-deriving from property_id only.
      let invoiceQuery = supabase.from("invoices").select(`
          *,
          rentals(
            id,
            tenant_id,
            status_id,
            tenants(full_name),
            properties(
              id,
              name,
              owner_id
            )
          )
        `);

      if (!isSuperAdmin) {
        if (ownerRentalIds.length > 0) {
          invoiceQuery = invoiceQuery.in("rental_id", ownerRentalIds);
        } else {
          invoiceQuery = supabase
            .from("invoices")
            .select("*", { count: "exact", head: true })
            .eq("rental_id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data: invoices } = await invoiceQuery
        .order("due_date", { ascending: false })
        .limit(10);

      // Calculate invoice stats
      const totalInvoices = invoices?.length || 0;
      const paidInvoices = invoices?.filter((i) => i.is_paid).length || 0;
      const overdueInvoices =
        invoices?.filter((i) => !i.is_paid && new Date(i.due_date) < new Date())
          .length || 0;
      const totalRevenue =
        invoices
          ?.filter((i) => i.is_paid)
          .reduce((sum, i) => sum + Number(i.amount_due), 0) || 0;

      // Get monthly revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let paymentQuery = supabase
        .from("payments")
        .select("amount_paid, paid_at, invoice_id")
        .gte("paid_at", thirtyDaysAgo.toISOString());

      if (!isSuperAdmin) {
        if (ownerRentalIds.length > 0) {
          const { data: invoicesForPayments } = await supabase
            .from("invoices")
            .select("id")
            .in("rental_id", ownerRentalIds);

          if (invoicesForPayments && invoicesForPayments.length > 0) {
            paymentQuery = paymentQuery.in(
              "invoice_id",
              invoicesForPayments.map((i) => i.id),
            );
          } else {
            paymentQuery = paymentQuery.eq(
              "invoice_id",
              "00000000-0000-0000-0000-000000000000",
            );
          }
        } else {
          paymentQuery = paymentQuery.eq(
            "invoice_id",
            "00000000-0000-0000-0000-000000000000",
          );
        }
      }

      const { data: recentPayments } = await paymentQuery;

      const monthlyRevenue =
        recentPayments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;

      setStats({
        totalProperties: propertiesCount,
        activeRentals: activeRentalsCount,
        totalTenants: totalTenantsCount,
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        totalRevenue,
        monthlyRevenue,
        availableCottageSeats,
        availableApartments,
        totalCottageRooms,
        totalApartmentUnits,
      });

      // Get recent activity (invoices and new rentals)
      const activity = [];

      // Get recent invoices
      let activityInvoiceQuery = supabase
        .from("invoices")
        .select(
          `
          *,
          rentals(
            id,
            tenant_id,
            status_id,
            tenants(full_name),
            properties(
              id,
              name,
              owner_id
            )
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(3);

      if (!isSuperAdmin && ownerRentalIds.length > 0) {
        activityInvoiceQuery = activityInvoiceQuery.in(
          "rental_id",
          ownerRentalIds,
        );
      } else if (!isSuperAdmin) {
        activityInvoiceQuery = activityInvoiceQuery.eq(
          "rental_id",
          "00000000-0000-0000-0000-000000000000",
        );
      }

      const { data: recentInvoices } = await activityInvoiceQuery;

      recentInvoices?.forEach((inv) => {
        activity.push({
          id: inv.id,
          type: "invoice",
          title: `Invoice #${inv.id.slice(0, 8)}`,
          description: inv.is_paid ? "Paid" : "Pending Payment",
          date: inv.created_at,
          icon: FileText,
          color: inv.is_paid ? "text-green-600" : "text-yellow-600",
        });
      });

      // Get recent rentals
      // FIX: scope by ownerRentalIds (rentals.id) instead of property_id,
      // so cottage rentals show up too.
      let rentalQuery = supabase
        .from("rentals")
        .select(
          `
          *,
          tenants(full_name),
          properties(name),
          cottage_rooms(room_number)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(2);

      if (!isSuperAdmin) {
        if (ownerRentalIds.length > 0) {
          rentalQuery = rentalQuery.in("id", ownerRentalIds);
        } else {
          rentalQuery = rentalQuery.eq(
            "id",
            "00000000-0000-0000-0000-000000000000",
          );
        }
      }

      const { data: recentRentalsData } = await rentalQuery;

      recentRentalsData?.forEach((rental) => {
        const propertyName =
          rental.properties?.name ||
          rental.cottage_rooms?.room_number ||
          "Unknown Property";
        activity.push({
          id: rental.id,
          type: "rental",
          title: `New Rental - ${propertyName}`,
          description: `${rental.tenants?.full_name || "Unknown"} started rental`,
          date: rental.created_at,
          icon: Home,
          color: "text-blue-600",
        });
      });

      activity.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentActivity(activity.slice(0, 5));
      setRecentRentals(recentRentalsData || []);

      // Get upcoming payments
      // FIX: scope by ownerRentalIds instead of property_id-only rentals,
      // so cottage tenants' upcoming dues show up here too.
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      let upcomingQuery = supabase
        .from("invoices")
        .select(
          `
          *,
          rentals(
            id,
            tenant_id,
            status_id,
            tenants(full_name),
            properties(
              id,
              name,
              owner_id
            )
          )
        `,
        )
        .eq("is_paid", false)
        .gte("due_date", today.toISOString().split("T")[0])
        .lte("due_date", nextWeek.toISOString().split("T")[0])
        .order("due_date", { ascending: true })
        .limit(5);

      if (!isSuperAdmin) {
        if (ownerRentalIds.length > 0) {
          upcomingQuery = upcomingQuery.in("rental_id", ownerRentalIds);
        } else {
          upcomingQuery = upcomingQuery.eq(
            "rental_id",
            "00000000-0000-0000-0000-000000000000",
          );
        }
      }

      const { data: upcoming } = await upcomingQuery;
      setUpcomingPayments(upcoming || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [user, isSuperAdmin]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="overview-dashboard">
      {/* Welcome Message */}
      <div className="welcome-section">
        <h2>Welcome back, {profile?.full_name?.split(" ")[0] || "User"}!</h2>
        <p className="welcome-subtitle">
          {isSuperAdmin
            ? "Super Admin Dashboard - Overview of all properties and users"
            : "Here's a summary of your property management activities"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Building2 size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalProperties}</h3>
            <p>{isSuperAdmin ? "Total Properties" : "Your Properties"}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.activeRentals}</h3>
            <p>Active Rentals</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <UserPlus size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalTenants}</h3>
            <p>Total Tenants</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon gold">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <h3>
              {isSuperAdmin ? "$" : "৳"}
              {stats.monthlyRevenue.toLocaleString()}
            </h3>
            <p>Monthly Revenue</p>
          </div>
        </div>

        {/* Available Units - Only show if there are units */}
        {(stats.totalCottageRooms > 0 || stats.totalApartmentUnits > 0) && (
          <>
            {stats.totalCottageRooms > 0 && (
              <div className="stat-card">
                <div className="stat-icon cyan">
                  <Sofa size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.availableCottageSeats}</h3>
                  <p>Available Seats</p>
                  <small className="stat-sub">
                    of {stats.totalCottageRooms} rooms
                  </small>
                </div>
              </div>
            )}

            {stats.totalApartmentUnits > 0 && (
              <div className="stat-card">
                <div className="stat-icon indigo">
                  <Bed size={24} />
                </div>
                <div className="stat-info">
                  <h3>{stats.availableApartments}</h3>
                  <p>Available Apartments</p>
                  <small className="stat-sub">
                    of {stats.totalApartmentUnits} units
                  </small>
                </div>
              </div>
            )}
          </>
        )}

        {/* Overdue stats */}
        <div className="stat-card">
          <div className="stat-icon red">
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>{stats.overdueInvoices}</h3>
            <p>Overdue Invoices</p>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="stat-card">
            <div className="stat-icon teal">
              <CheckCircle size={24} />
            </div>
            <div className="stat-info">
              <h3>৳{stats.totalRevenue.toLocaleString()}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Recent Activity */}
        <div className="dashboard-card activity-card">
          <div className="card-header">
            <h3>Recent Activity</h3>
            <Link
              to={isSuperAdmin ? "/admin" : "/dashboard/invoices"}
              className="view-all"
            >
              View All →
            </Link>
          </div>
          <div className="activity-list">
            {recentActivity.length === 0 ? (
              <p className="no-data">No recent activity</p>
            ) : (
              recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="activity-item">
                    <div className={`activity-icon ${activity.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.title}</p>
                      <span className="activity-desc">
                        {activity.description}
                      </span>
                    </div>
                    <span className="activity-time">
                      {new Date(activity.date).toLocaleDateString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="dashboard-card payments-card">
          <div className="card-header">
            <h3>Upcoming Payments</h3>
            <Link to="/dashboard/overdue" className="view-all">
              View All →
            </Link>
          </div>
          <div className="payment-list">
            {upcomingPayments.length === 0 ? (
              <p className="no-data">No upcoming payments</p>
            ) : (
              upcomingPayments.slice(0, 5).map((payment) => {
                const daysUntil = Math.ceil(
                  (new Date(payment.due_date) - new Date()) /
                    (1000 * 60 * 60 * 24),
                );
                return (
                  <div key={payment.id} className="payment-item">
                    <div className="payment-info">
                      <span className="payment-tenant">
                        {payment.rentals?.tenants?.full_name || "Unknown"}
                      </span>
                      <span className="payment-amount">
                        ৳{Number(payment.amount_due).toLocaleString()}
                      </span>
                    </div>
                    <div className="payment-meta">
                      <span
                        className={`payment-status ${daysUntil <= 2 ? "urgent" : ""}`}
                      >
                        {daysUntil <= 0 ? "Overdue" : `${daysUntil} days`}
                      </span>
                      <span className="payment-date">
                        {new Date(payment.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          {!isSuperAdmin ? (
            // Owner actions
            <>
              <Link to="/dashboard/properties" className="quick-action-card">
                <Home size={24} />
                <span>Add Property</span>
              </Link>
              <Link to="/dashboard/rentals" className="quick-action-card">
                <UserPlus size={24} />
                <span>New Rental</span>
              </Link>
              <Link to="/dashboard/tenants" className="quick-action-card">
                <Users size={24} />
                <span>Add Tenant</span>
              </Link>
              <Link to="/dashboard/invoices" className="quick-action-card">
                <FileText size={24} />
                <span>Create Invoice</span>
              </Link>
              <Link to="/dashboard/messages" className="quick-action-card">
                <Clock size={24} />
                <span>Send Reminder</span>
              </Link>
            </>
          ) : (
            // Super Admin actions
            <>
              <Link to="/admin/users" className="quick-action-card">
                <Users size={24} />
                <span>Manage Users</span>
              </Link>
              <Link to="/admin/properties" className="quick-action-card">
                <Building2 size={24} />
                <span>All Properties</span>
              </Link>
              <Link to="/admin/reports" className="quick-action-card">
                <AlertCircle size={24} />
                <span>View Reports</span>
              </Link>
              <Link to="/admin/verify" className="quick-action-card">
                <CheckCircle size={24} />
                <span>Verify Users</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Super Admin extra section */}
      {isSuperAdmin && (
        <div className="admin-section">
          <h3>Admin Overview</h3>
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <h4>System Status</h4>
              <span className="admin-stat-status online">● Online</span>
              <p className="admin-stat-desc">All systems operational</p>
              <div className="admin-stat-details">
                <span>
                  Total Owners: {stats.totalProperties > 0 ? "Active" : "0"}
                </span>
              </div>
            </div>
            <div className="admin-stat-card">
              <h4>Revenue Summary</h4>
              <span className="admin-stat-number">
                ৳{stats.totalRevenue.toLocaleString()}
              </span>
              <p className="admin-stat-desc">Total collected</p>
              <Link to="/admin/reports" className="admin-stat-link">
                View Reports →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
