import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Modal from "../components/Modal";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Home,
  Building2,
  Wifi,
  Zap,
  Droplet,
  Flame,
  ParkingCircle,
  Users,
  DollarSign,
  MapPin,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  CookingPot,
} from "lucide-react";

// Facility icons mapping
const FACILITY_ICONS = {
  water: Droplet,
  electricity: Zap,
  wifi: Wifi,
  parking: ParkingCircle,
  gas: Flame,
  meal: CookingPot,
};

export default function Properties() {
  const { user } = useAuth();
  const toast = useToast();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [type, setType] = useState("apartment");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [cities, setCities] = useState([]);

  // Form fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [areaSqft, setAreaSqft] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState(0);
  const [apartmentRooms, setApartmentRooms] = useState({});
  const [rooms, setRooms] = useState([
    { room_number: "1", seat_capacity: 4, seat_cost: "" },
  ]);
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allFacilities, setAllFacilities] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [expandedProperty, setExpandedProperty] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Default apartment rooms
  const defaultApartmentRooms = {};

  // Load facilities and room types from database
  useEffect(() => {
    loadLookupData();
  }, []);

  async function loadLookupData() {
    try {
      // Load facilities
      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from("facilities")
        .select("*")
        .order("name");

      if (facilitiesError) throw facilitiesError;
      setAllFacilities(facilitiesData || []);

      // Load room types
      const { data: roomTypesData, error: roomTypesError } = await supabase
        .from("room_types")
        .select("*")
        .order("name");

      if (roomTypesError) throw roomTypesError;
      setRoomTypes(roomTypesData || []);

      // Initialize apartment rooms from room types
      const initialRooms = {};
      roomTypesData?.forEach((rt) => {
        initialRooms[rt.name] = { count: 1, included: true };
      });
      setApartmentRooms(initialRooms);
    } catch (error) {
      console.error("Error loading lookup data:", error);
      toast.error("Failed to load facilities and room types");
    }
  }

  // Check apartment availability
  const checkApartmentAvailability = async (propertyId) => {
    try {
      const { data, error } = await supabase
        .from("rentals")
        .select("id, status_id, rental_status(name)")
        .eq("property_id", propertyId)
        .eq("status_id", 1)
        .maybeSingle();

      if (error) throw error;
      return !data;
    } catch (error) {
      console.error("Error checking apartment availability:", error);
      return true;
    }
  };

  // Get property status
  const getPropertyStatus = async (property) => {
    const rooms = property.cottage_rooms || [];

    let totalSeats = 0;
    let occupiedSeats = 0;

    for (const room of rooms) {
      totalSeats += room.seat_capacity || 0;

      const bookedSeats = (room.rentals || [])
        .filter((r) => r.status_id === 1)
        .reduce((sum, r) => sum + (r.seats_booked || 0), 0);

      occupiedSeats += bookedSeats;
    }

    const availableSeats = Math.max(totalSeats - occupiedSeats, 0);

    if (totalSeats > 0 && availableSeats <= 0) {
      return {
        status: "occupied",
        label: "Fully Occupied",
        availableSeats: 0,
        totalSeats,
      };
    }

    if (occupiedSeats > 0) {
      return {
        status: "partial",
        label: `${availableSeats} seats available`,
        availableSeats,
        totalSeats,
      };
    }

    return {
      status: "available",
      label: "All Available",
      availableSeats: totalSeats,
      totalSeats,
    };
  };

  async function loadProperties() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select(
          `
          *,
          apartment_details(*),
          apartment_rooms(*, room_types(name)),
          cottage_rooms(*, rentals(id, seats_booked, status_id)),
          property_facilities(
            *,
            facilities(*)
          ),
          rentals(id, status_id)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const propertiesWithStatus = await Promise.all(
        (data || []).map(async (property) => {
          const status = await getPropertyStatus(property);
          return { ...property, availability: status };
        }),
      );

      setProperties(propertiesWithStatus);
      setFilteredProperties(propertiesWithStatus);

      const uniqueCities = [
        ...new Set(data?.map((p) => p.city).filter(Boolean)),
      ];
      setCities(uniqueCities);
    } catch (error) {
      console.error("Error loading properties:", error);
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    let filtered = [...properties];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.address.toLowerCase().includes(term) ||
          (p.city && p.city.toLowerCase().includes(term)),
      );
    }

    if (filterType !== "all") {
      const typeId = filterType === "apartment" ? 1 : 2;
      filtered = filtered.filter((p) => p.property_type_id === typeId);
    }

    if (filterCity !== "all") {
      filtered = filtered.filter((p) => p.city === filterCity);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(
        (p) => p.availability?.status === filterStatus,
      );
    }

    setFilteredProperties(filtered);
  }, [properties, searchTerm, filterType, filterCity, filterStatus]);

  function resetForm() {
    setName("");
    setAddress("");
    setCity("");
    setAreaSqft("");
    setMonthlyRent("");
    setSecurityDeposit(0);
    // Reset apartment rooms from room types
    const initialRooms = {};
    roomTypes.forEach((rt) => {
      initialRooms[rt.name] = { count: 1, included: true };
    });
    setApartmentRooms(initialRooms);
    // Reset rooms - IMPORTANT: don't include IDs for new rooms
    setRooms([{ room_number: "1", seat_capacity: 4, seat_cost: "" }]); // No ID field
    setSelectedFacilities([]);
    setType("apartment");
    setEditingProperty(null);
    setError("");
  }

  function handleEdit(property) {
    setEditingProperty(property);
    setType(property.property_type_id === 1 ? "apartment" : "cottage");
    setName(property.name);
    setAddress(property.address);
    setCity(property.city || "");
    setShowModal(true);
    if (property.property_type_id === 1) {
      // ... apartment handling ...
    } else {
      // Handle cottage rooms - include the ID
      if (property.cottage_rooms?.length > 0) {
        setRooms(
          property.cottage_rooms.map((r) => ({
            id: r.id, // IMPORTANT: keep the ID
            room_number: r.room_number,
            seat_capacity: r.seat_capacity,
            seat_cost: r.seat_cost,
          })),
        );
      }
    }

    // ... rest of the function ...
  }
  async function handleDelete(propertyId) {
    if (!confirm("Are you sure you want to delete this property?")) return;

    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId);

      if (error) throw error;
      toast.success("Property deleted");
      await loadProperties();
    } catch (error) {
      toast.error(error.message || "Could not delete this property");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const propertyTypeId = type === "apartment" ? 1 : 2;
    const isEditing = !!editingProperty;

    try {
      let propertyId = editingProperty?.id;

      if (isEditing) {
        // Update property
        const { error: updateError } = await supabase
          .from("properties")
          .update({ name, address, city })
          .eq("id", propertyId);

        if (updateError) throw updateError;

        if (type === "apartment") {
          await handleApartmentUpdate(propertyId);
        } else {
          await handleCottageUpdate(propertyId);
        }

        // Delete and recreate facilities
        await supabase
          .from("property_facilities")
          .delete()
          .eq("property_id", propertyId);
      } else {
        const { data: property, error: propError } = await supabase
          .from("properties")
          .insert({
            owner_id: user.id,
            property_type_id: propertyTypeId,
            name,
            address,
            city,
          })
          .select()
          .single();

        if (propError) throw propError;
        propertyId = property.id;

        if (type === "apartment") {
          await handleApartmentCreate(propertyId);
        } else {
          await handleCottageCreate(propertyId);
        }
      }

      // Add facilities
      if (selectedFacilities.length > 0) {
        const facilityInserts = allFacilities
          .filter((f) => selectedFacilities.includes(f.name))
          .map((f) => ({
            property_id: propertyId,
            facility_id: f.id,
            is_included: true,
          }));

        if (facilityInserts.length > 0) {
          await supabase.from("property_facilities").insert(facilityInserts);
        }
      }

      setSubmitting(false);
      setShowModal(false);
      toast.success(isEditing ? "Property updated" : "Property created");
      resetForm();
      await loadProperties();
    } catch (error) {
      setError(error.message);
      toast.error(
        error.message || "Something went wrong while saving the property",
      );
      setSubmitting(false);
    }
  }

  async function handleApartmentCreate(propertyId) {
    const { error: detailError } = await supabase
      .from("apartment_details")
      .insert({
        property_id: propertyId,
        area_sqft: areaSqft || null,
        monthly_rent: monthlyRent,
        security_deposit: securityDeposit,
      });
    if (detailError) throw detailError;

    const roomInserts = Object.entries(apartmentRooms)
      .filter(([_, data]) => data.included && data.count > 0)
      .map(([roomName, data]) => {
        const roomType = roomTypes.find((rt) => rt.name === roomName);
        return {
          property_id: propertyId,
          room_type_id: roomType?.id,
          count: data.count,
        };
      })
      .filter((r) => r.room_type_id);

    if (roomInserts.length > 0) {
      const { error: roomError } = await supabase
        .from("apartment_rooms")
        .insert(roomInserts);
      if (roomError) throw roomError;
    }
  }

  async function handleCottageCreate(propertyId) {
    const roomRows = rooms.map((r) => ({
      property_id: propertyId,
      room_number: r.room_number.trim(),
      seat_capacity: parseInt(r.seat_capacity) || 0,
      seat_cost: parseFloat(r.seat_cost) || 0,
      is_occupied: false,
    }));
    const { error: roomError } = await supabase
      .from("cottage_rooms")
      .insert(roomRows);
    if (roomError) throw roomError;
  }

  // Replace the handleApartmentUpdate function with this fixed version
  async function handleApartmentUpdate(propertyId) {
    // Update apartment details
    const { data: existingDetails } = await supabase
      .from("apartment_details")
      .select("property_id")
      .eq("property_id", propertyId)
      .single();

    const detailData = {
      area_sqft: areaSqft || null,
      monthly_rent: monthlyRent,
      security_deposit: securityDeposit,
    };

    if (existingDetails) {
      await supabase
        .from("apartment_details")
        .update(detailData)
        .eq("property_id", propertyId);
    } else {
      await supabase
        .from("apartment_details")
        .insert({ property_id: propertyId, ...detailData });
    }

    // Get existing rooms to compare
    const { data: existingRooms } = await supabase
      .from("apartment_rooms")
      .select("id, room_type_id, count")
      .eq("property_id", propertyId);

    // Create a map of existing rooms by room_type_id
    const existingRoomsMap = {};
    existingRooms?.forEach((room) => {
      existingRoomsMap[room.room_type_id] = {
        id: room.id,
        count: room.count,
      };
    });

    // Prepare the rooms to keep/update/insert
    const roomsToInsert = [];
    const roomsToUpdate = [];
    const roomsToDelete = [];

    Object.entries(apartmentRooms).forEach(([roomName, data]) => {
      const roomType = roomTypes.find((rt) => rt.name === roomName);
      if (!roomType) return;

      if (data.included && data.count > 0) {
        // Room should exist
        if (existingRoomsMap[roomType.id]) {
          // Room exists, check if count changed
          if (existingRoomsMap[roomType.id].count !== data.count) {
            roomsToUpdate.push({
              id: existingRoomsMap[roomType.id].id,
              count: data.count,
            });
          }
          // Remove from map so we know it's processed
          delete existingRoomsMap[roomType.id];
        } else {
          // Room doesn't exist, insert it
          roomsToInsert.push({
            property_id: propertyId,
            room_type_id: roomType.id,
            count: data.count,
          });
        }
      } else {
        // Room should NOT exist
        if (existingRoomsMap[roomType.id]) {
          roomsToDelete.push(existingRoomsMap[roomType.id].id);
          delete existingRoomsMap[roomType.id];
        }
      }
    });

    // Any remaining rooms in existingRoomsMap are rooms that are no longer included
    Object.values(existingRoomsMap).forEach((room) => {
      roomsToDelete.push(room.id);
    });

    // Execute the operations
    if (roomsToDelete.length > 0) {
      await supabase.from("apartment_rooms").delete().in("id", roomsToDelete);
    }

    if (roomsToUpdate.length > 0) {
      // Update each room individually
      for (const room of roomsToUpdate) {
        await supabase
          .from("apartment_rooms")
          .update({ count: room.count })
          .eq("id", room.id);
      }
    }

    if (roomsToInsert.length > 0) {
      await supabase.from("apartment_rooms").insert(roomsToInsert);
    }
  }

  async function handleCottageUpdate(propertyId) {
    // Get existing rooms
    const { data: existingRooms } = await supabase
      .from("cottage_rooms")
      .select("id, room_number, seat_capacity, seat_cost, is_occupied")
      .eq("property_id", propertyId);

    // Create a map of existing rooms by room_number
    const existingRoomsMap = {};
    existingRooms?.forEach((room) => {
      existingRoomsMap[room.room_number] = {
        id: room.id,
        is_occupied: room.is_occupied,
        seat_capacity: room.seat_capacity,
        seat_cost: room.seat_cost,
      };
    });

    // Prepare arrays for operations
    const roomsToInsert = [];
    const roomsToUpdate = [];
    const roomsToDelete = [];

    // Process current rooms from form
    rooms.forEach((room) => {
      const roomNumber = room.room_number.trim();
      const seatCapacity = parseInt(room.seat_capacity) || 0;
      const seatCost = parseFloat(room.seat_cost) || 0;

      if (existingRoomsMap[roomNumber]) {
        // Room exists - check if it needs update
        const existing = existingRoomsMap[roomNumber];
        // Only update if values changed
        if (
          existing.seat_capacity !== seatCapacity ||
          existing.seat_cost !== seatCost
        ) {
          roomsToUpdate.push({
            id: existing.id,
            room_number: roomNumber,
            seat_capacity: seatCapacity,
            seat_cost: seatCost,
            is_occupied: existing.is_occupied, // Preserve occupancy
          });
        }
        // Remove from map to track which rooms are still present
        delete existingRoomsMap[roomNumber];
      } else {
        // New room - insert it
        roomsToInsert.push({
          property_id: propertyId,
          room_number: roomNumber,
          seat_capacity: seatCapacity,
          seat_cost: seatCost,
          is_occupied: false,
        });
      }
    });

    // Any rooms left in existingRoomsMap are rooms that were removed
    Object.values(existingRoomsMap).forEach((room) => {
      roomsToDelete.push(room.id);
    });

    // Execute operations
    if (roomsToDelete.length > 0) {
      await supabase.from("cottage_rooms").delete().in("id", roomsToDelete);
    }

    if (roomsToUpdate.length > 0) {
      // Update each room individually
      for (const room of roomsToUpdate) {
        await supabase
          .from("cottage_rooms")
          .update({
            room_number: room.room_number,
            seat_capacity: room.seat_capacity,
            seat_cost: room.seat_cost,
            is_occupied: room.is_occupied,
          })
          .eq("id", room.id);
      }
    }

    if (roomsToInsert.length > 0) {
      await supabase.from("cottage_rooms").insert(roomsToInsert);
    }
  }

  function addRoomRow() {
    setRooms([
      ...rooms,
      {
        // No ID field for new rooms
        room_number: String(rooms.length + 1),
        seat_capacity: 2,
        seat_cost: "",
      },
    ]);
  }

  function updateRoom(i, field, value) {
    const copy = [...rooms];
    copy[i][field] = value;
    setRooms(copy);
  }

  function removeRoom(i) {
    setRooms(rooms.filter((_, idx) => idx !== i));
  }

  function toggleFacility(name) {
    setSelectedFacilities((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name],
    );
  }

  function updateApartmentRoom(roomType, field, value) {
    setApartmentRooms((prev) => ({
      ...prev,
      [roomType]: {
        ...prev[roomType],
        [field]: field === "count" ? parseInt(value) || 0 : value,
      },
    }));
  }

  function toggleApartmentRoom(roomType) {
    setApartmentRooms((prev) => ({
      ...prev,
      [roomType]: {
        ...prev[roomType],
        included: !prev[roomType].included,
        count: !prev[roomType].included ? prev[roomType].count || 1 : 0,
      },
    }));
  }

  function toggleExpand(propertyId) {
    setExpandedProperty(expandedProperty === propertyId ? null : propertyId);
  }

  function clearFilters() {
    setSearchTerm("");
    setFilterType("all");
    setFilterCity("all");
    setFilterStatus("all");
  }

  function getStatusIconAndColor(status) {
    switch (status) {
      case "available":
        return { icon: CheckCircle, color: "#22c55e", bg: "#dcfce7" };
      case "occupied":
        return { icon: XCircle, color: "#ef4444", bg: "#fee2e2" };
      case "partial":
        return { icon: Clock, color: "#f59e0b", bg: "#fef3c7" };
      default:
        return { icon: Clock, color: "#9ca3af", bg: "#f3f4f6" };
    }
  }

  return (
    <div className="properties-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Properties</h2>
          <p className="subtitle">Manage your properties and rooms</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus size={20} />
          Add Property
        </button>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-bar">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search properties..."
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

        {(filterType !== "all" ||
          filterCity !== "all" ||
          filterStatus !== "all" ||
          searchTerm) && (
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
            <label>Property Type</label>
            <div className="filter-options">
              <button
                className={filterType === "all" ? "active" : ""}
                onClick={() => setFilterType("all")}
              >
                All
              </button>
              <button
                className={filterType === "apartment" ? "active" : ""}
                onClick={() => setFilterType("apartment")}
              >
                Apartments
              </button>
              <button
                className={filterType === "cottage" ? "active" : ""}
                onClick={() => setFilterType("cottage")}
              >
                Cottages
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label>City</label>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
            >
              <option value="all">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
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
                className={filterStatus === "available" ? "active" : ""}
                onClick={() => setFilterStatus("available")}
              >
                Available
              </button>
              <button
                className={filterStatus === "occupied" ? "active" : ""}
                onClick={() => setFilterStatus("occupied")}
              >
                Occupied
              </button>
              <button
                className={filterStatus === "partial" ? "active" : ""}
                onClick={() => setFilterStatus("partial")}
              >
                Partial
              </button>
            </div>
          </div>

          <div className="filter-stats">
            <span>{filteredProperties.length} properties found</span>
          </div>
        </div>
      )}

      {/* Property Cards */}
      {loading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading properties...</p>
        </div>
      ) : (
        <div className="properties-grid">
          {filteredProperties.map((p) => {
            const statusInfo = getStatusIconAndColor(p.availability?.status);
            const StatusIcon = statusInfo.icon;
            const occupancyPct =
              p.availability?.totalSeats > 0
                ? Math.round(
                    ((p.availability.totalSeats -
                      p.availability.availableSeats) /
                      p.availability.totalSeats) *
                      100,
                  )
                : 0;

            return (
              <div className="property-card" key={p.id}>
                <div className="property-card-header">
                  <div className="property-type-badge">
                    {p.property_type_id === 1 ? (
                      <Building2 size={16} />
                    ) : (
                      <Home size={16} />
                    )}
                    <span>
                      {p.property_type_id === 1 ? "Apartment" : "Cottage"}
                    </span>
                  </div>
                  <div
                    className="property-status"
                    style={{
                      backgroundColor: statusInfo.bg,
                      padding: "4px 12px",
                      borderRadius: "12px",
                      color: statusInfo.color,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <StatusIcon size={14} />
                    <span>{p.availability?.label || "Unknown"}</span>
                  </div>
                </div>

                <div className="property-card-body">
                  <h3 className="property-name">{p.name}</h3>
                  <div className="property-location">
                    <MapPin size={14} />
                    <span>
                      {p.address}
                      {p.city ? `, ${p.city}` : ""}
                    </span>
                  </div>

                  <div className="property-stats">
                    {p.property_type_id === 1 ? (
                      <>
                        <div className="stat-item">
                          <DollarSign size={14} />
                          <span>
                            ৳
                            {p.apartment_details?.monthly_rent?.toLocaleString()}
                            /mo
                          </span>
                        </div>
                        {p.apartment_details?.area_sqft && (
                          <div className="stat-item">
                            <span>{p.apartment_details.area_sqft} sqft</span>
                          </div>
                        )}
                        {p.apartment_rooms?.length > 0 && (
                          <div className="stat-item">
                            <Users size={14} />
                            <span>
                              {p.apartment_rooms.reduce(
                                (sum, r) => sum + r.count,
                                0,
                              )}{" "}
                              rooms
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="stat-item">
                          <Users size={14} />
                          <span>{p.cottage_rooms?.length || 0} rooms</span>
                        </div>
                        <div className="stat-item">
                          <span>
                            {p.cottage_rooms?.reduce(
                              (sum, r) => sum + r.seat_capacity,
                              0,
                            )}{" "}
                            seats
                          </span>
                        </div>
                        {p.cottage_rooms && p.cottage_rooms.length > 0 && (
                          <div className="stat-item">
                            <DollarSign size={14} />
                            <span>
                              From ৳
                              {Math.min(
                                ...p.cottage_rooms.map((r) => r.seat_cost),
                              )}
                            </span>
                          </div>
                        )}

                        {/* Seat occupancy progress bar */}
                        {p.availability?.totalSeats > 0 && (
                          <div className="seat-occupancy">
                            <div className="seat-occupancy-bar">
                              <div
                                className="seat-occupancy-fill"
                                style={{
                                  width: `${occupancyPct}%`,
                                  backgroundColor:
                                    occupancyPct >= 100
                                      ? "#ef4444"
                                      : occupancyPct > 0
                                        ? "#f59e0b"
                                        : "#22c55e",
                                }}
                              />
                            </div>
                            <span className="seat-occupancy-label">
                              {p.availability.availableSeats} of{" "}
                              {p.availability.totalSeats} seats available
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Facilities */}
                  {p.property_facilities?.length > 0 && (
                    <div className="facility-tags">
                      {p.property_facilities.slice(0, 5).map((pf) => {
                        const Icon = FACILITY_ICONS[pf.facilities?.name];
                        return (
                          <span key={pf.id} className="tag">
                            {Icon && <Icon size={12} />}
                            {pf.facilities?.name}
                          </span>
                        );
                      })}
                      {p.property_facilities.length > 5 && (
                        <span className="tag">
                          +{p.property_facilities.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded details */}
                  {expandedProperty === p.id && (
                    <div className="property-expanded">
                      {p.property_type_id === 1 ? (
                        <div className="room-details">
                          <strong>Room Details:</strong>
                          <div className="room-list">
                            {p.apartment_rooms?.map((ar) => (
                              <span key={ar.id} className="room-badge">
                                {ar.room_types?.name}: {ar.count}
                              </span>
                            ))}
                          </div>
                          {p.apartment_details?.security_deposit > 0 && (
                            <p style={{ marginTop: "8px" }}>
                              Security Deposit: ৳
                              {p.apartment_details.security_deposit}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="room-details">
                          <strong>Room Details:</strong>
                          <div className="cottage-room-list">
                            {p.cottage_rooms?.map((r) => {
                              const bookedSeats = (r.rentals || [])
                                .filter((x) => x.status_id === 1)
                                .reduce(
                                  (sum, x) => sum + (x.seats_booked || 0),
                                  0,
                                );

                              const availableSeats = Math.max(
                                (r.seat_capacity || 0) - bookedSeats,
                                0,
                              );

                              return (
                                <div key={r.id} className="cottage-room-item">
                                  <span>Room {r.room_number}</span>
                                  <span>
                                    {bookedSeats}/{r.seat_capacity} seats booked
                                  </span>
                                  <span>৳{r.seat_cost}/seat</span>
                                  <span
                                    className={`room-status ${
                                      availableSeats > 0
                                        ? "available"
                                        : "occupied"
                                    }`}
                                  >
                                    {availableSeats > 0
                                      ? `${availableSeats} available`
                                      : "Fully occupied"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="property-card-footer">
                  <button
                    className="btn-expand"
                    onClick={() => toggleExpand(p.id)}
                  >
                    {expandedProperty === p.id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                    {expandedProperty === p.id ? "Show Less" : "Show Details"}
                  </button>
                  <div className="property-actions">
                    <button className="btn-edit" onClick={() => handleEdit(p)}>
                      <Edit size={16} />
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProperties.length === 0 && (
            <div className="empty-state">
              <Home size={48} />
              <h3>No properties found</h3>
              <p>
                {searchTerm ||
                filterType !== "all" ||
                filterCity !== "all" ||
                filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first property to get started"}
              </p>
              {(searchTerm ||
                filterType !== "all" ||
                filterCity !== "all" ||
                filterStatus !== "all") && (
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
        title={editingProperty ? "Edit Property" : "Add New Property"}
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
              form="property-form"
            >
              {submitting
                ? "Saving..."
                : editingProperty
                  ? "Update Property"
                  : "Create Property"}
            </button>
          </>
        }
      >
        <form
          id="property-form"
          onSubmit={handleSubmit}
          className="property-form"
        >
          {error && <p className="error-text">{error}</p>}

          <div className="form-grid">
            <div className="form-section">
              <h4>Basic Information</h4>
              <div className="type-toggle">
                <button
                  type="button"
                  className={type === "apartment" ? "active" : ""}
                  onClick={() => setType("apartment")}
                  disabled={!!editingProperty}
                >
                  <Building2 size={16} />
                  Apartment
                </button>
                <button
                  type="button"
                  className={type === "cottage" ? "active" : ""}
                  onClick={() => setType("cottage")}
                  disabled={!!editingProperty}
                >
                  <Home size={16} />
                  Cottage
                </button>
              </div>

              <label>Property Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., Green Valley Apartments"
                className="customInput"
              />

              <label>Address *</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={3}
                placeholder="Street address"
                className="customInput"
              />

              <label>City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="customInput"
              />
            </div>

            <div className="form-section">
              <h4>Details</h4>
              {type === "apartment" ? (
                <>
                  <div className="grid-2">
                    <label>
                      Area (sqft)
                      <input
                        type="number"
                        min="0"
                        value={areaSqft}
                        onChange={(e) => setAreaSqft(e.target.value)}
                        placeholder="e.g., 1200"
                      />
                    </label>
                    <label>
                      Monthly Rent *
                      <input
                        type="number"
                        min="0"
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(e.target.value)}
                        required
                        placeholder="e.g., 15000"
                      />
                    </label>
                    <label>
                      Security Deposit
                      <input
                        type="number"
                        min="0"
                        value={securityDeposit}
                        onChange={(e) => setSecurityDeposit(e.target.value)}
                        placeholder="e.g., 30000"
                      />
                    </label>
                  </div>

                  <div className="apartment-rooms">
                    <label>Rooms</label>
                    <div className="apartment-rooms-grid">
                      {roomTypes.map((rt) => {
                        const roomName = rt.name;
                        const data = apartmentRooms[roomName] || {
                          count: 1,
                          included: true,
                        };
                        return (
                          <div key={rt.id} className="room-type-row">
                            <label className="room-type-checkbox">
                              <input
                                type="checkbox"
                                checked={data.included}
                                onChange={() => toggleApartmentRoom(roomName)}
                              />
                              <span className="room-type-label">
                                {roomName.replace(/_/g, " ")}
                              </span>
                            </label>
                            {data.included && (
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={data.count}
                                onChange={(e) =>
                                  updateApartmentRoom(
                                    roomName,
                                    "count",
                                    e.target.value,
                                  )
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="cottage-rooms">
                  <label>Rooms</label>
                  {rooms.map((room, i) => (
                    <div className="room-row" key={i}>
                      <input
                        placeholder="Room #"
                        value={room.room_number}
                        onChange={(e) =>
                          updateRoom(i, "room_number", e.target.value)
                        }
                        required
                      />
                      <input
                        type="number"
                        placeholder="Seats"
                        min="1"
                        value={room.seat_capacity}
                        onChange={(e) =>
                          updateRoom(i, "seat_capacity", e.target.value)
                        }
                        required
                      />
                      <input
                        type="number"
                        placeholder="Cost/seat"
                        min="0"
                        value={room.seat_cost}
                        onChange={(e) =>
                          updateRoom(i, "seat_cost", e.target.value)
                        }
                        required
                      />
                      {rooms.length > 1 && (
                        <button type="button" onClick={() => removeRoom(i)}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={addRoomRow}
                  >
                    + Add Room
                  </button>
                </div>
              )}

              <div className="facilities-section">
                <label>Facilities</label>
                <div className="facility-chips">
                  {allFacilities.map((f) => {
                    const Icon = FACILITY_ICONS[f.name];
                    return (
                      <button
                        key={f.id}
                        type="button"
                        className={`chip ${
                          selectedFacilities.includes(f.name)
                            ? "chip-active"
                            : ""
                        }`}
                        onClick={() => toggleFacility(f.name)}
                      >
                        {Icon && <Icon size={16} />}
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
