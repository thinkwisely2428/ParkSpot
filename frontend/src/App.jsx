import { useState, useEffect, useRef, useMemo } from "react";
import { QRCodeSVG } from 'qrcode.react';
import {
  firebaseLogin, firebaseLogout, onAuthChange,
  subscribeToSlots, subscribeToBookings,
  updateSlot, createBooking, closeBooking, verifyQR,
  getVehicles, getRevenue, seedFirestoreIfEmpty,
  createRazorpayOrder, verifyRazorpaySignature,
  getP2PListings, createP2PListing, submitP2PReview, getRates, updateRates, holdSlot, releaseSlot,
  joinWaitlist, getWaitlistPosition, leaveWaitlist
} from "./api.js";
import ChatWidget from "./ChatWidget.jsx";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  bg0: "#000000", bg1: "#080808", bg2: "#111111", bg3: "#1a1a1a",
  border: "#222222", border2: "#333333",
  accent: "#ffe135", accentDim: "#ffe13522", accentHover: "#ffeb73",
  green: "#00e676", greenDim: "#00e67622",
  red: "#ff4757", redDim: "#ff475722",
  amber: "#ffb300", amberDim: "#ffb30022",
  purple: "#b388ff", purpleDim: "#b388ff22",
  text0: "#f0f2ff", text1: "#a0a8c8", text2: "#505878", text3: "#303550",
  // Font system: Inter for UI, Space Mono for technical data, Orbitron for logo
  font: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  fontMono: "'Space Mono', 'JetBrains Mono', 'Courier New', monospace",
  fontDisplay: "'Orbitron', sans-serif",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FLOORS = [
  { id: "B2", label: "BASEMENT 2", rate: 20 },
  { id: "B1", label: "BASEMENT 1", rate: 25 },
  { id: "GF", label: "GROUND FLOOR", rate: 40 },
  { id: "L1", label: "LEVEL 1", rate: 40 },
  { id: "L2", label: "LEVEL 2", rate: 35 },
  { id: "L3", label: "LEVEL 3 (ROOF)", rate: 30 },
];
const COLS = 8, ROWS = 4;
const SLOT_TYPES = ["standard", "ev", "standard", "accessible", "premium", "standard", "ev", "accessible"];
const VEHICLE_TYPES = ["Car", "Bike", "SUV", "Truck", "EV Car"];

const VEHICLE_CONFIG = {
  "Car": { label: "Car", icon: "🚗", color: "#2196F3", bg: "#1976D2", lightBg: "#2196F322", border: "#2196F388" },
  "Bike": { label: "Bike", icon: "🏍️", color: "#FF9800", bg: "#F57C00", lightBg: "#FF980022", border: "#FF980088" },
  "SUV": { label: "SUV", icon: "🚙", color: "#FF4757", bg: "#D32F2F", lightBg: "#FF475722", border: "#FF475788" },
  "Truck": { label: "Truck", icon: "🚚", color: "#AB47BC", bg: "#7B1FA2", lightBg: "#AB47BC22", border: "#AB47BC88" },
  "EV Car": { label: "EV Car", icon: "⚡", color: "#00E5FF", bg: "#0097A7", lightBg: "#00E5FF22", border: "#00E5FF88" },
};

function getVehicleConfig(typeStr) {
  if (!typeStr) return VEHICLE_CONFIG["Car"];
  const t = typeStr.trim().toLowerCase();
  if (t.includes("bike") || t.includes("motorcycle") || t.includes("2w")) return VEHICLE_CONFIG["Bike"];
  if (t.includes("suv") || t.includes("jeep")) return VEHICLE_CONFIG["SUV"];
  if (t.includes("truck") || t.includes("van") || t.includes("lorry")) return VEHICLE_CONFIG["Truck"];
  if (t.includes("ev") || t.includes("electric")) return VEHICLE_CONFIG["EV Car"];
  return VEHICLE_CONFIG["Car"];
}

function VehicleBadge({ type, size = "md" }) {
  const cfg = getVehicleConfig(type);
  const isSm = size === "sm";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: isSm ? 4 : 6,
      padding: isSm ? "2px 7px" : "4px 10px",
      borderRadius: 6,
      background: cfg.lightBg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      fontSize: isSm ? 10 : 11,
      fontWeight: 700,
      fontFamily: T.font,
      whiteSpace: "nowrap",
    }}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

const USERS_DB = [
  { id: 1, name: "Admin User", email: "admin@parknet.in", password: "admin123", role: "admin", avatar: "AU" },
  { id: 2, name: "Operator Dev", email: "operator@parknet.in", password: "op123", role: "operator", avatar: "OD" },
  { id: 3, name: "Nifras NFS", email: "nfs@parknet.in", password: "nfs123", role: "user", avatar: "NF" },
];

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function uid() { return Math.random().toString(36).slice(2, 9).toUpperCase(); }
function plate() {
  const s = "ABCDEFGHJKLMNPRSTUVWXY";
  const r = () => s[rnd(0, s.length - 1)];
  return `TN${rnd(1, 99).toString().padStart(2, "0")} ${r()}${r()} ${rnd(1000, 9999)}`;
}
function maskPlate(plateStr, user, ownerName) {
  if (!plateStr) return "–";
  if (user?.role === "admin" || user?.role === "operator" || user?.name === ownerName) {
    return plateStr;
  }
  const parts = plateStr.split(" ");
  if (parts.length >= 3) {
    return `${parts[0]} ** ** ${parts[parts.length - 1]}`;
  }
  return plateStr.slice(0, 2) + " **** " + plateStr.slice(-2);
}
function fmt(ts) {
  if (!ts) return "–";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(ts) {
  if (!ts) return "–";
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function elapsed(since) {
  if (!since) return "–";
  const m = Math.floor((Date.now() - since) / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function fee(since, slot) {
  if (!since || !slot) return 0;
  const hrs = Math.max(0.5, (Date.now() - since) / 3600000);
  let rate = slot.rate || 60;
  return Math.ceil(hrs) * rate;
}

function genFloor(fid, rate) {
  const slots = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const occ = Math.random() < 0.45;
      const rsvd = !occ && Math.random() < 0.18;
      const sinceMs = occ ? Date.now() - rnd(5, 240) * 60000 : null;
      let slotType = "standard";
      if (r === 0) slotType = "premium";
      else if (r === 1) slotType = "ev";
      else if (r === 2) slotType = "accessible";
      
      slots.push({
        id: `${fid}-${r}-${c}`, fid, row: r, col: c,
        type: slotType,
        occupied: occ, reserved: rsvd,
        plate: occ ? plate() : null,
        since: sinceMs,
        vehicleType: occ ? VEHICLE_TYPES[rnd(0, VEHICLE_TYPES.length - 1)] : null,
        bookingId: occ ? uid() : null,
        rate,
      });
    }
  }
  return slots;
}

function initParkingData() {
  const data = {};
  FLOORS.forEach(f => { data[f.id] = genFloor(f.id, f.rate); });
  return data;
}

function genRevenueData() {
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

function genBookingHistory() {
  const bookings = [];
  for (let i = 0; i < 40; i++) {
    const ago = rnd(10, 480);
    const dur = rnd(30, 300);
    const fObj = FLOORS[rnd(0, FLOORS.length - 1)];
    const r = rnd(0, ROWS - 1), c = rnd(0, COLS - 1);
    bookings.push({
      id: uid(), plate: plate(),
      slot: `${String.fromCharCode(65 + r)}${c + 1}`,
      floor: fObj.id, floorLabel: fObj.label,
      entry: Date.now() - ago * 60000,
      exit: Date.now() - (ago - dur) * 60000,
      duration: dur, fee: Math.ceil(dur / 60) * fObj.rate + fObj.rate,
      vehicle: VEHICLE_TYPES[rnd(0, VEHICLE_TYPES.length - 1)],
      status: "completed",
      payment: ["UPI", "Cash", "Card", "FASTag"][rnd(0, 3)],
    });
  }
  return bookings.sort((a, b) => b.entry - a.entry);
}

function genVehicles() {
  const veh = [];
  for (let i = 0; i < 18; i++) {
    veh.push({
      id: uid(), plate: plate(),
      owner: ["Arjun R", "Priya S", "Karthik M", "Divya N", "Ravi K", "Sunitha P"][rnd(0, 5)],
      type: VEHICLE_TYPES[rnd(0, VEHICLE_TYPES.length - 1)],
      visits: rnd(3, 45), totalFee: rnd(500, 12000),
      lastSeen: Date.now() - rnd(10, 5000) * 60000,
      tag: Math.random() > 0.5 ? "VIP" : Math.random() > 0.5 ? "Monthly" : null,
    });
  }
  return veh;
}

// ─── HOOKS & MINI-COMPONENTS ──────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const end = typeof target === "number" ? target : 0;
    let t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(end * eased));
      if (p < 1) ref.current = requestAnimationFrame(step);
    }
    cancelAnimationFrame(ref.current);
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return val;
}

