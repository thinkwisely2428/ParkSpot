import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const socket = io(BACKEND_URL);

let currentUser = null;
let authListeners = [];

function notifyAuthListeners() {
  authListeners.forEach(cb => cb(currentUser));
}

// Helper for fetch
async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  
  const res = await fetch(`${BACKEND_URL}/api/v1${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'API request failed');
  }
  
  return res.json();
}

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────
export async function firebaseLogin(email, password) {
  const data = await fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  const { token, user } = data.data;

  if (token) {
    localStorage.setItem('token', token);
  }
  
  // Transform backend user to frontend expected format
  const roleMap = { 'COMMUTER': 'user', 'OWNER': 'operator', 'ADMIN': 'admin' };
  
  currentUser = {
    id: user.id || user._id,
    email: user.email,
    name: user.name,
    role: roleMap[user.role] || user.role.toLowerCase(),
    avatar: user.name.substring(0, 2).toUpperCase()
  };
  
  notifyAuthListeners();
  return currentUser;
}

export function firebaseLogout() {
  localStorage.removeItem('token');
  currentUser = null;
  notifyAuthListeners();
}

export function onAuthChange(callback) {
  authListeners.push(callback);
  
  // Initially fetch user if token exists
  if (localStorage.getItem('token') && !currentUser) {
    fetchAPI('/auth/me')
      .then(data => {
        const roleMap = { 'COMMUTER': 'user', 'OWNER': 'operator', 'ADMIN': 'admin' };
        currentUser = {
          id: data.data._id,
          email: data.data.email,
          name: data.data.name,
          role: roleMap[data.data.role] || data.data.role.toLowerCase(),
          avatar: data.data.name.substring(0, 2).toUpperCase()
        };
        callback(currentUser);
      })
      .catch(() => {
        localStorage.removeItem('token');
        callback(null);
      });
  } else {
    callback(currentUser);
  }
  
  return () => {
    authListeners = authListeners.filter(cb => cb !== callback);
  };
}

// ─── SLOTS ────────────────────────────────────────────────────────────────────
export function subscribeToSlots(callback) {
  // Join the default parking room for real-time updates
  socket.emit('join_parking', 'DEFAULT_PARKING_ID');
  
  // Listen for socket updates
  socket.on('slot_updated', (updatedSlot) => {
    // You would typically refetch or update state here.
    // For simplicity, we just refetch all slots when one updates.
    fetchSlots(callback);
  });
  
  // Initial fetch
  fetchSlots(callback);
  
  return () => {
    socket.off('slot_updated');
  };
}

async function fetchSlots(callback) {
  try {
    // We assume backend has a /parking/:id/slots route
    // Note: You will need a real parking ID from your DB.
    const res = await fetchAPI('/parking/DEFAULT_PARKING_ID/slots').catch(() => ({ data: [] }));
    const slots = res.data || [];
    
    // Group by fid (Floor ID) as expected by the frontend
    const grouped = {};
    slots.forEach(s => {
      // Mapping backend slot to frontend shape
      const frontendSlot = {
        id: s._id,
        fid: s.floor || 'L1', // fallback
        row: s.row || 0,
        col: s.col || 0,
        type: (s.slotType === 'EV' || s.vehicleType?.toLowerCase() === 'ev') ? 'ev' : (s.slotType === 'ACCESSIBLE' ? 'accessible' : (s.slotType === 'PREMIUM' ? 'premium' : 'standard')),
        occupied: s.status === 'OCCUPIED',
        plate: s.currentVehiclePlate || null,
        owner: s.currentOwnerName || null,
        since: s.occupiedSince ? new Date(s.occupiedSince).getTime() : null,
        rate: s.pricePerHour || 30,
        bookingId: s.currentBookingId || null
      };
      
      if (!grouped[frontendSlot.fid]) grouped[frontendSlot.fid] = [];
      grouped[frontendSlot.fid].push(frontendSlot);
    });
    
    // If backend returned nothing, we can return empty grouped object
    callback(grouped);
  } catch (err) {
    console.error('Failed to fetch slots:', err);
    callback({});
  }
}

export async function updateSlot(slotId, data) {
  // If occupied becomes true -> holdSlot, else releaseSlot
  if (data.occupied) {
    await fetchAPI(`/slots/${slotId}/hold`, { method: 'POST' });
  } else {
    await fetchAPI(`/slots/${slotId}/release`, { method: 'POST' });
  }
}

export async function createBooking(bookingData) {
  // Mapping frontend bookingData to backend
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const startStr = d.toTimeString().slice(0, 5);
  const durationHours = bookingData.duration || 1;
  const dEnd = new Date(d.getTime() + durationHours * 3600000); // custom duration
  const endStr = dEnd.toTimeString().slice(0, 5);

  const payload = {
    parkingId: '60d0fe4f5311236168a109ca', // Dummy default Parking ID for demo
    slotId: bookingData.slotId,
    date: dateStr,
    startTime: startStr,
    endTime: endStr,
    amount: 100, // Default mock amount
    vehiclePlate: bookingData.plate,
    guestName: bookingData.name
  };

  const res = await fetchAPI('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.data;
}

export async function closeBooking(bookingId, feeData) {
  await fetchAPI(`/bookings/${bookingId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ paymentId: feeData.payment })
  });
}

export async function verifyQR(qrTokenId, actionType = 'ENTRY') {
  const res = await fetchAPI('/qr/verify', {
    method: 'POST',
    body: JSON.stringify({ qrTokenId, actionType })
  });
  return res.data;
}

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
export function subscribeToBookings(callback) {
  // Initial fetch
  fetchAPI('/bookings')
    .then(res => {
      const formattedBookings = (res.data || []).map(b => {
        // Find slot info if populated, else use defaults
        const slotInfo = b.slotId && typeof b.slotId === 'object' ? b.slotId : {};
        return {
          id: b.bookingNumber || b._id,
          plate: b.vehiclePlate || 'UNKNOWN',
          floor: slotInfo.floor || 'L1',
          slot: slotInfo.slotNumber || '---',
          vehicle: slotInfo.vehicleType || 'CAR',
          entry: new Date(`${b.date}T${b.startTime}`).getTime(),
          exit: b.status === 'COMPLETED' ? new Date(b.updatedAt).getTime() : null,
          status: b.status === 'CONFIRMED' || b.status === 'ACTIVE' ? 'active' : b.status.toLowerCase(),
          fee: b.amount,
          payment: b.paymentId,
          qrTokenId: b.qrTokenId,
          slotType: slotInfo.slotType || 'standard'
        };
      });
      callback(formattedBookings);
    })
    .catch(() => callback([]));
    
  // Listen for real-time updates on socket
  socket.on('slot_updated', () => {
    fetchAPI('/bookings')
      .then(res => {
        const formattedBookings = (res.data || []).map(b => {
          const slotInfo = b.slotId && typeof b.slotId === 'object' ? b.slotId : {};
          return {
            id: b.bookingNumber || b._id,
            plate: b.vehiclePlate || 'UNKNOWN',
            floor: slotInfo.floor || 'L1',
            slot: slotInfo.slotNumber || '---',
            vehicle: slotInfo.vehicleType || 'CAR',
            entry: new Date(`${b.date}T${b.startTime}`).getTime(),
            exit: b.status === 'COMPLETED' ? new Date(b.updatedAt).getTime() : null,
            status: b.status === 'CONFIRMED' || b.status === 'ACTIVE' ? 'active' : b.status.toLowerCase(),
            fee: b.amount,
            payment: b.paymentId,
            qrTokenId: b.qrTokenId,
            slotType: slotInfo.slotType || 'standard'
          };
        });
        callback(formattedBookings);
      })
      .catch(() => {});
  });

  return () => {
    socket.off('slot_updated');
  };
}

// ─── VEHICLES ─────────────────────────────────────────────────────────────────
export async function getVehicles() {
  const res = await fetchAPI('/bookings').catch(() => ({ data: [] }));
  const bookings = res.data || [];
  
  const vehiclesMap = {};
  bookings.forEach(b => {
    // Treat as a vehicle even if plate is somehow missing
    const plate = b.vehiclePlate || b.id || 'UNKNOWN';
    if (!vehiclesMap[plate]) {
      const slotInfo = b.slotId && typeof b.slotId === 'object' ? b.slotId : {};
      const userInfo = b.userId && typeof b.userId === 'object' ? b.userId : {};
      vehiclesMap[plate] = {
        id: plate,
        plate: plate,
        owner: userInfo.name || 'Unknown',
        type: slotInfo.vehicleType || 'CAR',
        added: new Date(b.createdAt).getTime(),
        status: 'Active',
        visits: 0,
        totalFee: 0,
        lastSeen: 0
      };
    }
    vehiclesMap[plate].visits += 1;
    vehiclesMap[plate].totalFee += (b.amount || 0);
    const visitTime = new Date(b.createdAt).getTime();
    if (visitTime > vehiclesMap[plate].lastSeen) {
      vehiclesMap[plate].lastSeen = visitTime;
    }
  });
  return Object.values(vehiclesMap);
}

// ─── REVENUE ──────────────────────────────────────────────────────────────────
export async function getRevenue() {
  // Use pseudo-random mock data to populate graphs since we don't have historical data
  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: rnd(8000, 28000),
      bookings: rnd(80, 320),
      vehicles: rnd(60, 280),
    });
  }
  return days;
}

export async function seedFirestoreIfEmpty() {
  // No longer using Firestore
  console.log('Skipping seedFirestoreIfEmpty (using custom backend)');
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export async function createRazorpayOrder(amount) {
  const res = await fetchAPI('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ amount })
  });
  return res.order;
}

export async function verifyRazorpaySignature(paymentData) {
  const res = await fetchAPI('/payments/verify-signature', {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
  return res.success;
}