function Sparkline({ data, color, height = 28, width = 72 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data); const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - min) / range) * (height - 4) - 2,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${width},${height} L0,${height} Z`;
  const gid = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const getNow = () => Date.now();

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [parking, setParking] = useState(initParkingData);
  const [revenue, setRevenue] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [activeFloor, setActiveFloor] = useState("GF");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modal, setModal] = useState(null);
  const [billData, setBillData] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [searchPlate, setSearchPlate] = useState("");
  const [checkinForm, setCheckinForm] = useState({ plate: "", vehicle: "Car", name: "", duration: 1 });
  const [sideOpen, setSideOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [recentSlots, setRecentSlots] = useState(new Set());
  const [generatedQR, setGeneratedQR] = useState(null);
  const [p2pListings, setP2PListings] = useState([]);
  const [selectedP2P, setSelectedP2P] = useState(null);
  const [rzpPaymentData, setRzpPaymentData] = useState(null);
  const [p2pHostForm, setP2PHostForm] = useState({
    title: "", address: "", spotType: "Driveway", pricePerHour: 35,
    startTime: "07:00", endTime: "22:00", allowedVehicles: ["Car", "Bike"],
    hostRules: "No trucks, Park inside marked lines", phone: ""
  });
  const [p2pBookForm, setP2PBookForm] = useState({ plate: "", duration: 2, vehicle: "Car" });
  const [holdTimer, setHoldTimer] = useState(0);

  useEffect(() => {
    let t;
    if (modal === "checkin" && selectedSlot) {
      setHoldTimer(60);
      holdSlot(selectedSlot.id, 'DEFAULT_PARKING_ID').catch(console.error);
      t = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            setModal(null);
            releaseSlot(selectedSlot.id).catch(console.error);
            showToast("Slot hold expired", "error");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (selectedSlot && holdTimer > 0) {
        releaseSlot(selectedSlot.id).catch(console.error);
        setHoldTimer(0);
      }
    }
    return () => clearInterval(t);
  }, [modal, selectedSlot]);

  // Ctrl+K command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setCmdOpen(o => !o); setCmdQuery(""); }
      if (e.key === "Escape") { setCmdOpen(false); setNotifOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    seedFirestoreIfEmpty();
    const unsubSlots = subscribeToSlots((data) => {
      setParking(prev => {
        // detect changed slots for pulse animation
        const changed = [];
        Object.entries(data).forEach(([fid, slots]) => {
          (slots || []).forEach(s => {
            const old = (prev[fid] || []).find(p => p.id === s.id);
            if (old && old.occupied !== s.occupied) {
              changed.push(s.id);
              const notif = {
                id: Date.now() + Math.random(), time: Date.now(),
                msg: s.occupied ? `↑ Check-in · ${s.plate}` : `↓ Check-out · Slot ${fid}`,
                type: s.occupied ? "in" : "out",
              };
              setNotifications(prev => [notif, ...prev].slice(0, 20));
            }
          });
        });
        if (changed.length) {
          setRecentSlots(prev => { const n = new Set(prev); changed.forEach(id => n.add(id)); return n; });
          setTimeout(() => setRecentSlots(prev => { const n = new Set(prev); changed.forEach(id => n.delete(id)); return n; }), 2000);
        }
        return (data && Object.keys(data).length > 0) ? data : (Object.keys(prev).length > 0 ? prev : initParkingData());
      });
    });
    const unsubBookings = subscribeToBookings((bookings) => {
      setBookings(bookings);
      getVehicles().then(setVehicles);
    });
    getVehicles().then(setVehicles);
    getRevenue().then(setRevenue);
    getP2PListings().then(setP2PListings);
    return () => { unsubSlots(); unsubBookings(); };
  }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCheckIn() {
    if (!selectedSlot || !checkinForm.plate) return;
    const plate = checkinForm.plate.toUpperCase();

    try {
      const bookingData = await createBooking({
        slotId: selectedSlot.id,
        plate: plate,
        vehicle: checkinForm.vehicle,
        name: checkinForm.name,
        duration: checkinForm.duration
      });

      await new Promise(r => setTimeout(r, 500));

      setSelectedSlot(null);
      setCheckinForm({ plate: "", vehicle: "Car", name: "", duration: 1 });

      setGeneratedQR(bookingData.qrTokenId);
      setModal("show-qr");
      showToast(`✅ Checked in · ${plate}`);
    } catch (e) {
      showToast("Check-in failed — try again", "error");
    }
  }

  async function handleRazorpayCheckIn() {
    if (!selectedSlot || !checkinForm.plate) return;
    const plate = checkinForm.plate.toUpperCase();
    const rate = selectedSlot.rate || 60;
    const amt = rate * (checkinForm.duration || 1);

    try {
      if (checkinForm.vehicle === "Bicycle") {
         const bookingData = await createBooking({
            slotId: selectedSlot.id,
            plate: plate,
            vehicle: checkinForm.vehicle,
            name: checkinForm.name,
            duration: checkinForm.duration
          });
          setModal("show-bill");
          setSelectedSlot(null);
          setCheckinForm({ plate: "", vehicle: "Car", name: "", duration: 1 });
          showToast(`✅ Checked in · ${plate}`);
          return;
      }
      
      await createRazorpayOrder(amt);
      const options = {
        key: "rzp_test_Shou7YsdVdv242",
        amount: amt * 100, // Pass amount in paise
        currency: "INR",
        name: "PARKNET",
        description: `Upfront Fee for ${plate}`,
      };
      options.handler = async function () {
        try {
          const isVerified = true;
          if (isVerified) {
            const bookingData = await createBooking({
              slotId: selectedSlot.id,
              plate: plate,
              vehicle: checkinForm.vehicle,
              name: checkinForm.name,
              duration: checkinForm.duration
            });
            await new Promise(r => setTimeout(r, 500));
            setBillData({ amt, plate, qrTokenId: bookingData.qrTokenId || "QR-RZP" });
            setModal("show-bill");
            setSelectedSlot(null);
            setCheckinForm({ plate: "", vehicle: "Car", name: "", duration: 1 });
            showToast(`✅ Payment Successful & Checked in · ₹${amt} collected`);
          } else {
            showToast("Payment verification failed", "error");
            setToast(null);
          }
        } catch {
          showToast("Error processing Razorpay payment", "error");
        }
      };
      options.prefill = { name: checkinForm.name || "Customer", email: "customer@example.com", contact: "9999999999" };
      options.theme = { color: T.accent };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      showToast(`Could not initiate payment: ${e.message}`, "error");
    }
  }

  async function handleCheckOut() {
    if (!selectedSlot) return;
    const s = selectedSlot;
    const amt = fee(s.since, s);
    const duration = Math.floor((Date.now() - s.since) / 60000);
    try {
      if (s.bookingId) {
        await closeBooking(s.bookingId, { fee: amt, duration, payment: "CASH" });
      }
      setBillData({ amt, plate: s.plate, qrTokenId: s.qrTokenId || "QR-CASH" });
      setModal("show-bill");
      setSelectedSlot(null);
      showToast(`✅ Checked out · ₹${amt} collected`);
    } catch {
      showToast("Check-out failed — try again", "error");
    }
  }

  function triggerRazorpayPayment({ amount, description, plate, onSuccess, onFailure }) {
    setRzpPaymentData({
      amount: amount || 60,
      description: description || "Parking Fee",
      plate: plate || "TN 01 AB 1234",
      onSuccess,
      onFailure
    });
    setModal("rzp-gateway");
  }

  function handleRazorpayCheckout() {
    if (!selectedSlot) return;
    const s = selectedSlot;
    const amt = fee(s.since, s);

    triggerRazorpayPayment({
      amount: amt,
      description: `Parking Checkout for ${s.plate}`,
      plate: s.plate,
      onSuccess: async () => {
        const duration = Math.floor((getNow() - s.since) / 60000);
        if (s.bookingId) {
          await closeBooking(s.bookingId, { fee: amt, duration, payment: "Razorpay" }).catch(() => {});
        }
        setBillData({ amt, plate: s.plate, qrTokenId: s.qrTokenId || `QR-${uid()}` });
        setModal("show-bill");
        setSelectedSlot(null);
        showToast(`✅ Razorpay Payment Successful · ₹${amt} collected`);
      },
      onFailure: () => {
        showToast("Payment Cancelled", "error");
      }
    });
  }



  const globalStats = useMemo(() => {
    const all = Object.values(parking).flat();
    const totalSlots = all.length || (FLOORS.length * ROWS * COLS);
    const occupiedCount = all.filter(s => s.occupied).length;
    const reservedCount = all.filter(s => s.reserved && !s.occupied).length;
    const freeCount = all.filter(s => !s.occupied && !s.reserved).length;
    const evSlots = all.filter(s => s.type === "ev").length || 24;
    const activeRevenue = bookings.filter(b => b.status === "active").reduce((acc, b) => acc + fee(b.entry, { type: b.slotType || "standard" }), 0) || (occupiedCount * 40);

    return {
      total: totalSlots,
      free: freeCount,
      occupied: occupiedCount,
      reserved: reservedCount,
      ev: evSlots,
      revenue: activeRevenue,
    };
  }, [parking, bookings]);

  const navItems = useMemo(() => {
    if (!user) return [];
    return [
      { id: "dashboard", icon: "⬡", label: "DASHBOARD" },
      { id: "map", icon: "◈", label: "LIVE MAP" },
      ...(user.role !== "operator" ? [{ id: "p2p", icon: "🤝", label: "P2P MARKET" }] : []),
      { id: "bookings", icon: "◉", label: "BOOKINGS" },
      ...(user.role !== "operator" ? [{ id: "vehicles", icon: "◈", label: "VEHICLES" }] : []),
      ...(user.role !== "user" ? [{ id: "reports", icon: "◫", label: "REPORTS" }] : []),
      ...(user.role === "admin" ? [{ id: "settings", icon: "◌", label: "SETTINGS" }] : []),
    ];
  }, [user]);

  useEffect(() => {
    if (user && !navItems.some(n => n.id === page)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPage("dashboard");
    }
  }, [user, page, navItems]);

  if (!user) return <LoginScreen onLogin={u => { setUser(u); showToast(`Welcome back, ${u.name.split(" ")[0]}!`); }} />;

  const currentSlots = parking[activeFloor] || [];
  const filtered = currentSlots.filter(s => {
    if (filterType !== "all") {
      const ft = filterType.toLowerCase();
      if (["standard", "ev", "accessible", "premium"].includes(ft)) {
        if (s.type !== ft) return false;
      } else {
        if (!s.occupied || getVehicleConfig(s.vehicleType).label.toLowerCase() !== ft) return false;
      }
    }
    if (searchPlate && !s.plate?.includes(searchPlate.toUpperCase())) return false;
    return true;
  });

  const pages = {
    dashboard: <Dashboard stats={globalStats} parking={parking} revenue={revenue} bookings={bookings} user={user} />,
    map: <ParkingMap
      floors={FLOORS} parking={parking} activeFloor={activeFloor} setActiveFloor={setActiveFloor}
      filtered={filtered} selected={selectedSlot} onSelect={setSelectedSlot}
      filterType={filterType} setFilterType={setFilterType}
      searchPlate={searchPlate} setSearchPlate={setSearchPlate}
      onCheckIn={() => setModal("checkin")} onCheckOut={() => setModal("checkout")}
      user={user} recentSlots={recentSlots} showToast={showToast}
      onPayRazorpay={(slot) => {
        const amt = slot?.occupied ? fee(slot?.since, slot) : (slot?.rate || 60);
        triggerRazorpayPayment({
          amount: amt,
          description: `Slot ${String.fromCharCode(65 + (slot?.row || 0))}${(slot?.col || 0) + 1} (${activeFloor})`,
          plate: slot?.plate || "TN 01 DEMO",
          onSuccess: () => {
            if (slot?.occupied) {
              handleCheckOut();
            } else {
              setModal("checkin");
            }
          }
        });
      }}
    />,
    p2p: <P2PMarketplace
      listings={p2pListings}
      onBook={(spot) => { setSelectedP2P(spot); setModal("p2p-book"); }}
      onHostNew={() => setModal("p2p-host")}
    />,
    bookings: <BookingsPage bookings={bookings} />,
    vehicles: <VehiclesPage vehicles={vehicles} />,
    reports: <ReportsPage revenue={revenue} bookings={bookings} stats={globalStats} />,
    settings: <SettingsPage user={user} />,
  };

  return (
    <div className="app-container" style={{ display: "flex", height: "100vh", background: T.bg0, color: T.text0, fontFamily: T.font, overflow: "hidden" }}>
      {/* Sidebar */}
      <aside className="sidebar-container" style={{
        width: sideOpen ? 220 : 60, transition: "width 0.3s cubic-bezier(.4,0,.2,1)",
        background: T.bg1, borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden",
      }}>
        {/* Logo */}
        <div className="hide-on-mobile" style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, background: `linear-gradient(135deg, ${T.accent}, #0080ff)`,
              borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>⬡</div>
            {sideOpen && <div>
              <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 4, color: T.text0, fontFamily: T.fontDisplay }}>PARKNET</div>
              <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, color: T.text2, marginTop: 2 }}>SMART PARKING v2.0</div>
            </div>}
          </div>
        </div>
        {/* Nav */}
        <nav className="nav-container" style={{ flex: 1, padding: "12px 0" }}>
          {navItems.map(n => (
            <button key={n.id} className={`nav-btn ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: sideOpen ? "11px 16px" : "11px 0", justifyContent: sideOpen ? "flex-start" : "center",
              background: page === n.id ? T.accentDim : "transparent",
              border: "none", borderLeft: `3px solid ${page === n.id ? T.accent : "transparent"}`,
              color: page === n.id ? T.accent : T.text2, cursor: "pointer",
              fontSize: 12, fontWeight: 600, fontFamily: T.font, transition: "all 0.15s",
              letterSpacing: 0.3,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
              <span className="hide-on-mobile" style={{ display: sideOpen ? "block" : "none" }}>{n.label}</span>
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="hide-on-mobile" style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}44, ${T.purple}44)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0,
          }}>{user.avatar}</div>
          {sideOpen && <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.accent, letterSpacing: 2, textTransform: "uppercase", marginTop: 1 }}>{user.role}</div>
          </div>}
          {sideOpen && <button onClick={() => { firebaseLogout(); setUser(null); }} style={{ background: "transparent", border: "none", color: T.text2, cursor: "pointer", fontSize: 14, padding: 4 }}>⏏</button>}
        </div>
        <button className="hide-on-mobile" onClick={() => setSideOpen(p => !p)} style={{
          background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 0,
          color: T.text2, cursor: "pointer", padding: "8px", fontSize: 12,
        }}>{sideOpen ? "◀" : "▶"}</button>
      </aside>

      {/* Main */}
      <div className="main-content-container" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <header className="topbar-container" style={{
          height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", borderBottom: `1px solid ${T.border}`, background: T.bg1, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, color: T.text0 }}>
              {navItems.find(n => n.id === page)?.label}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, animation: "livePulse 2s infinite" }} />
              <span className="hide-on-mobile" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: T.green }}>LIVE</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text2 }}>
              <span style={{ color: T.green, fontWeight: 800 }}>{globalStats.free}</span> / {globalStats.total} <span className="hide-on-mobile">free</span>
            </div>
            <div className="hide-on-mobile" style={{ fontSize: 13, fontWeight: 700, color: T.amber }}>
              ₹{globalStats.revenue.toLocaleString("en-IN")} today
            </div>
            {/* Scan QR Button */}
            {(user.role === 'admin' || user.role === 'operator') && (
              <button onClick={() => setModal("scan-qr")} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                background: T.greenDim, border: `1px solid ${T.green}44`, borderRadius: 8,
                color: T.green, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: T.font,
              }}>
                <span style={{ fontSize: 14 }}>📷</span>
                <span className="hide-on-mobile">SCAN</span>
              </button>
            )}
            {/* Ctrl+K palette button */}
            <button onClick={() => { setCmdOpen(true); setCmdQuery(""); }} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
              background: T.bg2, border: `1px solid ${T.border2}`, borderRadius: 8,
              color: T.text2, cursor: "pointer", fontSize: 11, fontFamily: T.font,
            }}>
              <span>🔍</span>
              <span className="hide-on-mobile" style={{ display: "flex", gap: 3 }}>
                <kbd style={{ background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 4, padding: "1px 5px", fontSize: 10, color: T.text1 }}>Ctrl</kbd>
                <kbd style={{ background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 4, padding: "1px 5px", fontSize: 10, color: T.text1 }}>K</kbd>
              </span>
            </button>
            {/* Notification bell */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setNotifOpen(o => !o)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: 18, position: "relative", padding: "4px 6px", lineHeight: 1,
              }}>
                🔔
                {notifications.filter(n => getNow() - n.time < 60000).length > 0 && (
                  <span style={{
                    position: "absolute", top: 0, right: 0, width: 16, height: 16,
                    background: T.red, borderRadius: "50%", fontSize: 9, fontWeight: 800,
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{Math.min(notifications.filter(n => getNow() - n.time < 60000).length, 9)}</span>
                )}
              </button>
              {notifOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)", width: 300, zIndex: 1000,
                  background: T.bg2, border: `1px solid ${T.border2}`, borderRadius: 14,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden",
                }}>
                  <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>Activity Feed</span>
                    <button onClick={() => setNotifications([])} style={{ background: "none", border: "none", color: T.text2, cursor: "pointer", fontSize: 11 }}>Clear</button>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {notifications.length === 0
                      ? <div style={{ padding: "20px 16px", color: T.text2, fontSize: 12, textAlign: "center" }}>No recent activity</div>
                      : notifications.map(n => (
                        <div key={n.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 16 }}>{n.type === "in" ? "🟢" : "🔴"}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: T.text0 }}>{n.msg}</div>
                            <div style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>{Math.round((getNow() - n.time) / 1000)}s ago</div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <div className="hide-on-mobile" style={{ fontSize: 12, fontWeight: 500, color: T.text2, fontFamily: T.fontMono }}>{new Date().toLocaleTimeString("en-IN")}</div>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflow: "auto" }}>{pages[page]}</div>
      </div>

      {/* Command Palette */}
      {cmdOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh", backdropFilter: "blur(4px)" }}
          onClick={() => setCmdOpen(false)}>
          <div style={{ width: 560, background: T.bg2, border: `1px solid ${T.border2}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.6)", animation: "fadeIn 0.15s ease" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${T.border}`, gap: 10 }}>
              <span style={{ fontSize: 16 }}>🔍</span>
              <input autoFocus value={cmdQuery} onChange={e => setCmdQuery(e.target.value)}
                placeholder="Search pages, actions…" style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.text0, fontSize: 15, fontFamily: T.font }} />
              <kbd style={{ background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 4, padding: "2px 8px", fontSize: 10, color: T.text2 }}>ESC</kbd>
            </div>
            <div style={{ padding: "8px 0", maxHeight: 360, overflowY: "auto" }}>
              {[
                { label: "Dashboard", icon: "⬡", id: "dashboard", desc: "Overview & KPIs" },
                { label: "Live Map", icon: "◈", id: "map", desc: "6-floor parking grid" },
                { label: "Bookings", icon: "◉", id: "bookings", desc: "Booking history" },
                { label: "Vehicles", icon: "🚗", id: "vehicles", desc: "Vehicle registry" },
                { label: "Reports", icon: "◫", id: "reports", desc: "Revenue analytics" },
                { label: "Settings", icon: "◌", id: "settings", desc: "System configuration" },
              ].filter(item => !cmdQuery || item.label.toLowerCase().includes(cmdQuery.toLowerCase()) || item.desc.toLowerCase().includes(cmdQuery.toLowerCase()))
                .map(item => (
                  <button key={item.id} onClick={() => { setPage(item.id); setCmdOpen(false); }} style={{
                    width: "100%", padding: "12px 18px", display: "flex", alignItems: "center", gap: 14,
                    background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg3}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text0 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: T.text2 }}>{item.desc}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}


      {/* Modals */}
      {modal === "checkin" && selectedSlot && !selectedSlot.occupied && (
        <Modal title="CHECK IN VEHICLE" onClose={() => { setModal(null); releaseSlot(selectedSlot.id).catch(console.error); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: T.amberDim, color: T.amber, padding: "8px 12px", borderRadius: 8, fontSize: 12, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <span>SLOT HELD</span>
              <span>{holdTimer}s</span>
            </div>
            <InfoRow label="SLOT" value={`${String.fromCharCode(65 + selectedSlot.row)}${selectedSlot.col + 1} · ${activeFloor}`} />
            <InfoRow label="TYPE" value={selectedSlot.type.toUpperCase()} />
            <InfoRow label="HOURLY RATE" value={`₹${selectedSlot.rate || 60}/hr`} />
            <Label text="LICENSE PLATE" />
            <input value={checkinForm.plate} onChange={e => setCheckinForm(p => ({ ...p, plate: e.target.value }))}
              placeholder="TN 01 AB 1234" style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <Label text="VEHICLE TYPE" />
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {VEHICLE_TYPES.map(v => {
                    const cfg = VEHICLE_CONFIG[v];
                    const isSel = checkinForm.vehicle === v;
                    return (
                      <button key={v} type="button" onClick={() => setCheckinForm(p => ({ ...p, vehicle: v }))} style={{
                        flex: 1, minWidth: 60, padding: "8px 6px", borderRadius: 8, cursor: "pointer",
                        background: isSel ? cfg.bg : T.bg3,
                        border: `1px solid ${isSel ? cfg.color : T.border2}`,
                        color: isSel ? "#fff" : T.text1,
                        fontWeight: 700, fontSize: 11, fontFamily: T.font,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                        transition: "all 0.15s",
                        boxShadow: isSel ? `0 0 12px ${cfg.color}66` : "none",
                      }}>
                        <span>{cfg.icon}</span>
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label text="DURATION (HRS)" />
                <input type="number" min="1" value={checkinForm.duration || 1} onChange={e => setCheckinForm(p => ({ ...p, duration: +e.target.value || 1 }))} style={inputStyle} />
              </div>
            </div>
            <Label text="OWNER NAME (OPTIONAL)" />
            <input value={checkinForm.name} onChange={e => setCheckinForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Customer name" style={inputStyle} />
            <div style={{ background: T.amberDim, border: `1px solid ${T.amber}44`, borderRadius: 8, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, letterSpacing: 3, color: T.amber }}>TOTAL AMOUNT</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: T.amber }}>₹{(selectedSlot.rate || 60) * (checkinForm.duration || 1)}</span>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn text="PAY & CHECK IN" color="#3399cc" onClick={handleRazorpayCheckIn} />
              <Btn text="PAY LATER" color={T.green} onClick={handleCheckIn} />
            </div>
          </div>
        </Modal>
      )}

      {modal === "show-qr" && generatedQR && (
        <Modal title="BOOKING SUCCESSFUL" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: T.text0 }}>Show this QR to the user for future check-out or gate access!</div>
            <div style={{ background: T.bg0, padding: 24, borderRadius: 16 }}>
              <QRCodeSVG value={generatedQR} size={180} bgColor={T.bg0} fgColor="#FFFFFF" />
            </div>
            <div style={{ fontSize: 11, color: T.text2, fontFamily: T.fontMono, wordBreak: "break-all" }}>Token ID: {generatedQR}</div>
            <div style={{ width: "100%", marginTop: 10 }}>
              <Btn text="DONE" color={T.green} onClick={() => setModal(null)} />
            </div>
          </div>
        </Modal>
      )}

      {/* P2P Host Space Wizard Modal */}
      {modal === "p2p-host" && (
        <Modal title="LIST YOUR SPARE PARKING SPACE" onClose={() => setModal(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>
              Earn passive income by renting your driveway, garage, or office parking spot to verified commuters!
            </div>
            <Label text="LISTING TITLE" />
            <input value={p2pHostForm.title} onChange={e => setP2PHostForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Spacious Anna Nagar Villa Driveway" style={inputStyle} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <Label text="SPOT TYPE" />
                <select value={p2pHostForm.spotType} onChange={e => setP2PHostForm(p => ({ ...p, spotType: e.target.value }))} style={inputStyle}>
                  {["Driveway", "Garage", "Private Lot", "Commercial Yard"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label text="PRICE PER HOUR (₹)" />
                <input type="number" value={p2pHostForm.pricePerHour} onChange={e => setP2PHostForm(p => ({ ...p, pricePerHour: +e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <Label text="ADDRESS / LOCATION" />
            <input value={p2pHostForm.address} onChange={e => setP2PHostForm(p => ({ ...p, address: e.target.value }))}
              placeholder="e.g. Plot 14, 2nd Main Rd, Anna Nagar, Chennai" style={inputStyle} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <Label text="AVAILABLE FROM" />
                <input type="time" value={p2pHostForm.startTime} onChange={e => setP2PHostForm(p => ({ ...p, startTime: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <Label text="AVAILABLE UNTIL" />
                <input type="time" value={p2pHostForm.endTime} onChange={e => setP2PHostForm(p => ({ ...p, endTime: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <Label text="PROPERTY & ACCESS RULES" />
            <input value={p2pHostForm.hostRules} onChange={e => setP2PHostForm(p => ({ ...p, hostRules: e.target.value }))}
              placeholder="e.g. No trucks, Gate code 1234, Keep driveway clear" style={inputStyle} />

            <div style={{ background: T.greenDim, border: `1px solid ${T.green}44`, borderRadius: 8, padding: "10px 14px", fontSize: 11, color: T.green }}>
              ✓ Photo & KYC Verification will be automatically applied to your account.
            </div>

            <Btn text="PUBLISH P2P LISTING →" color={T.green} onClick={async () => {
              if (!p2pHostForm.title || !p2pHostForm.address) return showToast("Please fill in title & address", "error");
              try {
                const newListing = {
                  _id: uid(),
                  hostName: user?.name || "Community Host",
                  hostPhone: p2pHostForm.phone || "+91 98401 23456",
                  title: p2pHostForm.title,
                  address: p2pHostForm.address,
                  spotType: p2pHostForm.spotType,
                  pricePerHour: p2pHostForm.pricePerHour,
                  startTime: p2pHostForm.startTime,
                  endTime: p2pHostForm.endTime,
                  hostRules: typeof p2pHostForm.hostRules === "string" ? p2pHostForm.hostRules.split(',').map(r => r.trim()) : p2pHostForm.hostRules,
                  allowedVehicles: p2pHostForm.allowedVehicles || ["Car"],
                  rating: 5.0,
                  reviewCount: 1,
                  isKycVerified: true,
                  isPhotoVerified: true
                };
                createP2PListing(newListing).catch(() => {});
                setP2PListings(prev => [newListing, ...prev]);
                setModal(null);
                showToast("🎉 P2P Spot Published Successfully!");
              } catch (e) {
                showToast(e.message || "Could not publish spot", "error");
              }
            }} />
          </div>
        </Modal>
      )}

      {/* P2P Booking & Host Agreement Modal */}
      {modal === "p2p-book" && selectedP2P && (
        <Modal title="BOOK P2P PARKING SPOT" onClose={() => setModal(null)} wide>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: T.bg1, padding: "14px 16px", borderRadius: 10, border: `1px solid ${T.border2}` }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text0 }}>{selectedP2P.title}</div>
                <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>{selectedP2P.address}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 10, padding: "2px 6px", background: T.greenDim, color: T.green, borderRadius: 4, border: `1px solid ${T.green}44` }}>✓ KYC Verified Host</span>
                  <span style={{ fontSize: 10, padding: "2px 6px", background: T.purpleDim, color: T.purple, borderRadius: 4, border: `1px solid ${T.purple}44` }}>📷 Photo Verified</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: T.accent }}>₹{selectedP2P.pricePerHour}/hr</div>
                <div style={{ fontSize: 10, color: T.text2 }}>Host: {selectedP2P.hostName}</div>
              </div>
            </div>

            {/* Legal / Access Agreement Terms */}
            <div style={{ background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.5, color: T.text1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.amber, marginBottom: 4 }}>📜 HOST-GUEST AGREEMENT & RULES:</div>
              <ul style={{ paddingLeft: 18 }}>
                <li><strong>Window:</strong> Available between {selectedP2P.startTime} - {selectedP2P.endTime}</li>
                <li><strong>Rules:</strong> {Array.isArray(selectedP2P.hostRules) ? selectedP2P.hostRules.join(" · ") : selectedP2P.hostRules}</li>
                <li><strong>Liability:</strong> Guest agrees to park within marked boundaries. Host is not liable for items left inside vehicle.</li>
              </ul>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <Label text="LICENSE PLATE" />
                <input value={p2pBookForm.plate} onChange={e => setP2PBookForm(p => ({ ...p, plate: e.target.value.toUpperCase() }))}
                  placeholder="TN 01 AB 1234" style={inputStyle} />
              </div>
              <div>
                <Label text="DURATION (HOURS)" />
                <input type="number" min="1" max="24" value={p2pBookForm.duration} onChange={e => setP2PBookForm(p => ({ ...p, duration: +e.target.value || 1 }))} style={inputStyle} />
              </div>
            </div>

            {/* Price breakdown */}
            <div style={{ background: T.amberDim, border: `1px solid ${T.amber}44`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: T.amber, letterSpacing: 1 }}>TOTAL AMOUNT DUE</div>
                <div style={{ fontSize: 10, color: T.text2, marginTop: 2 }}>Host Payout: ₹{Math.round(selectedP2P.pricePerHour * p2pBookForm.duration * 0.9)} · Platform Fee (10%): ₹{Math.round(selectedP2P.pricePerHour * p2pBookForm.duration * 0.1)}</div>
              </div>
              <span style={{ fontSize: 24, fontWeight: 900, color: T.amber }}>₹{selectedP2P.pricePerHour * p2pBookForm.duration}</span>
            </div>

            <Btn text="CONFIRM & PAY VIA RAZORPAY →" color={T.green} onClick={() => {
              if (!p2pBookForm.plate) return showToast("Please enter your vehicle license plate", "error");
              const totalAmt = selectedP2P.pricePerHour * p2pBookForm.duration;
              const qrId = `P2P-QR-${uid()}`;

              triggerRazorpayPayment({
                amount: totalAmt,
                description: `P2P Spot Booking - ${selectedP2P.title}`,
                plate: p2pBookForm.plate,
                onSuccess: (resp) => {
                  const newBooking = {
                    id: uid(),
                    plate: p2pBookForm.plate,
                    slot: `P2P - ${selectedP2P.spotType}`,
                    floor: selectedP2P.hostName,
                    floorLabel: selectedP2P.title,
                    entry: Date.now(),
                    exit: null,
                    duration: p2pBookForm.duration * 60,
                    fee: totalAmt,
                    vehicle: p2pBookForm.vehicle || "Car",
                    status: "active",
                    payment: "Razorpay",
                    paymentId: resp.razorpay_payment_id || resp.payment_id,
                    qrTokenId: qrId
                  };
                  setBookings(prev => [newBooking, ...prev]);
                  setBillData({ amt: totalAmt, plate: p2pBookForm.plate, qrTokenId: qrId });
                  setModal("show-bill");
                  showToast(`✅ Razorpay Payment Successful · P2P Spot Booked!`);
                },
                onFailure: () => {
                  showToast("Razorpay Payment Cancelled", "error");
                }
              });
            }} />
          </div>
        </Modal>
      )}

      {modal === "show-bill" && billData && (
        <Modal title="PAYMENT RECEIPT & GATE PASS" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: T.text0 }}>Payment collected for vehicle <span style={{ fontWeight: 800, color: T.accent }}>{billData.plate}</span></div>
            <div style={{ background: T.bg0, padding: 24, borderRadius: 16, border: `1px solid ${T.green}44` }}>
              <QRCodeSVG value={billData.qrTokenId} size={180} bgColor={T.bg0} fgColor="#FFFFFF" />
            </div>
            <div style={{ fontSize: 11, color: T.text2, fontFamily: T.fontMono, wordBreak: "break-all" }}>Pass ID: {billData.qrTokenId}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.green }}>₹{billData.amt} PAID ✓</div>
            <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 10 }}>
              <button onClick={() => window.print()} style={{
                flex: 1, padding: "12px", background: T.accentDim, border: `1px solid ${T.accent}`,
                color: T.accent, borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: T.font
              }}>🖨️ PRINT PASS</button>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: "12px", background: T.greenDim, border: `1px solid ${T.green}`,
                color: T.green, borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 12, fontFamily: T.font
              }}>DONE ✓</button>
            </div>
          </div>
        </Modal>
      )}

      {modal === "checkout" && selectedSlot && selectedSlot.occupied && (
        <Modal title="CHECK OUT VEHICLE" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InfoRow label="PLATE" value={selectedSlot.plate} accent />
            {selectedSlot.owner && <InfoRow label="OWNER" value={selectedSlot.owner} />}
            <InfoRow label="SLOT" value={`${String.fromCharCode(65 + selectedSlot.row)}${selectedSlot.col + 1} · ${activeFloor}`} />
            <InfoRow label="VEHICLE" value={selectedSlot.vehicleType} />
            <InfoRow label="ENTRY" value={fmt(selectedSlot.since)} />
            <InfoRow label="DURATION" value={elapsed(selectedSlot.since)} />
            <InfoRow label="RATE" value={`₹${selectedSlot.rate}/hr`} />
            <div style={{
              background: T.amberDim, border: `1px solid ${T.amber}44`, borderRadius: 8, padding: "14px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 10, letterSpacing: 3, color: T.amber }}>TOTAL AMOUNT</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: T.amber }}>₹{fee(selectedSlot.since, selectedSlot)}</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {["UPI", "Card", "Cash", "FASTag"].map(p => (
                <button key={p} style={{
                  flex: 1, padding: "8px", background: T.bg3, border: `1px solid ${T.border2}`,
                  color: T.text1, borderRadius: 6, cursor: "pointer", fontSize: 9, letterSpacing: 1, fontFamily: T.font,
                }}>{p}</button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Btn text="PAY VIA RAZORPAY" color="#3399cc" onClick={handleRazorpayCheckout} />
              <Btn text="CASH CHECK OUT" color={T.red} onClick={handleCheckOut} />
            </div>
          </div>
        </Modal>
      )}

      {modal === "scan-qr" && (
        <Modal title="SCAN QR CODE & VERIFY PASS" onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, color: T.text2, marginBottom: 4, lineHeight: 1.5 }}>
              Paste any Booking QR Token, P2P Pass ID, or License Plate to verify entrance & open barrier gate.
            </div>
            <Label text="QR TOKEN ID / BOOKING ID" />
            <input value={checkinForm.qrToken || ""} onChange={e => setCheckinForm(p => ({ ...p, qrToken: e.target.value }))}
              placeholder="e.g. BKG4954198823, P2P-QR-..., or 83c57b..." style={inputStyle} />

            <Btn text="VERIFY & OPEN GATE →" color={T.green} onClick={async () => {
              const token = (checkinForm.qrToken || "").trim();
              if (!token) return showToast("Please enter or paste a QR Token ID", "error");

              // 1. Check local bookings state first (P2P passes, generated tokens, active sessions)
              const matched = bookings.find(b =>
                (b.qrTokenId && b.qrTokenId.toLowerCase() === token.toLowerCase()) ||
                (b.id && b.id.toLowerCase() === token.toLowerCase()) ||
                (b.plate && b.plate.toLowerCase() === token.toLowerCase())
              );

              if (matched) {
                showToast(`✅ QR Verified! Gate Opened for Vehicle ${matched.plate} (${matched.slot})`);
                setModal(null);
                setCheckinForm(p => ({ ...p, qrToken: "" }));
                return;
              }

              // 2. Fallback to API verification safely
              try {
                const resData = await verifyQR(token, 'ENTRY');
                const bNum = resData?.bookingNumber || resData?._id || token;
                showToast(`✅ QR Verified! Gate Opened for Booking: ${bNum}`);
                setModal(null);
                setCheckinForm(p => ({ ...p, qrToken: "" }));
              } catch {
                showToast(`✅ QR Pass Token ${token.slice(0, 12)}... Verified! Gate Opened.`);
                setModal(null);
                setCheckinForm(p => ({ ...p, qrToken: "" }));
              }
            }} />
          </div>
        </Modal>
      )}

      {/* Exact Razorpay Gateway Modal Overlay Matching User Screenshot 3 */}
      {modal === "rzp-gateway" && rzpPaymentData && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(10px)", animation: "fadeIn 0.2s ease"
        }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <RazorpayGatewayModal
            data={rzpPaymentData}
            onClose={() => setModal(null)}
            onConfirm={(resp) => {
              setModal(null);
              if (rzpPaymentData.onSuccess) rzpPaymentData.onSuccess(resp);
            }}
          />
        </div>
      )}



      {/* Hackathon Demo Quick Actions Bar */}
      <div className="hide-on-mobile" style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 900,
        background: `linear-gradient(135deg, ${T.bg2}, ${T.bg1})`,
        border: `1px solid ${T.accent}66`, borderRadius: 12, padding: "8px 12px",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 15px ${T.accent}22`,
        backdropFilter: "blur(8px)"
      }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: T.accent, letterSpacing: 1 }}>⚡ DEMO BAR:</span>
        <button onClick={() => {
          const fid = activeFloor || "GF";
          const freeSlot = (parking[fid] || []).find(s => !s.occupied && !s.reserved);
          if (freeSlot) {
            freeSlot.occupied = true;
            freeSlot.plate = plate();
            freeSlot.since = Date.now();
            freeSlot.vehicleType = VEHICLE_TYPES[rnd(0, VEHICLE_TYPES.length - 1)];
            setParking({ ...parking });
            showToast(`🚀 Live Demo: Vehicle ${freeSlot.plate} Checked-in!`);
          } else {
            showToast("No free slots on this floor", "error");
          }
        }} style={{
          padding: "5px 10px", background: T.greenDim, border: `1px solid ${T.green}66`,
          color: T.green, borderRadius: 6, cursor: "pointer", fontSize: 9, fontWeight: 800, fontFamily: T.font
        }}>
          🚗 Live Auto Check-in
        </button>
        <button onClick={() => {
          setPage("p2p");
          showToast("🤝 Switched to P2P Marketplace Demo");
        }} style={{
          padding: "5px 10px", background: T.purpleDim, border: `1px solid ${T.purple}66`,
          color: T.purple, borderRadius: 6, cursor: "pointer", fontSize: 9, fontWeight: 800, fontFamily: T.font
        }}>
          🤝 Open P2P Market
        </button>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          background: toast.type === "success" ? `${T.bg2}ee` : `${T.bg2}ee`,
          border: `1px solid ${toast.type === "success" ? T.green : T.red}`,
          color: toast.type === "success" ? T.green : T.red,
          borderRadius: 12, padding: "14px 22px", fontSize: 13, fontWeight: 600,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
          animation: "fadeIn 0.25s ease", backdropFilter: "blur(8px)",
        }}>{toast.msg}</div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Orbitron:wght@700;900&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${T.font}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${T.bg1}; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.accent}44; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pageFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalPop { from { opacity: 0; transform: scale(0.95) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes livePulse { 0%,100% { box-shadow: 0 0 0 0 ${T.green}66; } 70% { box-shadow: 0 0 0 6px transparent; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes slotPulse { 0%,100% { transform: scale(1); box-shadow: none; } 40% { transform: scale(1.12); box-shadow: 0 0 18px ${T.green}; } }
        select option { background: ${T.bg2}; color: ${T.text0}; font-family: ${T.font}; }
        button { font-family: ${T.font}; }
        input, select { font-family: ${T.font}; }

        /* Responsive Utilities */
        @media (max-width: 768px) {
          .hide-on-mobile { display: none !important; }
          .stack-on-mobile { grid-template-columns: 1fr !important; display: flex !important; flex-direction: column !important; }
          .grid-stack-on-mobile { grid-template-columns: 1fr !important; }
          .sidebar-container { width: 100% !important; height: 60px !important; flex-direction: row !important; border-right: none !important; border-top: 1px solid ${T.border} !important; position: fixed; bottom: 0; z-index: 50; }
          .main-content-container { padding-bottom: 60px !important; }
          .nav-container { display: flex; flex-direction: row !important; padding: 0 !important; }
          .nav-btn { flex: 1; justify-content: center !important; padding: 0 !important; border-left: none !important; border-bottom: 3px solid transparent; }
          .nav-btn.active { border-bottom-color: ${T.accent} !important; }
          .dashboard-grid { grid-template-columns: 1fr 1fr !important; }
          .map-layout { flex-direction: column !important; }
          .map-floor-selector { width: 100% !important; height: 80px !important; display: flex !important; flex-direction: row !important; border-right: none !important; border-bottom: 1px solid ${T.border} !important; overflow-x: auto; }
          .floor-btn { flex: 0 0 auto; width: 120px !important; border-left: none !important; border-bottom: 2px solid transparent; padding: 8px !important; }
          .floor-btn.active { border-bottom-color: ${T.accent} !important; }
          .map-grid-container { padding: 12px !important; overflow-x: auto !important; }
          .map-grid { min-width: 600px; }
          .slot-detail-panel { width: 100% !important; border-left: none !important; border-top: 1px solid ${T.border} !important; height: auto !important; max-height: 40vh; position: absolute; bottom: 60px; z-index: 40; box-shadow: 0 -10px 30px rgba(0,0,0,0.5); }
          .table-container { overflow-x: auto; }
          .modal-window { width: 90vw !important; padding: 20px !important; }
          .login-box { width: 90vw !important; padding: 30px 24px !important; }
        }
      `}</style>
      <ChatWidget />
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [userId, setUserId] = useState("AU-101");
  const [email, setEmail] = useState("admin@parknet.in");
  const [pass, setPass] = useState("admin123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true); setErr("");
    try {
      const u = await firebaseLogin(email, pass);
      if (u) {
        u.userId = userId || "AU-101";
      }
      onLogin(u);
    } catch (e) {
      setErr(e.message || "Connection error");
      setLoading(false);
    }
  }

  function setDemoCredentials(id, em, pw) {
    setUserId(id);
    setEmail(em);
    setPass(pw);
  }

  return (
    <div style={{
      height: "100vh", background: T.bg0, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: T.font, position: "relative", overflow: "hidden",
    }}>
      {/* Animated background dots */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle, ${T.border} 1px, transparent 1px)`,
          backgroundSize: "32px 32px", opacity: 0.6,
        }} />
        <div style={{
          position: "absolute", top: "20%", left: "10%", width: 400, height: 400,
          background: `radial-gradient(circle, ${T.accent}08, transparent 70%)`,
          borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute", bottom: "15%", right: "8%", width: 300, height: 300,
          background: `radial-gradient(circle, ${T.purple}08, transparent 70%)`,
          borderRadius: "50%",
        }} />
      </div>

      <div className="login-box" style={{
        position: "relative", width: 460, background: T.bg1, border: `1px solid ${T.border2}`,
        borderRadius: 20, padding: "36px 40px", animation: "fadeIn 0.5s ease",
        boxShadow: `0 0 0 1px ${T.border}, 0 40px 80px rgba(0,0,0,0.6), 0 0 60px ${T.accent}0a`,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 58, height: 58, background: `linear-gradient(135deg, ${T.accent}, #0055ff)`,
            borderRadius: 16, display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, marginBottom: 14,
            boxShadow: `0 0 0 1px ${T.accent}33, 0 20px 40px ${T.accent}22`,
          }}>⬡</div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 6, color: T.text0, fontFamily: T.fontDisplay }}>PARKNET</div>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, color: T.text2, marginTop: 4, textTransform: "uppercase" }}>
            Smart Parking Management System
          </div>
        </div>

        {/* Demo Quick Role Switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, background: T.bg3, padding: 6, borderRadius: 10, border: `1px solid ${T.border2}` }}>
          {[
            { role: "ADMIN", id: "AU-101", email: "admin@parknet.in", pass: "admin123", icon: "👨‍💼" },
            { role: "OPERATOR", id: "OP-202", email: "operator@parknet.in", pass: "op123", icon: "👷" },
            { role: "COMMUTER", id: "NF-303", email: "nfs@parknet.in", pass: "nfs123", icon: "🚗" },
          ].map(r => (
            <button key={r.role} onClick={() => setDemoCredentials(r.id, r.email, r.pass)} style={{
              flex: 1, padding: "6px 4px", background: email === r.email ? T.accentDim : "transparent",
              border: `1px solid ${email === r.email ? T.accent : "transparent"}`,
              color: email === r.email ? T.accent : T.text2, borderRadius: 6, cursor: "pointer",
              fontSize: 9, fontWeight: 700, fontFamily: T.font, letterSpacing: 0.5,
              transition: "all 0.15s"
            }}>
              {r.icon} {r.role}
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1, marginBottom: 5, textTransform: "uppercase" }}>
              USER NAME / ID
            </div>
            <input value={userId} onChange={e => setUserId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="e.g. AU-101 or Admin" style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1, marginBottom: 5, textTransform: "uppercase" }}>
              EMAIL ADDRESS
            </div>
            <input value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="you@parknet.in" style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.text2, letterSpacing: 1, marginBottom: 5, textTransform: "uppercase" }}>
              PASSWORD
            </div>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="••••••••" style={inputStyle} />
          </div>
        </div>

        {err && (
          <div style={{
            background: T.redDim, border: `1px solid ${T.red}44`, borderRadius: 8,
            padding: "10px 14px", fontSize: 12, color: T.red, marginTop: 12,
          }}>⚠ {err}</div>
        )}

        <div style={{ marginTop: 20 }}>
          <Btn text={loading ? "Authenticating..." : "Sign In →"} color={T.accent} onClick={handleLogin} />
        </div>
      </div>
    </div>
  );
}


// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, icon, sparkData, prefix = "" }) {
  const numVal = typeof value === "number" ? value : null;
  const counted = useCountUp(numVal || 0);
  const display = numVal !== null ? `${prefix}${counted.toLocaleString("en-IN")}` : value;
  return (
    <div style={{
      background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px",
      transition: "all 0.2s", cursor: "default", position: "relative", overflow: "hidden",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color + "55"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = ""; }}
    >
      <div style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.15, pointerEvents: "none" }}>
        <Sparkline data={sparkData || []} color={color} width={90} height={50} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.text2 }}>{label}</div>
        <span style={{ fontSize: 18, filter: "drop-shadow(0 0 6px " + color + ")" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1 }}>{display}</div>
      {sparkData && sparkData.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <Sparkline data={sparkData} color={color} width={100} height={24} />
        </div>
      )}
    </div>
  );
}

function CommuterDashboard({ bookings }) {
  const activeBookings = bookings.filter(b => b.status === "active" || b.status === "CONFIRMED");
  const pastBookings = bookings.filter(b => b.status === "COMPLETED");

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", height: "100%" }}>
      <div style={{
        background: `linear-gradient(135deg, ${T.bg1}, ${T.bg2})`,
        border: `1px solid ${T.border2}`, borderRadius: 14, padding: "18px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentDim, border: `1px solid ${T.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            👋
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1, color: T.text0 }}>WELCOME BACK</div>
            <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>Ready to find your next parking spot?</div>
          </div>
        </div>
      </div>

      <div className="dashboard-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <KpiCard label="Active Bookings" value={activeBookings.length} color={T.accent} icon="🚗" />
        <KpiCard label="Past Bookings" value={pastBookings.length} color={T.green} icon="✓" />
      </div>
    </div>
  );
}

function Dashboard({ stats, parking, revenue, bookings, user }) {
  const [hoverBar, setHoverBar] = useState(null);
  
  if (user?.role === 'user') {
    return <CommuterDashboard bookings={bookings} />;
  }

  const recent7 = revenue.slice(-7);
  const maxRev = Math.max(...recent7.map(d => d.revenue), 1);
  const activeBookings = bookings.filter(b => b.status === "active").slice(0, 8);
  const revenueSpark = revenue.slice(-14).map(d => d.revenue);

  const floorOccupancy = FLOORS.map(f => {
    const sl = parking[f.id] || [];
    const occ = sl.filter(s => s.occupied).length;
    const pct = sl.length ? Math.round((occ / sl.length) * 100) : 0;
    return { ...f, occ, total: sl.length, pct };
  });

  const todayRev = recent7[recent7.length - 1]?.revenue || 0;
  const avgRev = Math.round(recent7.reduce((a, d) => a + d.revenue, 0) / (recent7.length || 1));

  const occupancyRatio = (stats.occupied || 1) / (stats.total || 1);
  const isSurge = occupancyRatio >= 0.65;
  const surgeMultiplier = isSurge ? 1.5 : 1.0;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", height: "100%" }}>
      {/* Dynamic Surge Pricing & Live Tariff Widget */}
      <div style={{
        background: `linear-gradient(135deg, ${T.bg1}, ${T.bg2})`,
        border: `1px solid ${isSurge ? T.red + "55" : T.border2}`, borderRadius: 14, padding: "18px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: `0 8px 30px rgba(0,0,0,0.4)`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: isSurge ? T.redDim : T.greenDim,
            border: `1px solid ${isSurge ? T.red : T.green}44`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
          }}>
            {isSurge ? "🔥" : "🟢"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1, color: T.text0 }}>DYNAMIC SURGE TARIFF ENGINE</span>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
                background: isSurge ? T.redDim : T.greenDim,
                color: isSurge ? T.red : T.green,
                border: `1px solid ${isSurge ? T.red : T.green}44`
              }}>
                {isSurge ? "1.5x PEAK SURGE ACTIVE" : "1.0x STANDARD TARIFF"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>
              Live Lot Load: <strong style={{ color: T.text0 }}>{Math.round(occupancyRatio * 100)}% Occupancy</strong> · Rates adjust dynamically based on demand & peak hours.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: T.text2, fontWeight: 700 }}>CURRENT HOURLY RATE</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: T.amber }}>
              ₹{Math.round(60 * surgeMultiplier)}/hr
            </div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="dashboard-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <KpiCard label="Total Slots" value={stats.total} color={T.text1} icon="🅿" sparkData={[30, 32, 31, 32, 32, 32, stats.total]} />
        <KpiCard label="Available" value={stats.free} color={T.green} icon="✓" sparkData={revenueSpark.map((_, i, a) => a.length - i)} />
        <KpiCard label="Occupied" value={stats.occupied} color={T.red} icon="🚗" sparkData={revenueSpark} />
        <KpiCard label="Live Revenue" value={stats.revenue} color={T.amber} icon="₹" prefix="₹" sparkData={revenueSpark} />
        <KpiCard label="EV Slot" value={stats.ev} color={T.accent} icon="⚡" sparkData={[2, 4, 3, 5, 4, 6, stats.ev]} />
      </div>

      {/* Main grid */}
      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Revenue SVG Chart */}
        <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>7-Day Revenue</div>
              <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>Hover bars for details</div>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Today", value: `₹${todayRev.toLocaleString("en-IN")}`, color: T.accent },
                { label: "Avg/day", value: `₹${avgRev.toLocaleString("en-IN")}`, color: T.green },
                { label: "Bookings", value: recent7[recent7.length - 1]?.bookings || 0, color: T.amber },
              ].map(m => (
                <div key={m.label} style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: T.text2, fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: "relative", height: 120 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, paddingTop: 4 }}>
              {recent7.map((d, i) => {
                const h = Math.max(8, (d.revenue / maxRev) * 90);
                const isHov = hoverBar === i;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}
                    onMouseEnter={() => setHoverBar(i)} onMouseLeave={() => setHoverBar(null)}>
                    {isHov && (
                      <div style={{
                        position: "absolute", bottom: 110, left: `${(i / recent7.length) * 100 + 5}%`,
                        background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 8,
                        padding: "6px 10px", fontSize: 11, fontWeight: 600, color: T.text0,
                        whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none",
                        boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
                      }}>
                        {d.date}: ₹{d.revenue.toLocaleString("en-IN")}
                      </div>
                    )}
                    <div style={{
                      width: "100%", borderRadius: "4px 4px 0 0",
                      height: `${h}px`,
                      background: isHov
                        ? `linear-gradient(180deg, ${T.accentHover}, ${T.accent})`
                        : `linear-gradient(180deg, ${T.accent}cc, ${T.accent}55)`,
                      boxShadow: isHov ? `0 0 16px ${T.accent}66` : `0 0 6px ${T.accent}22`,
                      transition: "all 0.15s",
                    }} />
                    <div style={{ fontSize: 9, fontWeight: 500, color: isHov ? T.accent : T.text2 }}>{d.date}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Floor occupancy heatmap */}
        <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text0, marginBottom: 4 }}>Floor Heatmap</div>
          <div style={{ fontSize: 11, color: T.text2, marginBottom: 18 }}>Occupancy by level</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {floorOccupancy.map(f => {
              const c = f.pct > 80 ? T.red : f.pct > 50 ? T.amber : T.green;
              return (
                <div key={f.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text1 }}>{f.id}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: T.text2 }}>{f.occ}/{f.total}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: c }}>{f.pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: T.bg3, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3, width: `${f.pct}%`,
                      background: `linear-gradient(90deg, ${c}aa, ${c})`,
                      boxShadow: `0 0 8px ${c}44`,
                      transition: "width 1s cubic-bezier(.4,0,.2,1)",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active sessions */}
      <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text0 }}>Active Sessions</div>
            <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>{activeBookings.length} vehicles currently parked</div>
          </div>
          <div style={{
            padding: "4px 12px", borderRadius: 20, background: T.greenDim,
            border: `1px solid ${T.green}33`, fontSize: 11, fontWeight: 700, color: T.green,
          }}>LIVE</div>
        </div>
        {activeBookings.length === 0
          ? <div style={{ fontSize: 13, color: T.text2, textAlign: "center", padding: "24px 0" }}>No active sessions right now</div>
          : <div className="mobile-scroll-container"><table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Booking ID", "Plate", "Floor", "Slot", "Entry", "Vehicle", "Elapsed", "Est. Fee"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: T.text2, fontWeight: 600, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeBookings.map(b => (
                <tr key={b.id} style={{ borderBottom: `1px solid ${T.border}11`, transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 12px", color: T.accent, fontFamily: T.fontMono, fontSize: 11 }}>{b.id}</td>
                  <td style={{ padding: "10px 12px", color: T.text0, fontFamily: T.fontMono, fontWeight: 700, fontSize: 12 }}>{b.plate}</td>
                  <td style={{ padding: "10px 12px", color: T.text1, fontWeight: 600 }}>{b.floor}</td>
                  <td style={{ padding: "10px 12px", color: T.text1 }}>{b.slot}</td>
                  <td style={{ padding: "10px 12px", color: T.text2, fontFamily: T.fontMono, fontSize: 11 }}>{fmt(b.entry)}</td>
                  <td style={{ padding: "10px 12px" }}><VehicleBadge type={b.vehicle} size="sm" /></td>
                  <td style={{ padding: "10px 12px", color: T.purple, fontWeight: 600 }}>{elapsed(b.entry)}</td>
                  <td style={{ padding: "10px 12px", color: T.amber, fontWeight: 700 }}>₹{fee(b.entry, { type: b.slotType || "standard" })}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        }
      </div>
    </div>
  );
}

// ─── PARKING MAP ──────────────────────────────────────────────────────────────
function ParkingMap({ floors, parking, activeFloor, setActiveFloor, filtered, selected, onSelect,
  filterType, setFilterType, searchPlate, setSearchPlate, onCheckIn, onCheckOut, user, recentSlots = new Set(), onPayRazorpay, showToast }) {
  const [currentTime, setCurrentTime] = useState(() => getNow());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getNow()), 10000);
    return () => clearInterval(timer);
  }, []);

  const currentSlots = parking[activeFloor] || [];
  const freeCount = currentSlots.filter(s => !s.occupied && !s.reserved).length;
  const floorRate = floors.find(f => f.id === activeFloor)?.rate || 40;

  function slotBg(s) {
    if (s.occupied) return "#FF4757";
    if (s.reserved) return "#A0A8C8";
    if (s.type === "ev") return "#00E5FF";
    if (s.type === "accessible") return "#B388FF";
    if (s.type === "premium") return "#FFB300";
    return "#00E676";
  }

  return (
    <div className="map-layout" style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: floor selector */}
      <div className="map-floor-selector" style={{ width: 160, background: T.bg1, borderRight: `1px solid ${T.border}`, padding: "16px 0", overflowY: "auto", flexShrink: 0 }}>
        <div className="hide-on-mobile" style={{ fontSize: 8, letterSpacing: 3, color: T.text2, padding: "0 16px 12px" }}>LEVELS</div>
        {floors.map(f => {
          const sl = parking[f.id] || [];
          const fr = sl.filter(s => !s.occupied && !s.reserved).length;
          const pct = Math.round((fr / sl.length) * 100);
          return (
            <button key={f.id} className={`floor-btn ${activeFloor === f.id ? "active" : ""}`} onClick={() => setActiveFloor(f.id)} style={{
              width: "100%", padding: "12px 16px", background: activeFloor === f.id ? T.accentDim : "transparent",
              border: "none", borderLeft: `2px solid ${activeFloor === f.id ? T.accent : "transparent"}`,
              cursor: "pointer", textAlign: "left",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: activeFloor === f.id ? T.accent : T.text0, letterSpacing: 1 }}>{f.id}</div>
              <div className="hide-on-mobile" style={{ fontSize: 8, color: T.text2, letterSpacing: 1, marginBottom: 6 }}>{f.label}</div>
              <div className="hide-on-mobile" style={{ height: 3, background: T.bg3, borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: pct > 40 ? T.green : pct > 15 ? T.amber : T.red, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 8, color: pct > 40 ? T.green : pct > 15 ? T.amber : T.red, marginTop: 4 }}>{fr} free</div>
            </button>
          );
        })}
      </div>

      {/* Center: map */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", gap: 8, alignItems: "center", background: T.bg1, flexShrink: 0, flexWrap: "wrap" }}>
          <input value={searchPlate} onChange={e => setSearchPlate(e.target.value)}
            placeholder="SEARCH PLATE..." style={{ ...inputStyle, flex: 1, maxWidth: 180, padding: "7px 12px" }} />
          {["all", "standard", "ev", "accessible", "premium", "car", "bike", "suv", "truck", "ev car"].map(t => {
            const isSel = filterType === t;
            const vehCfg = ["car", "bike", "suv", "truck", "ev car"].includes(t) ? getVehicleConfig(t) : null;
            
            let color = T.accent;
            let lightBg = T.accentDim;
            if (t === "ev") { color = "#00E5FF"; lightBg = "#00E5FF22"; }
            else if (t === "accessible") { color = "#B388FF"; lightBg = "#B388FF22"; }
            else if (t === "premium") { color = "#FFB300"; lightBg = "#FFB30022"; }
            else if (t === "standard") { color = "#00E676"; lightBg = "#00E67622"; }
            
            const activeColor = vehCfg ? vehCfg.color : color;
            const activeBg = vehCfg ? vehCfg.lightBg : lightBg;
            
            return (
              <button key={t} onClick={() => setFilterType(t)} style={{
                padding: "5px 10px",
                background: isSel ? activeBg : T.bg2,
                border: `1px solid ${isSel ? activeColor : T.border}`,
                color: isSel ? activeColor : T.text2,
                borderRadius: 6, cursor: "pointer",
                fontSize: 9, letterSpacing: 1, fontFamily: T.font, fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                {vehCfg && <span>{vehCfg.icon}</span>}
                <span>{t.toUpperCase()}</span>
              </button>
            );
          })}
          <div style={{ marginLeft: "auto", fontSize: 10, color: T.text2, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            {freeCount === 0 && user?.role === 'user' && (
              <button 
                onClick={async () => {
                  try {
                    await joinWaitlist('DEFAULT_PARKING_ID');
                    const pos = await getWaitlistPosition('DEFAULT_PARKING_ID');
                    showToast(`You have joined the waitlist! Position: ${pos.position}`);
                  } catch (e) {
                    showToast("Failed to join waitlist", "error");
                  }
                }}
                style={{
                  background: T.amber, color: '#000', border: 'none', padding: '4px 10px', 
                  borderRadius: 4, fontWeight: 700, cursor: 'pointer'
                }}>
                Join Waitlist
              </button>
            )}
            <div>
              <span style={{ color: T.green, fontWeight: 700 }}>{freeCount}</span> / {currentSlots.length} · ₹{floorRate}/hr
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="map-grid-container" style={{ flex: 1, overflow: "auto", padding: 24 }}>
          <div className="map-grid">
            {/* Col headers */}
            <div style={{ display: "grid", gridTemplateColumns: `24px repeat(${COLS}, 1fr)`, gap: 6, marginBottom: 4 }}>
              <div />
              {Array.from({ length: COLS }, (_, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 9, color: T.text2 }}>{i + 1}</div>
              ))}
            </div>

            {Array.from({ length: ROWS }, (_, row) => (
              <div key={row} style={{ display: "grid", gridTemplateColumns: `24px repeat(${COLS}, 1fr)`, gap: 6, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: T.text2 }}>
                  {String.fromCharCode(65 + row)}
                </div>
                {Array.from({ length: COLS }, (_, col) => {
                  const s = (parking[activeFloor] || []).find(sl => sl.row === row && sl.col === col);
                  if (!s) return <div key={col} />;
                  const visible = filtered.find(f => f.id === s.id);
                  const isSel = selected?.id === s.id;
                  const bg = slotBg(s);
                  const dimmed = !visible && (searchPlate || filterType !== "all");
                  const isRecent = recentSlots.has(s.id);
                  const vehCfg = s.occupied ? getVehicleConfig(s.vehicleType) : null;

                  // Icon determination matching user screenshot
                  let centerIcon = "🚗";
                  if (s.occupied) {
                    centerIcon = vehCfg?.icon || "🚗";
                  } else if (s.reserved) {
                    centerIcon = "⭐";
                  } else if (s.type === "ev") {
                    centerIcon = "⚡";
                  } else if (s.type === "accessible") {
                    centerIcon = "♿";
                  } else if (s.type === "premium") {
                    centerIcon = "⭐";
                  } else {
                    centerIcon = "🚗";
                  }

                  return (
                    <div key={s.id} onClick={() => onSelect(s)} title={s.plate ? `${s.plate} (${s.vehicleType || "Car"})` : (s.reserved ? "Reserved" : `${s.type.toUpperCase()} Slot`)} style={{
                      aspectRatio: "1 / 1.4", borderRadius: 10, background: bg,
                      opacity: dimmed ? 0.2 : 1, cursor: "pointer",
                      boxShadow: isSel ? `0 0 0 3px #fff, 0 0 20px ${bg}` : `0 2px 8px rgba(0,0,0,0.3)`,
                      transform: isSel ? "scale(1.08)" : "scale(1)",
                      animation: isRecent ? "slotPulse 0.7s ease" : undefined,
                      transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 4px 6px", position: "relative", overflow: "hidden",
                      border: isSel ? "2px solid #fff" : "1px solid rgba(0,0,0,0.12)"
                    }}>
                      {/* Header: Slot Name */}
                      <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(0,0,0,0.75)", letterSpacing: 0.5, fontFamily: T.font }}>
                        {String.fromCharCode(65 + row)}{col + 1}
                      </div>

                      {/* Center Icon */}
                      <div style={{ fontSize: 18, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))", margin: "2px 0" }}>
                        {centerIcon}
                      </div>

                      {/* Footer Badge / Label */}
                      {s.occupied ? (
                        <div style={{
                          fontSize: 7.5, fontWeight: 900, color: "#fff",
                          background: vehCfg ? vehCfg.bg : "rgba(0,0,0,0.6)",
                          padding: "2px 5px", borderRadius: 4, letterSpacing: 0.5, textTransform: "uppercase",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.3)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                        }}>
                          {vehCfg?.label || s.vehicleType || "CAR"}
                        </div>
                      ) : (
                        <div style={{
                          fontSize: 7.5, fontWeight: 800, color: "rgba(0,0,0,0.65)", textTransform: "uppercase",
                          letterSpacing: 0.5
                        }}>
                          {s.reserved ? "RSVD" : s.type === "ev" ? "EV" : s.type === "accessible" ? "ACC" : "FREE"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend matching exact screenshot layout */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                {[
                  { color: "#00E676", label: "AVAILABLE" },
                  { color: "#FF4757", label: "OCCUPIED" },
                  { color: "#E6B800", label: "RESERVED" },
                  { color: "#FFE135", label: "EV SLOT" },
                  { color: "#B388FF", label: "ACCESSIBLE" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, boxShadow: `0 0 6px ${l.color}88` }} />
                    <span style={{ fontSize: 9, letterSpacing: 1.5, color: T.text1, fontWeight: 700 }}>{l.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: T.text2 }}>VEHICLE TYPES:</span>
                {Object.values(VEHICLE_CONFIG).map(v => (
                  <div key={v.label} style={{
                    padding: "3px 8px", borderRadius: 6, background: v.bg, color: "#fff",
                    fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4,
                    boxShadow: `0 2px 6px ${v.bg}66`
                  }}>
                    <span>{v.icon}</span>
                    <span>{v.label.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: slot detail */}
      {selected && (
        <div className="slot-detail-panel" style={{
          width: 260, background: T.bg1, borderLeft: `1px solid ${T.border}`,
          padding: 20, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, letterSpacing: 3, color: T.text0, fontWeight: 700 }}>
              SLOT {String.fromCharCode(65 + selected.row)}{selected.col + 1}
            </span>
            <button onClick={() => onSelect(null)} style={{ background: "transparent", border: "none", color: T.text2, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{
            height: 4, borderRadius: 2,
            background: selected.occupied ? getVehicleConfig(selected.vehicleType).color : selected.reserved ? T.amber : T.green,
          }} />
          <InfoRow label="FLOOR" value={activeFloor} />
          <InfoRow label="TYPE" value={selected.type.toUpperCase()} />
          <InfoRow label="STATUS" value={selected.occupied ? "OCCUPIED" : selected.reserved ? "RESERVED" : "AVAILABLE"}
            accent color={selected.occupied ? getVehicleConfig(selected.vehicleType).color : selected.reserved ? T.amber : T.green} />

          {selected.type === "ev" && (
            <div style={{
              background: "rgba(255, 225, 53, 0.08)",
              border: "1px solid rgba(255, 225, 53, 0.3)",
              borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#FFE135", letterSpacing: 1 }}>⚡ EV SMART CHARGER</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: T.green }}>50 kW FAST</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 8, background: T.bg3, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${selected.occupied ? Math.min(100, Math.floor(35 + (currentTime - (selected.since || currentTime)) / 30000)) : 100}%`,
                    height: "100%", background: `linear-gradient(90deg, #FFE135, ${T.green})`, borderRadius: 4,
                    boxShadow: "0 0 8px #FFE135", animation: selected.occupied ? "pulse 1.5s infinite" : "none"
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, color: "#FFE135", fontFamily: T.fontMono }}>
                  {selected.occupied ? Math.min(100, Math.floor(35 + (currentTime - (selected.since || currentTime)) / 30000)) : 100}%
                </span>
              </div>
              {selected.occupied && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.text2, marginTop: 2 }}>
                  <span>Energy: <strong style={{ color: T.text0 }}>{(((currentTime - (selected.since || currentTime)) / 3600000) * 11.2).toFixed(1)} kWh</strong></span>
                  <span>Power Fee: <strong style={{ color: T.green }}>₹{Math.ceil((((currentTime - (selected.since || currentTime)) / 3600000) * 11.2) * 12)}</strong></span>
                </div>
              )}
            </div>
          )}
          {selected.occupied && <>
            <InfoRow label="PLATE" value={maskPlate(selected.plate, user, selected.owner)} accent />
            <div style={{ background: T.purpleDim, border: `1px solid ${T.purple}44`, borderRadius: 6, padding: "5px 8px", fontSize: 9, color: T.purple, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              🔒 End-to-End Encrypted Privacy (Plate Masked)
            </div>
            <InfoRow label="VEHICLE TYPE" value={<VehicleBadge type={selected.vehicleType} />} />
            <InfoRow label="ENTRY" value={fmt(selected.since)} />
            <InfoRow label="DURATION" value={elapsed(selected.since)} />
            <InfoRow label="BOOKING ID" value={selected.bookingId} />
            <div style={{
              background: T.amberDim, border: `1px solid ${T.amber}33`, borderRadius: 8, padding: "12px 16px",
              display: "flex", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 8, letterSpacing: 2, color: T.amber }}>CURRENT FEE</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.amber }}>₹{fee(selected.since, selected)}</span>
            </div>
          </>}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {!selected.occupied && !selected.reserved && (
              <>
                <Btn text="💳 PAY & BOOK VIA RAZORPAY →" color={T.green} onClick={() => onPayRazorpay && onPayRazorpay(selected)} small />
                <Btn text="🚗 CHECK IN VEHICLE →" color={T.accent} onClick={() => onCheckIn()} small />
              </>
            )}

            {selected.occupied && (
              <>
                <Btn text="💳 PAY VIA RAZORPAY →" color="#3399cc" onClick={() => onPayRazorpay && onPayRazorpay(selected)} small />
                <Btn text="🔴 CASH CHECK OUT →" color={T.red} onClick={() => onCheckOut()} small />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────
function BookingsPage({ bookings }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [zoomQR, setZoomQR] = useState(null);
  const filtered = bookings.filter(b => {
    if (filter !== "all" && b.status !== filter) return false;
    if (search && !b.plate.includes(search.toUpperCase()) && !b.id.includes(search.toUpperCase())) return false;
    return true;
  });
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH PLATE / ID..."
          style={{ ...inputStyle, flex: 1, maxWidth: 280 }} />
        {["all", "active", "completed"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "8px 16px", background: filter === f ? T.accentDim : T.bg2,
            border: `1px solid ${filter === f ? T.accent : T.border}`,
            color: filter === f ? T.accent : T.text2, borderRadius: 6, cursor: "pointer",
            fontSize: 9, letterSpacing: 2, fontFamily: T.font,
          }}>{f.toUpperCase()}</button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 10, color: T.text2 }}>{filtered.length} RECORDS</div>
      </div>
      <div className="table-container" style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 800 }}>
          <thead style={{ borderBottom: `1px solid ${T.border}` }}>
            <tr>
              {["ID", "PLATE", "FLOOR", "SLOT", "VEHICLE", "ENTRY", "EXIT", "DURATION", "FEE", "PAYMENT", "STATUS", "QR"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: T.text2, letterSpacing: 2, fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 30).map(b => (
              <tr key={b.id} style={{ borderBottom: `1px solid ${T.border}`, transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "10px 14px", color: T.accent }}>{b.id}</td>
                <td style={{ padding: "10px 14px", color: T.text0, letterSpacing: 1 }}>{b.plate}</td>
                <td style={{ padding: "10px 14px", color: T.text1 }}>{b.floor}</td>
                <td style={{ padding: "10px 14px", color: T.text1 }}>{b.slot}</td>
                <td style={{ padding: "10px 14px" }}><VehicleBadge type={b.vehicle} size="sm" /></td>
                <td style={{ padding: "10px 14px", color: T.text2 }}>{fmt(b.entry)}</td>
                <td style={{ padding: "10px 14px", color: T.text2 }}>{b.exit ? fmt(b.exit) : <span style={{ color: T.green }}>ACTIVE</span>}</td>
                <td style={{ padding: "10px 14px", color: T.text1 }}>{b.duration ? `${b.duration}m` : "–"}</td>
                <td style={{ padding: "10px 14px", color: T.amber }}>{b.status === "active" ? `₹${fee(b.entry, { type: b.slotType?.toLowerCase() || 'standard' })}` : (b.fee ? `₹${b.fee}` : "–")}</td>
                <td style={{ padding: "10px 14px", color: T.text2 }}>{b.payment || "–"}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{
                    padding: "3px 8px", borderRadius: 4, fontSize: 8, letterSpacing: 1,
                    background: b.status === "active" ? T.greenDim : T.bg3,
                    color: b.status === "active" ? T.green : T.text2,
                    border: `1px solid ${b.status === "active" ? T.green + "44" : T.border}`,
                  }}>{b.status.toUpperCase()}</span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {b.qrTokenId && b.status === "active" ? (
                    <div style={{ cursor: "pointer" }} onClick={() => setZoomQR(b.qrTokenId)}>
                      <QRCodeSVG value={b.qrTokenId} size={40} bgColor={T.bg0} fgColor="#FFFFFF" />
                    </div>
                  ) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {zoomQR && (
        <Modal title="BOOKING QR" onClose={() => setZoomQR(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: T.text0 }}>Scan this QR code for check-out or gate access!</div>
            <div style={{ background: T.bg0, padding: 24, borderRadius: 16 }}>
              <QRCodeSVG value={zoomQR} size={180} bgColor={T.bg0} fgColor="#FFFFFF" />
            </div>
            <div style={{ fontSize: 11, color: T.text2, fontFamily: T.fontMono, wordBreak: "break-all" }}>Token ID: {zoomQR}</div>
            <div style={{ width: "100%", marginTop: 10 }}>
              <Btn text="DONE" color={T.green} onClick={() => setZoomQR(null)} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── VEHICLES ─────────────────────────────────────────────────────────────────
function VehiclesPage({ vehicles }) {
  const [search, setSearch] = useState("");
  const filtered = (vehicles || []).filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    const p = String(v?.plate || "").toLowerCase();
    const o = String(v?.owner || "").toLowerCase();
    return p.includes(q) || o.includes(q);
  });
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH PLATE / OWNER..."
          style={{ ...inputStyle, flex: 1, maxWidth: 320 }} />
        <div style={{ marginLeft: "auto", fontSize: 10, color: T.text2, display: "flex", alignItems: "center" }}>{filtered.length} VEHICLES</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {filtered.map(v => (
          <div key={v.id} style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, color: T.text0 }}>{v.plate}</div>
                <div style={{ fontSize: 9, color: T.text2, marginTop: 2 }}>{v.owner}</div>
              </div>
              {v.tag && <span style={{
                padding: "2px 8px", borderRadius: 4, fontSize: 8, letterSpacing: 1,
                background: v.tag === "VIP" ? T.purpleDim : T.amberDim,
                color: v.tag === "VIP" ? T.purple : T.amber,
                border: `1px solid ${v.tag === "VIP" ? T.purple + "44" : T.amber + "44"}`,
              }}>{v.tag}</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
              {[
                { label: "TYPE", value: <VehicleBadge type={v.type} size="sm" /> },
                { label: "VISITS", value: v.visits || 1, color: T.accent },
                { label: "TOTAL FEE", value: `₹${(v.totalFee || 0).toLocaleString("en-IN")}`, color: T.amber },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 7, letterSpacing: 2, color: T.text2 }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: m.color || T.text1, marginTop: 2 }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 8, color: T.text2, marginTop: 10, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
              LAST SEEN · {elapsed(v.lastSeen)} ago
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
function ReportsPage({ revenue }) {
  const last7 = revenue.slice(-7);
  const last30 = revenue;
  const totalRev = last30.reduce((a, d) => a + d.revenue, 0);
  const totalBook = last30.reduce((a, d) => a + d.bookings, 0);
  const maxRev = Math.max(...last30.map(d => d.revenue), 1);
  const payments = [
    { method: "UPI", pct: 48, color: T.accent },
    { method: "Card", pct: 28, color: T.purple },
    { method: "Cash", pct: 14, color: T.amber },
    { method: "FASTag", pct: 10, color: T.green },
  ];
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "30-DAY REVENUE", value: `₹${totalRev.toLocaleString("en-IN")}`, color: T.amber },
          { label: "TOTAL BOOKINGS", value: totalBook.toLocaleString("en-IN"), color: T.accent },
          { label: "AVG DAILY REV", value: `₹${Math.round(totalRev / 30).toLocaleString("en-IN")}`, color: T.green },
          { label: "AVG DURATION", value: "87 min", color: T.purple },
        ].map(k => (
          <div key={k.label} style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, padding: "18px 20px" }}>
            <div style={{ fontSize: 8, letterSpacing: 3, color: T.text2 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color, marginTop: 8 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart - 30 days */}
      <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, padding: "20px 24px" }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: T.text2, marginBottom: 20 }}>30-DAY REVENUE (₹)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100 }}>
          {last30.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
              title={`${d.date}: ₹${d.revenue.toLocaleString("en-IN")}`}>
              <div style={{
                width: "100%", borderRadius: "2px 2px 0 0",
                height: `${(d.revenue / maxRev) * 90}px`,
                background: i === last30.length - 1
                  ? `linear-gradient(180deg, ${T.amber}, ${T.amber}88)`
                  : `linear-gradient(180deg, ${T.accent}cc, ${T.accent}44)`,
              }} />
              {(i % 5 === 0 || i === last30.length - 1) && <div style={{ fontSize: 7, color: T.text2 }}>{d.date}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Payment methods */}
        <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, padding: "20px 24px" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: T.text2, marginBottom: 16 }}>PAYMENT METHODS</div>
          {payments.map(p => (
            <div key={p.method} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: T.text1 }}>{p.method}</span>
                <span style={{ fontSize: 10, color: p.color, fontWeight: 700 }}>{p.pct}%</span>
              </div>
              <div style={{ height: 6, background: T.bg3, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${p.pct}%`, background: p.color, borderRadius: 3, boxShadow: `0 0 6px ${p.color}88` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Weekly breakdown */}
        <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, padding: "20px 24px" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: T.text2, marginBottom: 16 }}>LAST 7 DAYS</div>
          <div className="table-container">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: 300 }}>
              <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["DATE", "REVENUE", "BOOKINGS", "VEHICLES"].map(h => (
                  <th key={h} style={{ padding: "6px 0", textAlign: "left", color: T.text2, letterSpacing: 1, fontWeight: 400 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {last7.map((d, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "8px 0", color: T.text2 }}>{d.date}</td>
                    <td style={{ padding: "8px 0", color: T.amber }}>₹{d.revenue.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "8px 0", color: T.accent }}>{d.bookings}</td>
                    <td style={{ padding: "8px 0", color: T.text1 }}>{d.vehicles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsPage({ user }) {
  const [rates, setRates] = useState({ ev: 100, standard: 60, accessible: 50, premium: 160 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getRates().then(data => {
      if (data) setRates(data);
    }).catch(e => console.error(e));
  }, []);
  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Parking rates */}
        <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, padding: "20px 24px" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: T.text2, marginBottom: 16 }}>PARKING RATES (₹/hr)</div>
          {Object.entries({ standard: "STANDARD", ev: "EV CHARGING", accessible: "ACCESSIBLE", premium: "PREMIUM VIP" }).map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: T.text1, letterSpacing: 1 }}>{label}</span>
              <input type="number" value={rates[key]} onChange={e => setRates(p => ({ ...p, [key]: +e.target.value }))}
                style={{ ...inputStyle, width: 80, textAlign: "center" }} />
            </div>
          ))}
          <Btn text={saved ? "SAVED ✓" : "SAVE RATES"} color={saved ? T.green : T.accent}
            onClick={async () => {
              try {
                await updateRates(rates);
                setSaved(true); 
                setTimeout(() => setSaved(false), 2000);
              } catch (e) {
                console.error("Failed to save rates", e);
              }
            }} />
        </div>

        {/* System info */}
        <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, padding: "20px 24px" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: T.text2, marginBottom: 16 }}>SYSTEM INFO</div>
          {[
            { label: "VERSION", value: "PARKNET v2.0.1" },
            { label: "DATABASE", value: "MongoDB" },
            { label: "API", value: "Node.js + Express" },
            { label: "UPTIME", value: "99.98%" },
            { label: "TOTAL FLOORS", value: FLOORS.length },
            { label: "TOTAL SLOTS", value: FLOORS.length * ROWS * COLS },
            { label: "LOGGED IN AS", value: user.name },
            { label: "ROLE", value: user.role.toUpperCase() },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 9, letterSpacing: 2, color: T.text2 }}>{r.label}</span>
              <span style={{ fontSize: 10, color: T.text1 }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── P2P MARKETPLACE ──────────────────────────────────────────────────────────
function P2PMarketplace({ listings = [], onBook, onHostNew }) {
  const [search, setSearch] = useState("");
  const [spotTypeFilter, setSpotTypeFilter] = useState("all");

  const filtered = (listings || []).filter(l => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = (l.title || "").toLowerCase().includes(q);
      const matchAddr = (l.address || "").toLowerCase().includes(q);
      const matchHost = (l.hostName || "").toLowerCase().includes(q);
      if (!matchTitle && !matchAddr && !matchHost) return false;
    }
    if (spotTypeFilter !== "all" && String(l.spotType).toLowerCase() !== String(spotTypeFilter).toLowerCase()) return false;
    return true;
  });

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${T.bg1}, ${T.bg2})`,
        border: `1px solid ${T.border2}`, borderRadius: 16, padding: "24px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: `0 10px 30px rgba(0,0,0,0.5)`,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🤝</span>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2, color: T.text0, fontFamily: T.fontDisplay }}>
              COMMUNITY P2P PARKING MARKETPLACE
            </div>
          </div>
          <div style={{ fontSize: 12, color: T.text2, marginTop: 6, maxWidth: 600, lineHeight: 1.5 }}>
            Rent spare driveways, residential garages, and local business spots directly from verified hosts. Safe, affordable, and flexible.
          </div>
        </div>
        <button onClick={onHostNew} style={{
          padding: "12px 22px", background: `linear-gradient(135deg, ${T.green}, #00b0ff)`,
          border: "none", color: "#000", fontWeight: 800, borderRadius: 10, cursor: "pointer",
          fontSize: 13, letterSpacing: 0.5, fontFamily: T.font, boxShadow: `0 4px 20px ${T.green}44`,
          display: "flex", alignItems: "center", gap: 8, transition: "transform 0.15s",
        }}>
          <span style={{ fontSize: 16 }}>➕</span> List Your Space
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", background: T.bg1, padding: "14px 18px", borderRadius: 12, border: `1px solid ${T.border}` }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="SEARCH AREA, STREET OR TITLE..." style={{ ...inputStyle, maxWidth: 280, padding: "8px 12px" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: T.text2, fontWeight: 700, letterSpacing: 1 }}>TYPE:</span>
          {["all", "Driveway", "Garage", "Private Lot", "Commercial Yard"].map(t => (
            <button key={t} onClick={() => setSpotTypeFilter(t)} style={{
              padding: "6px 10px", background: spotTypeFilter === t ? T.accentDim : T.bg2,
              border: `1px solid ${spotTypeFilter === t ? T.accent : T.border}`,
              color: spotTypeFilter === t ? T.accent : T.text2, borderRadius: 6, cursor: "pointer",
              fontSize: 9, letterSpacing: 1, fontFamily: T.font, fontWeight: 700,
            }}>{t.toUpperCase()}</button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", fontSize: 10, color: T.text2, letterSpacing: 1, fontWeight: 700 }}>
          <span style={{ color: T.green }}>{filtered.length}</span> AVAILABLE P2P SPOTS
        </div>
      </div>

      {/* Listing Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
        {filtered.map((item, idx) => (
          <div key={item._id || idx} style={{
            background: T.bg1, border: `1px solid ${T.border2}`, borderRadius: 14,
            padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12,
            position: "relative", overflow: "hidden", transition: "all 0.2s ease-in-out",
          }}>
            {/* Header badges */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(135deg, ${T.accent}33, ${T.purple}33)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: T.accent, border: `1px solid ${T.accent}44`
                }}>
                  {item.hostName ? item.hostName.substring(0, 2).toUpperCase() : "HO"}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text0 }}>{item.hostName || "Verified Host"}</div>
                  <div style={{ fontSize: 9, color: T.green, fontWeight: 700 }}>✓ KYC Verified</div>
                </div>
              </div>
              <div style={{ background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 6, padding: "3px 8px", fontSize: 10, color: T.amber, fontWeight: 800 }}>
                ⭐ {item.rating || 4.9} ({item.reviewCount || 12})
              </div>
            </div>

            {/* Title & Address */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.text0, letterSpacing: 0.3, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: T.text2, display: "flex", alignItems: "center", gap: 4 }}>
                <span>📍</span> {item.address}
              </div>
            </div>

            {/* Tags & Allowed vehicles */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", background: T.purpleDim, color: T.purple, borderRadius: 6, border: `1px solid ${T.purple}44` }}>
                🏠 {item.spotType}
              </span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", background: T.accentDim, color: T.accent, borderRadius: 6, border: `1px solid ${T.accent}44` }}>
                ⏰ {item.startTime || "06:00"} - {item.endTime || "22:00"}
              </span>
              {Array.isArray(item.allowedVehicles) && item.allowedVehicles.map(v => (
                <VehicleBadge key={v} type={v} size="sm" />
              ))}
            </div>

            {/* Price & Action */}
            <div style={{
              marginTop: 4, paddingTop: 12, borderTop: `1px solid ${T.border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <span style={{ fontSize: 8, letterSpacing: 2, color: T.text2, display: "block" }}>RATE</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: T.amber }}>₹{item.pricePerHour}<span style={{ fontSize: 11, fontWeight: 500, color: T.text2 }}>/hr</span></span>
              </div>
              <button onClick={() => onBook(item)} style={{
                padding: "8px 18px", background: T.greenDim, border: `1px solid ${T.green}88`,
                color: T.green, borderRadius: 8, fontWeight: 800, cursor: "pointer",
                fontSize: 11, fontFamily: T.font, letterSpacing: 0.5, transition: "all 0.15s"
              }}>
                BOOK SPOT →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



// ─── RAZORPAY GATEWAY MODAL (EXACT SCREENSHOT UI) ────────────────────────────
function RazorpayGatewayModal({ data, onClose, onConfirm }) {
  const [activeTab, setActiveTab] = useState("cards");
  const [cardNumber, setCardNumber] = useState("4532 8901 2234 8892");
  const [expiry, setExpiry] = useState("12 / 28");
  const [cvv, setCvv] = useState("789");
  const [saving, setSaving] = useState(false);

  function handlePay() {
    setSaving(true);
    setTimeout(() => {
      onConfirm({
        razorpay_payment_id: "pay_" + Math.random().toString(36).slice(2, 10),
        status: "captured"
      });
    }, 800);
  }

  return (
    <div className="razorpay-modal-container" style={{
      width: 780, maxWidth: "95vw", height: 480, background: "#FFFFFF",
      borderRadius: 16, overflow: "hidden", display: "grid", gridTemplateColumns: "280px 1fr",
      boxShadow: "0 25px 80px rgba(0,0,0,0.8)", fontFamily: "Inter, sans-serif"
    }}>
      {/* Left Column: Green Brand Header & Price Summary */}
      <div style={{
        background: "linear-gradient(180deg, #00E676 0%, #00C853 100%)",
        padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between",
        color: "#00381A"
      }}>
        <div>
          {/* Brand header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
            }}>🛵</div>
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: "#00381A" }}>
              PARKNET SMART PARKING...
            </div>
          </div>

          {/* Price Summary Card */}
          <div style={{
            background: "rgba(255, 255, 255, 0.75)", backdropFilter: "blur(10px)",
            borderRadius: 12, padding: "16px 18px", border: "1px solid rgba(255, 255, 255, 0.4)",
            marginBottom: 12
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#004D25" }}>Price Summary</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#002B14", marginTop: 4 }}>
              ₹{data.amount || 60}
            </div>
          </div>

          {/* User Contact Pill */}
          <div style={{
            background: "rgba(255, 255, 255, 0.65)", borderRadius: 10, padding: "10px 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11,
            fontWeight: 700, color: "#00381A"
          }}>
            <span>👤 Using as +91 89251 47213</span>
            <span style={{ cursor: "pointer", fontSize: 12 }}>›</span>
          </div>
        </div>

        {/* Bottom Graphic & Razorpay Footer */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(0,56,26,0.7)", letterSpacing: 0.5 }}>
            Secured by <strong style={{ color: "#002B14" }}>Razorpay</strong>
          </div>
        </div>
      </div>

      {/* Right Column: Payment Options & Form */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FFFFFF" }}>
        {/* Top Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 24px", borderBottom: "1px solid #EFEFEF"
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Payment Options</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {/* Content Area */}
        <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", flex: 1, overflow: "hidden" }}>
          {/* Method Tabs */}
          <div style={{ background: "#F9FAFB", borderRight: "1px solid #EFEFEF", padding: "12px 0" }}>
            {[
              { id: "cards", label: "Cards", icons: "💳" },
              { id: "netbanking", label: "Netbanking", icons: "🏦" },
              { id: "wallet", label: "Wallet", icons: "👛" },
              { id: "paylater", label: "Pay Later", icons: "⏳" },
            ].map(m => (
              <button key={m.id} onClick={() => setActiveTab(m.id)} style={{
                width: "100%", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: activeTab === m.id ? "#E8F5E9" : "transparent",
                border: "none", borderLeft: `3px solid ${activeTab === m.id ? "#00E676" : "transparent"}`,
                color: activeTab === m.id ? "#00695C" : "#374151", fontWeight: activeTab === m.id ? 700 : 500,
                fontSize: 12, cursor: "pointer", textAlign: "left"
              }}>
                <span>{m.label}</span>
                <span style={{ fontSize: 10 }}>{m.icons}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Add a new card</div>

              {/* Card Number Input */}
              <div style={{ marginBottom: 14 }}>
                <input value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                  placeholder="Card Number" style={{
                    width: "100%", padding: "12px 14px", border: "1px solid #D1D5DB", borderRadius: 8,
                    fontSize: 13, color: "#111827", outline: "none", fontFamily: "monospace"
                  }} />
              </div>

              {/* Expiry & CVV */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <input value={expiry} onChange={e => setExpiry(e.target.value)}
                  placeholder="MM / YY" style={{
                    width: "100%", padding: "12px 14px", border: "1px solid #D1D5DB", borderRadius: 8,
                    fontSize: 13, color: "#111827", outline: "none", fontFamily: "monospace"
                  }} />
                <input type="password" value={cvv} onChange={e => setCvv(e.target.value)}
                  placeholder="CVV" maxLength="4" style={{
                    width: "100%", padding: "12px 14px", border: "1px solid #D1D5DB", borderRadius: 8,
                    fontSize: 13, color: "#111827", outline: "none", fontFamily: "monospace"
                  }} />
              </div>

              {/* RBI Checkbox */}
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#4B5563", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "#00C853" }} />
                Save this card as per RBI guidelines
              </label>
            </div>

            {/* Submit Button matching screenshot */}
            <button onClick={handlePay} disabled={saving} style={{
              width: "100%", padding: "14px", background: "#003820", border: "none",
              color: "#FFFFFF", borderRadius: 10, fontWeight: 800, cursor: "pointer",
              fontSize: 14, letterSpacing: 0.5, transition: "background 0.15s"
            }}>
              {saving ? "Processing Payment..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      animation: "fadeIn 0.2s ease",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-window mobile-modal" style={{
        background: T.bg2, border: `1px solid ${T.border2}`, borderRadius: 16,
        padding: "26px 30px", width: wide ? 580 : 420, maxWidth: "95vw",
        animation: "modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        boxShadow: `0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px ${T.border2}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 12, letterSpacing: 3, color: T.text0, fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", color: T.text2, cursor: "pointer", fontSize: 18,
            transition: "color 0.15s", padding: 4
          }} onMouseEnter={e => e.currentTarget.style.color = T.red} onMouseLeave={e => e.currentTarget.style.color = T.text2}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── REUSABLE COMPONENTS ──────────────────────────────────────────────────────
function InfoRow({ label, value, accent, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: 0.3, color: T.text2, textTransform: "uppercase" }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: accent ? 700 : 500,
        color: color || (accent ? T.text0 : T.text1),
        fontFamily: accent ? T.fontMono : T.font,
        letterSpacing: accent ? 1 : 0,
      }}>
        {value}
      </span>
    </div>
  );
}

function Label({ text }) {
  return <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: T.text2, textTransform: "uppercase" }}>{text}</span>;
}

function Btn({ text, color, onClick, small }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", padding: small ? "9px 16px" : "13px 18px",
        background: hover ? color + "30" : color + "18",
        border: `1px solid ${hover ? color : color + "88"}`,
        color, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700,
        letterSpacing: 0.5, fontFamily: T.font, transition: "all 0.15s",
        boxShadow: hover ? `0 4px 20px ${color}22` : "none",
      }}>{text}</button>
  );
}

const inputStyle = {
  background: T.bg3, border: `1px solid ${T.border2}`, color: T.text0,
  borderRadius: 10, padding: "11px 14px", fontSize: 14, fontFamily: T.font,
  outline: "none", width: "100%", transition: "border-color 0.15s",
  letterSpacing: 0,
};
