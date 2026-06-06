'use client';
import { Truck, UserCheck, X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { db } from '@/lib/firebase/firebase';
import {
  collection, getDocs, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis,
} from 'recharts';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const REGIONS   = ["Dakar","Thiès","Casamance","Saint-Louis","Ziguinchor","Kaolack","Fatick","Kolda","Kédougou","Kaffrine","Louga","Matam","Sédhiou","Tambacounda"];
const CATEGORIES= ["Fruits","Légumes","Céréales","Tubercules","Poissons","Condiments"];
const PALETTE   = ["#00ff87","#00d4ff","#ff6b35","#f7c948","#c77dff","#ff4d6d","#48cae4","#80ffdb"];

// ─────────────────────────────────────────────
// SVG ICON PATHS
// ─────────────────────────────────────────────
const P: Record<string,string> = {
  dashboard : "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  orders    : "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-5v-2h5v2zm5-4h-5v-2h5v2zm0-4h-5V7h5v2z",
  users     : "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-1 .05 1.16.84 2 1.87 2 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  box       : "M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.82-1h12l.93 1H5.12z",
  revenue   : "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z",
  map       : "M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.1V5l6 2.1v11.9z",
  settings  : "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.08-.47-.12-.61l-2.01-1.58zM12 15.6c-2 0-3.6-1.6-3.6-3.6s1.6-3.6 3.6-3.6 3.6 1.6 3.6 3.6-1.6 3.6-3.6 3.6z",
  leaf      : "M17 8C8 10 5.9 16.17 3.82 19.33a1 1 0 001.66.9C9.35 17.3 13 13 17 8zm2-6c-1 3-3 6-5 8-2 1-3 2-4 3 2-1 4-3 6-5 2-2 3-5 3-6z",
  search    : "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  bell      : "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.93 6 11v5l-2 2v1h16v-1l-2-2z",
  logout    : "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
  check     : "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z",
  clock     : "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  cancel    : "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z",
  wait      : "M6 2v6l2.5 2.5L6 13v6h12v-6l-2.5-2.5L18 8V2H6zm10 12.5V18H8v-3.5l4-4 4 4zm-4-5l-4-4h8l-4 4z",
  down      : "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  refresh   : "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  star      : "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  arrow     : "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z",
  up        : "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z",
  dn        : "M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z",
  alert     : "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  wa        : "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.121 1.531 5.856L.073 23.27a.75.75 0 00.918.882l5.57-1.461A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.73 9.73 0 01-4.964-1.363l-.355-.212-3.676.965.978-3.576-.232-.368A9.713 9.713 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z",
  plus      : "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
};

function Ico({ n, s = 16, c = "currentColor" }: { n: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c} style={{ flexShrink: 0 }}>
      <path d={P[n] || P.dashboard} />
    </svg>
  );
}

// ─────────────────────────────────────────────
// ANIMATED COUNTER
// ─────────────────────────────────────────────
function Counter({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = performance.now();
    const run = (now: number) => {
      const t = Math.min((now - start) / 1200, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(ease * to));
      if (t < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [to]);
  return <>{prefix}{val.toLocaleString('fr-FR')}{suffix}</>;
}

// ─────────────────────────────────────────────
// SPARKLINE
// ─────────────────────────────────────────────
function Spark({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const W = 80, H = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

// ─────────────────────────────────────────────
// STATUS PILL
// ─────────────────────────────────────────────
const STATUS_MAP: Record<string, { dot: string; text: string; bg: string }> = {
  "Livrée":    { dot: "#00ff87", text: "#00ff87", bg: "rgba(0,255,135,0.08)" },
  "En cours":  { dot: "#f7c948", text: "#f7c948", bg: "rgba(247,201,72,0.08)" },
  "Annulée":   { dot: "#ff4d6d", text: "#ff4d6d", bg: "rgba(255,77,109,0.08)" },
  "En attente":{ dot: "#c77dff", text: "#c77dff", bg: "rgba(199,125,255,0.08)" },
};
function Pill({ s }: { s: string }) {
  const m = STATUS_MAP[s] || STATUS_MAP["En attente"];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px",
      borderRadius:99, background:m.bg, color:m.text, fontSize:10, fontWeight:600,
      border:`1px solid ${m.dot}25`, letterSpacing:"0.04em" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.dot, display:"inline-block" }} />
      {s}
    </span>
  );
}

// ─────────────────────────────────────────────
// GLASS CARD
// ─────────────────────────────────────────────
function Glass({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      backdropFilter: "blur(24px)",
      borderRadius: 20,
      ...style,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(16px)",
      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"92%", maxWidth:480, background:"#0c1a10",
        border:"1px solid rgba(0,255,135,0.15)", borderRadius:24, overflow:"hidden",
        boxShadow:"0 40px 120px rgba(0,0,0,0.8), 0 0 60px rgba(0,255,135,0.05)",
        animation:"modalIn 0.25s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ padding:"18px 22px", borderBottom:"1px solid rgba(255,255,255,0.05)",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:"#fff" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)",
            cursor:"pointer", fontSize:20, lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding:22 }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0c1a10", border:"1px solid rgba(0,255,135,0.2)", borderRadius:12,
      padding:"10px 14px", fontSize:11 }}>
      <div style={{ color:"rgba(255,255,255,0.4)", marginBottom:6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color:p.color, fontWeight:600 }}>
          {(p.value / 1000000).toFixed(1)}M FCFA
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// LIVE FEED TICKER
// ─────────────────────────────────────────────
function Ticker({ orders }: { orders: any[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!orders.length) return;
    const t = setInterval(() => setI(x => (x + 1) % orders.length), 2500);
    return () => clearInterval(t);
  }, [orders.length]);
  const o = orders[i];
  if (!o) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, overflow:"hidden" }}>
      <div style={{ width:6, height:6, borderRadius:"50%", background:"#00ff87", flexShrink:0,
        boxShadow:"0 0 8px #00ff87", animation:"blink 1.4s ease infinite" }} />
      <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", whiteSpace:"nowrap" }}>
        <span style={{ color:"#00ff87", fontWeight:700, fontFamily:"monospace" }}>{o.orderNumber || o.id?.slice(-8)}</span>
        {" · "}<span style={{ color:"rgba(255,255,255,0.6)" }}>{o.farmer}</span>
        {" · "}<span style={{ color:"#f7c948", fontWeight:600 }}>{(o.amount||0).toLocaleString('fr-FR')} FCFA</span>
        {" · "}{o.region}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────
function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
      marginBottom:20, flexWrap:"wrap", gap:10 }}>
      <div>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20,
          color:"#fff", letterSpacing:"-0.4px", margin:0 }}>{title}</h2>
        {sub && <p style={{ fontSize:11, color:"rgba(255,255,255,0.3)", margin:"3px 0 0" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────
// EXPORT BUTTON
// ─────────────────────────────────────────────
function ExportBtn({ data, name }: { data: any[]; name: string }) {
  const go = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Export réussi');
  };
  return (
    <button onClick={go} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
      borderRadius:10, background:"rgba(0,255,135,0.08)", border:"1px solid rgba(0,255,135,0.2)",
      color:"#00ff87", fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:"0.06em" }}>
      <Ico n="down" s={13} c="currentColor" /> EXPORT
    </button>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function AgriDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [nav, setNav]               = useState("dashboard");
  const [orders, setOrders]         = useState<any[]>([]);
  const [products, setProducts]     = useState<any[]>([]);
  const [users, setUsers]           = useState<any[]>([]);
  const [reviews, setReviews]       = useState<any[]>([]);
  const [loans, setLoans]           = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [heatmap, setHeatmap]       = useState<any[]>([]);

  const [q, setQ]                   = useState("");
  const [filterStatus, setFilterStatus] = useState("Tous");
  const [sortCol, setSortCol]       = useState("time");
  const [sortDir, setSortDir]       = useState(-1);
  const [page, setPage]             = useState(0);
  const PAGE = 10;

  const [sideOpen, setSideOpen]     = useState(true);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [mounted, setMounted]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [chartType, setChartType]   = useState<'area'|'bar'|'line'>('area');

  const [modalUser, setModalUser]   = useState<any>(null);
  const [modalLoan, setModalLoan]   = useState<any>(null);

  const [assignModal, setAssignModal] = useState<{ open: boolean; orderId: string | null; orderNumber: string }>({
    open: false,
    orderId: null,
    orderNumber: '',
  });
  const [deliveryList, setDeliveryList] = useState<any[]>([]);
  const [loadingDelivery, setLoadingDelivery] = useState(false);

  const [tick, setTick]             = useState(0);
  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTick(x => x + 1), 5000);
    return () => clearInterval(t);
  }, []);

  // ── AUTH GUARD ──────────────────────────────
  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push('/auth/login');
      else if (profile?.role !== 'admin') router.push('/');
      else toast.success(`Bienvenue ${profile?.displayName || 'Admin'} 👑`);
    }
  }, [authLoading, user, profile, router]);

  // ── FIRESTORE ───────────────────────────────
  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;

    const unsub = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        const data = snap.docs.map(d => {
          const v = d.data();
          return {
            id: d.id,
            orderNumber: v.orderNumber || d.id.slice(-8).toUpperCase(),
            farmer: v.sellerName || v.userName || 'Producteur',
            category: v.items?.[0]?.category || 'Produit',
            region: v.customerLocation?.region || v.sellerRegion || 'Dakar',
            amount: v.total || v.sellerAmount || 0,
            qty: v.itemCount || 1,
            time: v.createdAt?.toDate?.()?.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) || '--:--',
            status:
              v.status === 'livree'   ? 'Livrée' :
              v.status === 'expediee' ? 'En cours' :
              v.status === 'annulee'  ? 'Annulée' : 'En attente',
            statusRaw: v.status,
            createdAt: v.createdAt,
          };
        });
        setOrders(data);
        setLoading(false);

        // Build monthly revenue
        const months = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
        const rev = months.map(m => ({ month:m, revenue:0, orders:0 }));
        data.forEach(o => {
          const d = o.createdAt?.toDate?.();
          if (d && o.statusRaw !== 'annulee') {
            rev[d.getMonth()].revenue += o.amount;
            rev[d.getMonth()].orders  += 1;
          }
        });
        setRevenueData(rev);

        const maxAmt = Math.max(...data.map(o => o.amount), 1);
        setHeatmap(REGIONS.map(r => {
          const ro = data.filter(o => o.region === r);
          const total = ro.reduce((s, o) => s + o.amount, 0);
          return { region:r, value:Math.round((total/maxAmt)*100), revenue:total, orders:ro.length };
        }));
      }
    );

    const load = async (col: string, setter: (d: any[]) => void) => {
      const snap = await getDocs(collection(db, col));
      setter(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    };
    load('products', setProducts);
    load('users',    setUsers);
    load('reviews',  setReviews);
    load('loans',    setLoans);

    return () => unsub();
  }, [user, profile]);

  // ── KPIs ────────────────────────────────────
  const totalRevenue  = orders.reduce((s,o) => s + (o.status !== 'Annulée' ? o.amount : 0), 0);
  const delivered     = orders.filter(o => o.status === 'Livrée').length;
  const farmers       = [...new Set(orders.map(o => o.farmer))].length;
  const avgRating     = reviews.length ? +(reviews.reduce((s,r) => s + (r.rating||0), 0)/reviews.length).toFixed(1) : 0;
  const pendingLoans  = loans.filter(l => l.status === 'pending').length;

  const spark = (n: number) => Array.from({length:12}, () => Math.floor(Math.random()*n + n*0.4));

  const KPIS = [
    { label:"Revenus totaux",  val:totalRevenue,   suf:" FCFA", color:"#00ff87", icon:"revenue", trend:+12.4, sp:spark(2000000) },
    { label:"Commandes",       val:orders.length,  suf:"",      color:"#00d4ff", icon:"orders",  trend:+8.1,  sp:spark(150) },
    { label:"Livrées",         val:delivered,      suf:"",      color:"#f7c948", icon:"check",   trend:+3.2,  sp:spark(100) },
    { label:"Producteurs",     val:farmers,        suf:"",      color:"#c77dff", icon:"users",   trend:+5.7,  sp:spark(12) },
    { label:"Note /5",         val:avgRating,      suf:"/5",    color:"#ff6b35", icon:"star",    trend:+0.3,  sp:spark(20) },
    { label:"Financements",    val:pendingLoans,   suf:"",      color:"#ff4d6d", icon:"revenue", trend:+2.1,  sp:spark(8) },
  ];

  // ── TABLE ───────────────────────────────────
  const filtered = orders
    .filter(o =>
      (filterStatus === 'Tous' || o.status === filterStatus) &&
      (!q || [o.orderNumber, o.farmer, o.region].some(v => v?.toLowerCase().includes(q.toLowerCase())))
    )
    .sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      return typeof av === 'number' ? (av - bv) * sortDir
        : (av||'').toString().localeCompare((bv||'').toString()) * sortDir;
    });
  const pageData = filtered.slice(page*PAGE, (page+1)*PAGE);
  const pages    = Math.ceil(filtered.length / PAGE);

  // ── MUTATIONS ───────────────────────────────
  const updateUserRole = async (id: string, role: string) => {
    await updateDoc(doc(db,'users',id), { role });
    setUsers(us => us.map(u => u.id === id ? { ...u, role } : u));
    toast.success('Rôle mis à jour');
  };
  const deleteUser = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await deleteDoc(doc(db,'users',id));
    setUsers(us => us.filter(u => u.id !== id));
    toast.success('Utilisateur supprimé');
  };
  const updateLoan = async (id: string, status: 'approved'|'rejected') => {
    await updateDoc(doc(db,'loans',id), { status, approvedAt: new Date() });
    setLoans(ls => ls.map(l => l.id === id ? { ...l, status } : l));
    toast.success(status === 'approved' ? 'Financement approuvé ✓' : 'Financement refusé');
  };
  const sendNotif = async (userId: string) => {
    await fetch('/api/notifications/send', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ userId, title:'AgriMarché', body:'Message de l\'administration.' }),
    });
    toast.success('Notification envoyée');
  };

  const handleAssignClick = async (orderId: string, orderNumber: string) => {
    setAssignModal({ open: true, orderId, orderNumber });
    setLoadingDelivery(true);
    try {
      const res = await fetch('/api/delivery/list');
      const data = await res.json();
      if (data.success) {
        setDeliveryList(data.deliveryPersons);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDelivery(false);
    }
  };

  const handleAssignDelivery = async (deliveryId: string, deliveryName: string, deliveryPhone: string) => {
    if (!assignModal.orderId) return;
    
    try {
      const res = await fetch('/api/orders/assign-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: assignModal.orderId,
          deliveryId,
          deliveryName,
          deliveryPhone,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Livreur ${deliveryName} assigné !`);
        setAssignModal({ open: false, orderId: null, orderNumber: '' });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error('Erreur lors de l\'assignation');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur serveur');
    }
  };

  // ── CATEGORY DATA ───────────────────────────
  const catData = CATEGORIES.map(c => ({
    label:c, value: products.filter(p => p.category === c).length
  })).filter(c => c.value > 0);

  // ── GUARDS ──────────────────────────────────
  if (!mounted || authLoading || loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#060e09", display:"flex",
        alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
        <div style={{ position:"relative", width:56, height:56 }}>
          <div style={{ position:"absolute", inset:0, border:"2px solid rgba(0,255,135,0.15)",
            borderTop:"2px solid #00ff87", borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
          <div style={{ position:"absolute", inset:"12px", border:"2px solid rgba(0,255,135,0.08)",
            borderBottom:"2px solid #00d4ff", borderRadius:"50%", animation:"spin 1.4s linear infinite reverse" }} />
        </div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:11, color:"rgba(255,255,255,0.25)",
          letterSpacing:"0.2em" }}>CHARGEMENT</div>
      </div>
    );
  }
  if (!user || profile?.role !== 'admin') return null;

  const NAV_ITEMS = [
    { id:"dashboard", label:"Vue d'ensemble", icon:"dashboard" },
    { id:"orders",    label:"Commandes",       icon:"orders" },
    { id:"users",     label:"Utilisateurs",    icon:"users" },
    { id:"products",  label:"Produits",        icon:"box" },
    { id:"loans",     label:"Financements",    icon:"revenue" },
    { id:"map",       label:"Carte régionale", icon:"map" },
    { id:"settings",  label:"Paramètres",      icon:"settings" },
  ];

  return (
  <AdminGuard>
    <div style={{ display:"flex", height:"100vh", background:"#060e09",
      fontFamily:"'DM Sans', sans-serif", overflow:"hidden" }}>

      <Toaster position="top-right" toastOptions={{
        style:{ background:"#0c1a10", color:"#fff", border:"1px solid rgba(0,255,135,0.2)",
          borderRadius:12, fontSize:12, fontFamily:"'DM Sans',sans-serif" }
      }} />

      {/* ─── GLOBAL STYLES ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::selection{background:#00ff8730;color:#fff}
        ::-webkit-scrollbar{width:2px;height:2px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,255,135,0.2);border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.96) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,255,135,0.3)}50%{box-shadow:0 0 0 8px rgba(0,255,135,0)}}
        .nav-btn{transition:all 0.2s;cursor:pointer}
        .nav-btn:hover{background:rgba(255,255,255,0.04)!important}
        .row-hover{transition:background 0.15s;cursor:default}
        .row-hover:hover{background:rgba(0,255,135,0.025)!important}
        .chip{transition:all 0.2s;cursor:pointer}
        .chip:hover{opacity:0.85}
        .icon-btn{transition:all 0.2s;cursor:pointer}
        .icon-btn:hover{background:rgba(255,255,255,0.07)!important}
        .sort-th{cursor:pointer;user-select:none;transition:color 0.2s}
        .sort-th:hover{color:rgba(255,255,255,0.7)!important}
        input[type=text]:focus,input[type=search]:focus{outline:none!important}
        select{outline:none}
      `}</style>

      {/* ═══════════════════════════════════════
          BACKGROUND AMBIENCE
      ═══════════════════════════════════════ */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        {/* grid */}
        <div style={{ position:"absolute", inset:0, backgroundImage:
          "linear-gradient(rgba(0,255,135,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,135,0.025) 1px,transparent 1px)",
          backgroundSize:"52px 52px" }} />
        {/* radial glows */}
        <div style={{ position:"absolute", top:"-20%", left:"10%", width:600, height:600,
          background:"radial-gradient(circle, rgba(0,255,135,0.06) 0%, transparent 70%)",
          borderRadius:"50%" }} />
        <div style={{ position:"absolute", bottom:"10%", right:"5%", width:400, height:400,
          background:"radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)",
          borderRadius:"50%" }} />
      </div>

      {/* ═══════════════════════════════════════
          SIDEBAR
      ═══════════════════════════════════════ */}
      <aside style={{
        width: sideOpen ? 228 : 64,
        flexShrink: 0,
        background: "rgba(6,14,9,0.98)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column",
        transition: "width 0.3s cubic-bezier(.16,1,.3,1)",
        position: "relative", zIndex: 10, overflow: "hidden",
      }}>

        {/* Logo */}
        <div style={{ padding:"20px 16px 16px", borderBottom:"1px solid rgba(255,255,255,0.05)",
          display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ width:34, height:34, borderRadius:10, flexShrink:0,
            background:"linear-gradient(135deg, #00c952, #00ff87)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 0 20px rgba(0,255,135,0.3)", animation:"pulse 3s ease infinite" }}>
            <Ico n="leaf" s={17} c="#060e09" />
          </div>
          {sideOpen && (
            <div style={{ animation:"fadeIn 0.25s ease" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14,
                color:"#fff", letterSpacing:"-0.3px", lineHeight:1 }}>AGRIMARCHÉ</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:8,
                color:"#00ff87", letterSpacing:"3px", marginTop:3, opacity:0.8 }}>SÉNÉGAL · ADMIN</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"14px 10px", overflow:"hidden" }}>
          {sideOpen && (
            <div style={{ fontSize:8, fontWeight:700, letterSpacing:"0.18em",
              color:"rgba(255,255,255,0.18)", padding:"0 8px", marginBottom:10 }}>NAVIGATION</div>
          )}
          {NAV_ITEMS.map(item => {
            const active = nav === item.id;
            return (
              <div key={item.id} className="nav-btn" onClick={() => setNav(item.id)} style={{
                display:"flex", alignItems:"center", gap:11, padding:"9px 8px",
                borderRadius:11, marginBottom:2, whiteSpace:"nowrap",
                background: active ? "rgba(0,255,135,0.08)" : "transparent",
                color: active ? "#00ff87" : "rgba(255,255,255,0.38)",
                borderLeft: active ? "2px solid #00ff87" : "2px solid transparent",
              }}>
                <Ico n={item.icon} s={16} c="currentColor" />
                {sideOpen && (
                  <span style={{ fontSize:12, fontWeight:500 }}>{item.label}</span>
                )}
              </div>
            );
          })}
        </nav>

        {/* System status */}
        {sideOpen && (
          <div style={{ margin:"0 10px 10px", padding:"12px", borderRadius:12,
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize:8, fontWeight:700, letterSpacing:"0.18em",
              color:"rgba(255,255,255,0.2)", marginBottom:10 }}>STATUT SYSTÈME</div>
            {[["API", 99.9],["DB", 100],["CDN", 98.1]].map(([lbl, pct]) => (
              <div key={lbl as string} style={{ display:"flex", alignItems:"center",
                justifyContent:"space-between", marginBottom:7 }}>
                <span style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>{lbl}</span>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:32, height:2, borderRadius:1,
                    background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%",
                      background:"#00ff87", borderRadius:1 }} />
                  </div>
                  <span style={{ fontSize:9, color:"#00ff87", fontWeight:600,
                    fontFamily:"monospace" }}>{pct}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quit */}
        <div style={{ padding:"0 10px 16px" }}>
          <div className="nav-btn" onClick={() => router.push('/')} style={{
            display:"flex", alignItems:"center", gap:11, padding:"9px 8px",
            borderRadius:11, color:"rgba(255,77,109,0.5)", whiteSpace:"nowrap" }}>
            <Ico n="logout" s={16} c="currentColor" />
            {sideOpen && <span style={{ fontSize:12 }}>Quitter</span>}
          </div>
        </div>

        {/* Toggle */}
        <button onClick={() => setSideOpen(v => !v)} style={{
          position:"absolute", right:-10, top:"50%", transform:"translateY(-50%)",
          width:20, height:20, borderRadius:"50%", background:"#0c1a10",
          border:"1px solid rgba(0,255,135,0.2)", display:"flex", alignItems:"center",
          justifyContent:"center", cursor:"pointer", color:"#00ff87", zIndex:20 }}>
          <Ico n="arrow" s={10} c="currentColor" />
        </button>
      </aside>

      {/* ═══════════════════════════════════════
          MAIN
      ═══════════════════════════════════════ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative", zIndex:1 }}>

        {/* ── TOPBAR ─────────────────────────── */}
        <header style={{ height:56, flexShrink:0,
          borderBottom:"1px solid rgba(255,255,255,0.05)",
          background:"rgba(6,14,9,0.9)", backdropFilter:"blur(20px)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 24px", gap:16 }}>

          <div style={{ flex:1, overflow:"hidden", minWidth:0 }}>
            <Ticker orders={orders} />
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            {/* Live badge */}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px",
              background:"rgba(0,255,135,0.06)", border:"1px solid rgba(0,255,135,0.12)",
              borderRadius:20 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#00ff87",
                animation:"blink 1.4s ease infinite" }} />
              <span style={{ fontSize:9, fontWeight:700, color:"#00ff87",
                letterSpacing:"1.5px" }}>LIVE</span>
            </div>

            {[
              { icon:"down",    title:"Export",   fn: () => { const ws=XLSX.utils.json_to_sheet(orders); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Orders'); XLSX.writeFile(wb,`orders_${Date.now()}.xlsx`); toast.success('Export réussi'); } },
              { icon:"refresh", title:"Refresh",  fn: () => window.location.reload() },
            ].map(btn => (
              <button key={btn.icon} className="icon-btn" title={btn.title} onClick={btn.fn} style={{
                width:34, height:34, borderRadius:9, background:"rgba(255,255,255,0.03)",
                border:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center",
                justifyContent:"center", color:"rgba(255,255,255,0.4)" }}>
                <Ico n={btn.icon} s={14} c="currentColor" />
              </button>
            ))}

            {/* Notif */}
            <div style={{ position:"relative" }}>
              <button className="icon-btn" onClick={() => setNotifOpen(v=>!v)} style={{
                width:34, height:34, borderRadius:9, background:"rgba(255,255,255,0.03)",
                border:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center",
                justifyContent:"center", color:"rgba(255,255,255,0.4)", position:"relative" }}>
                <Ico n="bell" s={14} c="currentColor" />
                <span style={{ position:"absolute", top:7, right:7, width:7, height:7,
                  borderRadius:"50%", background:"#ff4d6d",
                  border:"1.5px solid #060e09" }} />
              </button>

              {notifOpen && (
                <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", width:296,
                  background:"#0c1a10", border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:16, overflow:"hidden", zIndex:100,
                  boxShadow:"0 24px 60px rgba(0,0,0,0.7)", animation:"fadeUp 0.2s ease" }}>
                  <div style={{ padding:"14px 16px 10px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                      fontSize:13, color:"#fff" }}>Notifications</span>
                  </div>
                  {[
                    { text:"Pic de commandes à Dakar",        time:"il y a 2 min",  type:"alert" },
                    { text:"Nouveau producteur vérifié",       time:"il y a 8 min",  type:"check" },
                    { text:"Stock critique – Tomates Casamance", time:"il y a 15 min", type:"alert" },
                    { text:"Rapport mensuel disponible",       time:"il y a 1h",     type:"down" },
                  ].map((n, i) => (
                    <div key={i} className="row-hover" style={{ padding:"11px 16px",
                      borderBottom:"1px solid rgba(255,255,255,0.03)",
                      display:"flex", gap:10, alignItems:"flex-start" }}>
                      <div style={{ width:26, height:26, borderRadius:7, flexShrink:0,
                        background: n.type === "alert" ? "rgba(255,77,109,0.1)" : "rgba(0,255,135,0.08)",
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Ico n={n.type} s={12} c={n.type === "alert" ? "#ff4d6d" : "#00ff87"} />
                      </div>
                      <div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", lineHeight:1.4 }}>{n.text}</div>
                        <div style={{ fontSize:9, color:"rgba(255,255,255,0.22)", marginTop:3 }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar */}
            <div style={{ width:34, height:34, borderRadius:9,
              background:"linear-gradient(135deg,#00c952,#00ff87)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:13, color:"#060e09",
              cursor:"pointer", boxShadow:"0 0 14px rgba(0,255,135,0.3)" }}>
              {profile?.displayName?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        {/* ── SCROLL AREA ─────────────────────── */}
        <main style={{ flex:1, overflow:"auto", padding:"28px 28px 40px" }}>

          {/* Page title */}
          <div style={{ marginBottom:28, animation:"fadeUp 0.4s ease" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28,
                color:"#fff", letterSpacing:"-0.6px" }}>
                {NAV_ITEMS.find(n => n.id === nav)?.label}
              </h1>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em",
                color:"#00ff87", background:"rgba(0,255,135,0.08)",
                border:"1px solid rgba(0,255,135,0.15)", padding:"2px 9px", borderRadius:20 }}>LIVE</span>
            </div>
            <p style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:4, fontFamily:"monospace" }}>
              {new Date().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
              {" · "}mis à jour il y a {tick % 5 === 0 ? 'quelques' : tick % 5} secondes
            </p>
          </div>

          {/* ══════════════════════════════════
              DASHBOARD
          ══════════════════════════════════ */}
          {nav === "dashboard" && (
            <>
              {/* KPI GRID */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",
                gap:12, marginBottom:24 }}>
                {KPIS.map((k, i) => (
                  <Glass key={k.label} style={{ padding:"18px", animation:`fadeUp 0.4s ease ${i*60}ms both`,
                    position:"relative", overflow:"hidden" }}>
                    {/* accent line */}
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
                      background:`linear-gradient(90deg, ${k.color}, transparent)`,
                      borderRadius:"20px 20px 0 0" }} />
                    <div style={{ display:"flex", alignItems:"flex-start",
                      justifyContent:"space-between", marginBottom:14 }}>
                      <div style={{ width:34, height:34, borderRadius:10,
                        background:`${k.color}12`, display:"flex", alignItems:"center",
                        justifyContent:"center", border:`1px solid ${k.color}25` }}>
                        <Ico n={k.icon} s={16} c={k.color} />
                      </div>
                      <Spark data={k.sp} color={k.color} />
                    </div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
                      fontSize:24, color:"#fff", lineHeight:1, marginBottom:6 }}>
                      <Counter to={k.val} suffix={k.suf} />
                    </div>
                    <div style={{ display:"flex", alignItems:"center",
                      justifyContent:"space-between" }}>
                      <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)",
                        fontWeight:500 }}>{k.label}</span>
                      <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                        <Ico n={k.trend > 0 ? "up" : "dn"} s={11}
                          c={k.trend > 0 ? "#00ff87" : "#ff4d6d"} />
                        <span style={{ fontSize:10, fontWeight:600,
                          color:k.trend > 0 ? "#00ff87" : "#ff4d6d" }}>
                          {k.trend > 0 ? "+" : ""}{k.trend}%
                        </span>
                      </div>
                    </div>
                  </Glass>
                ))}
              </div>

              {/* CHARTS ROW */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginBottom:24 }}>

                {/* Revenue chart */}
                <Glass style={{ padding:"22px", animation:"fadeUp 0.4s ease 0.1s both" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    marginBottom:20, flexWrap:"wrap", gap:10 }}>
                    <div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                        fontSize:14, color:"#fff" }}>Revenus mensuels</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)", marginTop:3 }}>
                        Évolution 2024 · FCFA
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:5 }}>
                      {(['area','bar','line'] as const).map(t => (
                        <button key={t} className="chip" onClick={() => setChartType(t)} style={{
                          padding:"4px 10px", borderRadius:7, fontSize:9, fontWeight:600,
                          background: chartType === t ? "rgba(0,255,135,0.12)" : "transparent",
                          border:`1px solid ${chartType === t ? "rgba(0,255,135,0.3)" : "rgba(255,255,255,0.06)"}`,
                          color: chartType === t ? "#00ff87" : "rgba(255,255,255,0.3)",
                          cursor:"pointer", letterSpacing:"0.06em" }}>{t.toUpperCase()}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ height:240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'area' ? (
                        <AreaChart data={revenueData}>
                          <defs>
                            <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#00ff87" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#00ff87" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="month" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => `${(v/1e6).toFixed(0)}M`} tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTip />} />
                          <Area type="monotone" dataKey="revenue" stroke="#00ff87"
                            strokeWidth={2} fill="url(#gRev)" dot={false} />
                        </AreaChart>
                      ) : chartType === 'bar' ? (
                        <BarChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="month" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => `${(v/1e6).toFixed(0)}M`} tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTip />} />
                          <Bar dataKey="revenue" fill="#00ff87" radius={[4,4,0,0]} opacity={0.85} />
                        </BarChart>
                      ) : (
                        <LineChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="month" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => `${(v/1e6).toFixed(0)}M`} tick={{ fill:"rgba(255,255,255,0.3)", fontSize:9 }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTip />} />
                          <Line type="monotone" dataKey="revenue" stroke="#00ff87"
                            strokeWidth={2} dot={{ fill:"#00ff87", r:3, strokeWidth:0 }} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display:"flex", gap:20, marginTop:14, paddingTop:14,
                    borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                    {[
                      { lbl:"Total annuel", val:`${(revenueData.reduce((s,r)=>s+r.revenue,0)/1e6).toFixed(1)}M FCFA`, col:"#00ff87" },
                      { lbl:"Moy. mensuelle", val:`${(revenueData.reduce((s,r)=>s+r.revenue,0)/12/1e6).toFixed(1)}M FCFA`, col:"#fff" },
                      { lbl:"Commandes total", val:orders.length.toLocaleString('fr-FR'), col:"#00d4ff" },
                    ].map(s => (
                      <div key={s.lbl}>
                        <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:3 }}>{s.lbl}</div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:s.col }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </Glass>

                {/* Right column */}
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                  {/* Pie */}
                  <Glass style={{ padding:"20px", flex:1 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                      fontSize:13, color:"#fff", marginBottom:14 }}>Catégories</div>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <PieChart width={90} height={90}>
                        <Pie data={catData} cx={45} cy={45} innerRadius={28}
                          outerRadius={40} paddingAngle={2} dataKey="value">
                          {catData.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                      </PieChart> <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                        {catData.slice(0,5).map((c, i) => (
                          <div key={c.label} style={{ display:"flex", alignItems:"center",
                            justifyContent:"space-between" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div style={{ width:7, height:7, borderRadius:2,
                                background:PALETTE[i%PALETTE.length] }} />
                              <span style={{ fontSize:10, color:"rgba(255,255,255,0.45)" }}>{c.label}</span>
                            </div>
                            <span style={{ fontSize:10, fontWeight:600, color:"#fff",
                              fontFamily:"monospace" }}>{c.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Glass>

                  {/* Region heatmap */}
                  <Glass style={{ padding:"20px", flex:1 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                      fontSize:13, color:"#fff", marginBottom:14 }}>Par région</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {heatmap.sort((a,b) => b.value-a.value).map((r, i) => (
                        <div key={r.region}>
                          <div style={{ display:"flex", justifyContent:"space-between",
                            marginBottom:4 }}>
                            <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>{r.region}</span>
                            <span style={{ fontSize:10, fontWeight:600, color:"#00ff87",
                              fontFamily:"monospace" }}>{(r.revenue/1e6).toFixed(1)}M</span>
                          </div>
                          <div style={{ height:3, background:"rgba(255,255,255,0.05)", borderRadius:2 }}>
                            <div style={{ height:"100%", borderRadius:2, width:`${r.value}%`,
                              background:`linear-gradient(90deg, ${PALETTE[i%PALETTE.length]}, ${PALETTE[(i+2)%PALETTE.length]})`,
                              transition:"width 1.2s cubic-bezier(.16,1,.3,1)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Glass>
                </div>
              </div>

              {/* ORDERS TABLE (dashboard preview) */}
              <Glass style={{ overflow:"hidden", animation:"fadeUp 0.4s ease 0.3s both" }}>
                <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.05)",
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  flexWrap:"wrap", gap:10 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                    fontSize:13, color:"#fff" }}>Journal des commandes</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <div style={{ position:"relative" }}>
                      <span style={{ position:"absolute", left:10, top:"50%",
                        transform:"translateY(-50%)", opacity:0.35 }}>
                        <Ico n="search" s={13} c="#fff" />
                      </span>
                      <input type="text" value={q} onChange={e => { setQ(e.target.value); setPage(0); }}
                        placeholder="Rechercher…" style={{ height:32, paddingLeft:32, paddingRight:12,
                          background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)",
                          borderRadius:9, color:"#fff", fontSize:11, width:200,
                          fontFamily:"'DM Sans',sans-serif", transition:"border 0.2s" }}
                        onFocus={e => e.target.style.borderColor="rgba(0,255,135,0.4)"}
                        onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.07)"} />
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      {["Tous","Livrée","En cours","Annulée","En attente"].map(s => (
                        <button key={s} className="chip" onClick={() => { setFilterStatus(s); setPage(0); }} style={{
                          padding:"4px 10px", borderRadius:7, fontSize:9, fontWeight:600,
                          cursor:"pointer", letterSpacing:"0.05em", whiteSpace:"nowrap",
                          background: filterStatus === s ? "rgba(0,255,135,0.1)" : "transparent",
                          border:`1px solid ${filterStatus === s ? "rgba(0,255,135,0.25)" : "rgba(255,255,255,0.06)"}`,
                          color: filterStatus === s ? "#00ff87" : "rgba(255,255,255,0.3)" }}>{s}</button>
                      ))}
                    </div>
                    <ExportBtn data={filtered} name="commandes" />
                  </div>
                </div>

                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                        {[
                          { label:"ID COMMANDE", key:"orderNumber", w:130 },
                          { label:"PRODUCTEUR",  key:"farmer",      w:160 },
                          { label:"CATÉGORIE",   key:"category",    w:120 },
                          { label:"RÉGION",      key:"region",      w:110 },
                          { label:"MONTANT",     key:"amount",      w:140 },
                          { label:"QTÉ",         key:"qty",         w:60  },
                          { label:"HEURE",       key:"time",        w:80  },
                          { label:"STATUT",      key:"status",      w:130 },
                          { label:"ACTIONS",     key:"actions",     w:100 },
                        ].map(col => (
                          <th key={col.key} className="sort-th"
                            onClick={() => { setSortCol(col.key); setSortDir(sortDir===1?-1:1); }}
                            style={{ padding:"10px 14px", textAlign:"left", minWidth:col.w,
                              fontSize:8, fontWeight:700, letterSpacing:"0.14em",
                              color: sortCol === col.key ? "#00ff87" : "rgba(255,255,255,0.28)" }}>
                            <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                              {col.label}
                              {sortCol === col.key && (
                                <Ico n={sortDir === -1 ? "dn" : "up"} s={9} c="#00ff87" />
                              )}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map((o, i) => (
                        <tr key={o.id} className="row-hover"
                          style={{ borderBottom:"1px solid rgba(255,255,255,0.025)" }}>
                          <td style={{ padding:"11px 14px" }}>
                            <span style={{ fontFamily:"monospace", fontSize:11, color:"#00ff87",
                              letterSpacing:"0.04em" }}>{o.orderNumber}</span>
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ width:26, height:26, borderRadius:7, flexShrink:0,
                                background:"rgba(0,255,135,0.1)", border:"1px solid rgba(0,255,135,0.15)",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:9, fontWeight:800, color:"#00ff87" }}>
                                {o.farmer.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                              </div>
                              <span style={{ fontSize:11, color:"rgba(255,255,255,0.65)" }}>{o.farmer}</span>
                            </div>
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            <span style={{ fontSize:10, color:"rgba(255,255,255,0.38)" }}>{o.category}</span>
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>{o.region}</span>
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                              fontSize:12, color:"#00ff87" }}>
                              {o.amount.toLocaleString('fr-FR')}
                            </span>
                            <span style={{ fontSize:9, color:"rgba(255,255,255,0.2)",
                              marginLeft:3 }}>FCFA</span>
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>{o.qty}</span>
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            <span style={{ fontFamily:"monospace", fontSize:10,
                              color:"rgba(255,255,255,0.35)" }}>{o.time}</span>
                          </td>
                          <td style={{ padding:"11px 14px" }}>
                            <Pill s={o.status} />
                          </td>
                          {/* 👇 AJOUTE CETTE CELLULE POUR LES ACTIONS */}
                          <td style={{ padding:"11px 14px" }}>
                            {o.status === 'En cours' && (
                              <button
                                onClick={() => handleAssignClick(o.id, o.orderNumber)}
                                className="chip"
                                style={{
                                  padding:"4px 9px",
                                  borderRadius:6,
                                  fontSize:9,
                                  fontWeight:600,
                                  cursor:"pointer",
                                  background:"rgba(0,212,255,0.1)",
                                  border:"1px solid rgba(0,212,255,0.25)",
                                  color:"#00d4ff",
                                  display:"flex",
                                  alignItems:"center",
                                  gap:4
                                }}
                              >
                                <UserCheck size={12} />
                                Assigner
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {pageData.length === 0 && (
                        <tr>
                          <td colSpan={9} style={{ padding:"40px", textAlign:"center",
                            fontSize:12, color:"rgba(255,255,255,0.2)" }}>
                            Aucune commande trouvée
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {pages > 1 && (
                  <div style={{ padding:"12px 20px", borderTop:"1px solid rgba(255,255,255,0.04)",
                    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>
                      {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
                    </span>
                    <div style={{ display:"flex", gap:5 }}>
                      {[-1, ...Array.from({length:Math.min(5,pages)},(_,i)=>
                        Math.max(0,Math.min(page-2,pages-5))+i), pages].map((p, idx) => {
                          if (p === -1) return (
                            <button key="prev" className="chip" disabled={page===0}
                              onClick={() => setPage(x=>Math.max(0,x-1))} style={{
                              height:28, padding:"0 12px", borderRadius:7, fontSize:10, cursor:"pointer",
                              background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)",
                              color:page===0?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.4)" }}>←</button>
                          );
                          if (p === pages) return (
                            <button key="next" className="chip" disabled={page>=pages-1}
                              onClick={() => setPage(x=>Math.min(pages-1,x+1))} style={{
                              height:28, padding:"0 12px", borderRadius:7, fontSize:10, cursor:"pointer",
                              background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)",
                              color:page>=pages-1?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.4)" }}>→</button>
                          );
                          return (
                            <button key={p} className="chip" onClick={() => setPage(p)} style={{
                              width:28, height:28, borderRadius:7, fontSize:10, fontWeight:600,
                              cursor:"pointer",
                              background: p===page ? "rgba(0,255,135,0.12)" : "rgba(255,255,255,0.03)",
                              border:`1px solid ${p===page?"rgba(0,255,135,0.3)":"rgba(255,255,255,0.06)"}`,
                              color: p===page ? "#00ff87" : "rgba(255,255,255,0.35)" }}>{p+1}</button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </Glass>
            </>
          )}

          {/* ══════════════════════════════════
              COMMANDES (nav)
          ══════════════════════════════════ */}
          {nav === "orders" && (
            <Glass style={{ overflow:"hidden", animation:"fadeUp 0.4s ease" }}>
              <SectionHeader title="Toutes les commandes"
                sub={`${orders.length} commandes · ${delivered} livrées`}
                action={<ExportBtn data={orders} name="commandes" />} />
              {/* Reuse same table content */}
              <div style={{ padding:"0 20px 4px 20px", display:"flex", alignItems:"center",
                gap:8, flexWrap:"wrap", marginBottom:4 }}>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:10, top:"50%",
                    transform:"translateY(-50%)", opacity:0.35 }}>
                    <Ico n="search" s={13} c="#fff" />
                  </span>
                  <input type="text" value={q} onChange={e => { setQ(e.target.value); setPage(0); }}
                    placeholder="Rechercher commande, producteur, région…"
                    style={{ height:32, paddingLeft:32, paddingRight:12,
                      background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)",
                      borderRadius:9, color:"#fff", fontSize:11, width:260,
                      fontFamily:"'DM Sans',sans-serif" }} />
                </div>
                {["Tous","Livrée","En cours","Annulée","En attente"].map(s => (
                  <button key={s} className="chip" onClick={() => { setFilterStatus(s); setPage(0); }} style={{
                    padding:"5px 11px", borderRadius:7, fontSize:9, fontWeight:600,
                    cursor:"pointer", whiteSpace:"nowrap",
                    background: filterStatus===s ? "rgba(0,255,135,0.1)" : "transparent",
                    border:`1px solid ${filterStatus===s?"rgba(0,255,135,0.25)":"rgba(255,255,255,0.06)"}`,
                    color: filterStatus===s ? "#00ff87" : "rgba(255,255,255,0.3)" }}>{s}</button>
                ))}
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                      {[{l:"ID",k:"orderNumber"},{l:"PRODUCTEUR",k:"farmer"},{l:"CATÉGORIE",k:"category"},
                        {l:"RÉGION",k:"region"},{l:"MONTANT",k:"amount"},{l:"QTÉ",k:"qty"},
                        {l:"HEURE",k:"time"},{l:"STATUT",k:"status"},{l:"ACTIONS",k:"actions"}].map(c => (
                        <th key={c.k} className="sort-th"
                          onClick={() => { setSortCol(c.k); setSortDir(sortDir===1?-1:1); }}
                          style={{ padding:"11px 14px", textAlign:"left", fontSize:8, fontWeight:700,
                            letterSpacing:"0.14em",
                            color:sortCol===c.k?"#00ff87":"rgba(255,255,255,0.28)" }}>
                          {c.l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map(o => (
                      <tr key={o.id} className="row-hover"
                        style={{ borderBottom:"1px solid rgba(255,255,255,0.025)" }}>
                        <td style={{ padding:"11px 14px" }}>
                          <span style={{ fontFamily:"monospace", fontSize:11, color:"#00ff87" }}>{o.orderNumber}</span>
                        </td>
                        <td style={{ padding:"11px 14px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                              background:"rgba(0,255,135,0.08)", border:"1px solid rgba(0,255,135,0.12)",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:9, fontWeight:800, color:"#00ff87" }}>
                              {o.farmer.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
                            </div>
                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.65)" }}>{o.farmer}</span>
                          </div>
                        </td>
                        <td style={{ padding:"11px 14px" }}><span style={{ fontSize:10, color:"rgba(255,255,255,0.38)" }}>{o.category}</span></td>
                        <td style={{ padding:"11px 14px" }}><span style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>{o.region}</span></td>
                        <td style={{ padding:"11px 14px" }}>
                          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12, color:"#00ff87" }}>
                            {o.amount.toLocaleString('fr-FR')}
                          </span>
                          <span style={{ fontSize:9, color:"rgba(255,255,255,0.2)", marginLeft:3 }}>FCFA</span>
                        </td>
                        <td style={{ padding:"11px 14px" }}><span style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>{o.qty}</span></td>
                        <td style={{ padding:"11px 14px" }}><span style={{ fontFamily:"monospace", fontSize:10, color:"rgba(255,255,255,0.35)" }}>{o.time}</span></td>
                        <td style={{ padding:"11px 14px" }}><Pill s={o.status} /></td>
                        <td style={{ padding:"11px 14px" }}>
                          {o.status === 'En cours' && (
                            <button
                              onClick={() => handleAssignClick(o.id, o.orderNumber)}
                              className="chip"
                              style={{
                                padding:"4px 9px",
                                borderRadius:6,
                                fontSize:9,
                                fontWeight:600,
                                cursor:"pointer",
                                background:"rgba(0,212,255,0.1)",
                                border:"1px solid rgba(0,212,255,0.25)",
                                color:"#00d4ff",
                                display:"flex",
                                alignItems:"center",
                                gap:4
                              }}
                            >
                              <UserCheck size={12} />
                              Assigner
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Glass>
          )}

          {/* ══════════════════════════════════
              UTILISATEURS
          ══════════════════════════════════ */}
          {nav === "users" && (
            <Glass style={{ overflow:"hidden", animation:"fadeUp 0.4s ease" }}>
              <div style={{ padding:"20px 22px" }}>
                <SectionHeader title="Gestion des utilisateurs"
                  sub={`${users.length} comptes enregistrés`}
                  action={<ExportBtn data={users} name="utilisateurs" />} />
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                      {["UTILISATEUR","EMAIL","RÔLE","INSCRIPTION","ACTIONS"].map(h => (
                        <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:8,
                          fontWeight:700, letterSpacing:"0.14em", color:"rgba(255,255,255,0.25)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="row-hover"
                        style={{ borderBottom:"1px solid rgba(255,255,255,0.025)" }}>
                        <td style={{ padding:"12px 16px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                              background:"linear-gradient(135deg,#00c952,#00ff87)",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              color:"#060e09", fontWeight:800, fontSize:12 }}>
                              {u.displayName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>
                                {u.displayName || 'Sans nom'}
                              </div>
                              <div style={{ fontSize:9, color:"rgba(255,255,255,0.28)", marginTop:2 }}>
                                {u.phone || 'Pas de téléphone'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{u.email}</span>
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          <select value={u.role||'client'}
                            onChange={e => updateUserRole(u.id, e.target.value)} style={{
                            background:"rgba(0,255,135,0.07)", border:"1px solid rgba(0,255,135,0.2)",
                            borderRadius:7, padding:"4px 8px", fontSize:10, color:"#00ff87",
                            cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                            <option value="client">Client</option>
                            <option value="seller">Vendeur</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)",
                            fontFamily:"monospace" }}>
                            {u.createdAt?.toDate?.()?.toLocaleDateString('fr-FR') || '—'}
                          </span>
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          <div style={{ display:"flex", gap:5 }}>
                            {[
                              { lbl:"Notifier",  col:"#00d4ff", fn:()=>sendNotif(u.id) },
                              { lbl:"Détails",   col:"#c77dff", fn:()=>setModalUser(u) },
                              { lbl:"Supprimer", col:"#ff4d6d", fn:()=>deleteUser(u.id) },
                            ].map(btn => (
                              <button key={btn.lbl} className="chip" onClick={btn.fn} style={{
                                padding:"4px 9px", borderRadius:6, fontSize:9, fontWeight:600,
                                cursor:"pointer", background:`${btn.col}12`,
                                border:`1px solid ${btn.col}30`, color:btn.col }}>{btn.lbl}</button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Glass>
          )}

          {/* ══════════════════════════════════
              PRODUITS
          ══════════════════════════════════ */}
          {nav === "products" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",
                gap:14, animation:"fadeUp 0.4s ease" }}>
                {products.length === 0 ? (
                  <Glass style={{ padding:40, textAlign:"center", gridColumn:"1/-1" }}>
                    <p style={{ color:"rgba(255,255,255,0.3)", fontSize:13 }}>Aucun produit dans la base</p>
                  </Glass>
                ) : products.map((p, i) => (
                  <Glass key={p.id} style={{ padding:"18px",
                    animation:`fadeUp 0.4s ease ${i*40}ms both`, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, right:0, width:80, height:80,
                      background:`radial-gradient(circle at top right, ${PALETTE[i%PALETTE.length]}15, transparent)` }} />
                    <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"flex-start", marginBottom:12 }}>
                      <div style={{ padding:"3px 9px", borderRadius:20, fontSize:9, fontWeight:600,
                        background:`${PALETTE[i%PALETTE.length]}15`,
                        border:`1px solid ${PALETTE[i%PALETTE.length]}30`,
                        color:PALETTE[i%PALETTE.length] }}>{p.category}</div>
                      <div style={{ fontSize:11, fontWeight:700, color:"#00ff87",
                        fontFamily:"'Syne',sans-serif" }}>
                        {(p.price||0).toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#fff",
                      marginBottom:6, lineHeight:1.3 }}>{p.name || 'Produit sans nom'}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>
                      Stock : <span style={{ color:p.stock > 10 ? "#00ff87" : "#ff4d6d",
                        fontWeight:600 }}>{p.stock ?? '—'}</span>
                      {p.region && <span style={{ marginLeft:8, color:"rgba(255,255,255,0.25)" }}>· {p.region}</span>}
                    </div>
                  </Glass>
                ))}
              </div>
            </>
          )}

          {/* ══════════════════════════════════
              FINANCEMENTS
          ══════════════════════════════════ */}
          {nav === "loans" && (
            <Glass style={{ overflow:"hidden", animation:"fadeUp 0.4s ease" }}>
              <div style={{ padding:"20px 22px" }}>
                <SectionHeader title="Financements agricoles"
                  sub={`${pendingLoans} en attente · ${loans.filter(l=>l.status==='approved').length} approuvés`}
                  action={<ExportBtn data={loans} name="financements" />} />
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                      {["DEMANDEUR","MONTANT","DURÉE","MENSUALITÉ","STATUT","ACTIONS"].map(h => (
                        <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:8,
                          fontWeight:700, letterSpacing:"0.14em", color:"rgba(255,255,255,0.25)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map(loan => {
                      const sc = loan.status === 'pending' ? { c:"#f7c948", bg:"rgba(247,201,72,0.1)", t:"En attente" }
                        : loan.status === 'approved' ? { c:"#00ff87", bg:"rgba(0,255,135,0.1)", t:"Approuvé" }
                        : { c:"#ff4d6d", bg:"rgba(255,77,109,0.1)", t:"Refusé" };
                      return (
                        <tr key={loan.id} className="row-hover"
                          style={{ borderBottom:"1px solid rgba(255,255,255,0.025)" }}>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>
                              {loan.sellerName || 'Inconnu'}
                            </div>
                            <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:2 }}>
                              {loan.purpose}
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                              fontSize:13, color:"#00ff87" }}>
                              {(loan.amount||0).toLocaleString('fr-FR')} FCFA
                            </span>
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            <span style={{ fontSize:11, color:"rgba(255,255,255,0.55)" }}>{loan.duration} mois</span>
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            <span style={{ fontSize:11, color:"#00d4ff", fontWeight:600 }}>
                              {(loan.monthlyPayment||0).toLocaleString('fr-FR')} FCFA
                            </span>
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            <span style={{ padding:"3px 10px", borderRadius:20, fontSize:9,
                              fontWeight:700, background:sc.bg, color:sc.c,
                              border:`1px solid ${sc.c}30` }}>{sc.t}</span>
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex", gap:5 }}>
                              <button className="chip" onClick={() => setModalLoan(loan)} style={{
                                padding:"4px 9px", borderRadius:6, fontSize:9, fontWeight:600,
                                cursor:"pointer", background:"rgba(199,125,255,0.1)",
                                border:"1px solid rgba(199,125,255,0.25)", color:"#c77dff" }}>Détails</button>
                              {loan.status === 'pending' && (<>
                                <button className="chip" onClick={() => updateLoan(loan.id,'approved')} style={{
                                  padding:"4px 9px", borderRadius:6, fontSize:9, fontWeight:600,
                                  cursor:"pointer", background:"rgba(0,255,135,0.1)",
                                  border:"1px solid rgba(0,255,135,0.25)", color:"#00ff87" }}>✓ Approuver</button>
                                <button className="chip" onClick={() => updateLoan(loan.id,'rejected')} style={{
                                  padding:"4px 9px", borderRadius:6, fontSize:9, fontWeight:600,
                                  cursor:"pointer", background:"rgba(255,77,109,0.1)",
                                  border:"1px solid rgba(255,77,109,0.25)", color:"#ff4d6d" }}>✕ Refuser</button>
                              </>)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Glass>
          )}

          {/* ══════════════════════════════════
              CARTE RÉGIONALE
          ══════════════════════════════════ */}
          {nav === "map" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14,
              animation:"fadeUp 0.4s ease" }}>
              {heatmap.map((r, i) => (
                <Glass key={r.region} style={{ padding:"22px",
                  animation:`fadeUp 0.4s ease ${i*60}ms both`, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", inset:0, background:
                    `radial-gradient(circle at 80% 20%, ${PALETTE[i%PALETTE.length]}08, transparent 60%)` }} />
                  <div style={{ display:"flex", alignItems:"flex-start",
                    justifyContent:"space-between", marginBottom:16, position:"relative" }}>
                    <div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800,
                        fontSize:18, color:"#fff" }}>{r.region}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:3 }}>
                        {r.orders} commandes
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                        fontSize:16, color:PALETTE[i%PALETTE.length] }}>
                        {(r.revenue/1e6).toFixed(2)}M
                      </div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:2 }}>FCFA</div>
                    </div>
                  </div>
                  <div style={{ position:"relative" }}>
                    <div style={{ height:6, background:"rgba(255,255,255,0.05)", borderRadius:3 }}>
                      <div style={{ height:"100%", borderRadius:3, width:`${r.value}%`,
                        background:`linear-gradient(90deg,${PALETTE[i%PALETTE.length]},${PALETTE[(i+2)%PALETTE.length]})`,
                        boxShadow:`0 0 12px ${PALETTE[i%PALETTE.length]}60`,
                        transition:"width 1.4s cubic-bezier(.16,1,.3,1)" }} />
                    </div>
                    <span style={{ position:"absolute", right:0, top:10, fontSize:9,
                      color:"rgba(255,255,255,0.3)", fontFamily:"monospace" }}>{r.value}%</span>
                  </div>
                </Glass>
              ))}
            </div>
          )}

          {/* ══════════════════════════════════
              PARAMÈTRES
          ══════════════════════════════════ */}
          {nav === "settings" && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14,
              animation:"fadeUp 0.4s ease" }}>
              
              {/* Carte existante 1 */}
              <Glass style={{ padding:"22px" }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                  fontSize:14, color:"#fff", marginBottom:16 }}>Informations plateforme</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[["Nom","AgriMarché Sénégal"],["Version","2.0.0"],["Environnement","Production"],["Région","Dakar, Sénégal"]].map(([k, v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", paddingBottom:10,
                      borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.38)" }}>{k}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#fff",
                        fontFamily:"monospace" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Glass>

              {/* Carte existante 2 */}
              <Glass style={{ padding:"22px" }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                  fontSize:14, color:"#fff", marginBottom:16 }}>Intégrations actives</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[["Firebase","Connecté ✓"],["WhatsApp","779747073"],["XLSX Export","Activé"],["Push Notifs","Activé"]].map(([k, v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", paddingBottom:10,
                      borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.38)" }}>{k}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#fff",
                        fontFamily:"monospace" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Glass>

              {/* Carte existante 3 */}
              <Glass style={{ padding:"22px" }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                  fontSize:14, color:"#fff", marginBottom:16 }}>Paramètres commandes</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[["Devise","FCFA"],["TVA","0%"],["Commission","5%"],["Livraison","Gratuite > 10k"]].map(([k, v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", paddingBottom:10,
                      borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.38)" }}>{k}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#fff",
                        fontFamily:"monospace" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Glass>

              {/* Carte existante 4 */}
              <Glass style={{ padding:"22px" }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                  fontSize:14, color:"#fff", marginBottom:16 }}>Sécurité</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[["Auth","Firebase Auth"],["Admin MFA","Activé"],["Session","8 heures"],["Logs","Activés"]].map(([k, v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", paddingBottom:10,
                      borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,0.38)" }}>{k}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#fff",
                        fontFamily:"monospace" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Glass>

              {/* ✅ Carte Actions rapides avec les deux boutons */}
              <div style={{ gridColumn:"1/-1" }}>
                <Glass style={{ padding:"20px", animation:"fadeUp 0.4s ease 0.7s both" }}>
                  <div style={{ fontFamily:"'Syne', sans-serif", fontWeight:700, fontSize:14, color:"#fff", marginBottom:16 }}>
                    ⚡ Actions rapides
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    
                    {/* ✅ Bouton Assigner un livreur */}
                    <button onClick={() => router.push('/admin/assign-delivery')} className="action-btn" style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 11,
                      background: "rgba(0,255,135,0.05)", border: "1px solid rgba(0,255,135,0.15)",
                      color: "#00ff87", fontSize: 12, cursor: "pointer", textAlign: "left", width: "100%",
                    }}>
                      🚚 Assigner un livreur
                      <div style={{ marginLeft: "auto" }}>→</div>
                    </button>

                    {/* ✅ Bouton Créer un livreur */}
                    <button onClick={() => router.push('/admin/create-delivery')} className="action-btn" style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 11,
                      background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.15)",
                      color: "#00d4ff", fontSize: 12, cursor: "pointer", textAlign: "left", width: "100%",
                    }}>
                      👤 Créer un livreur
                      <div style={{ marginLeft: "auto" }}>→</div>
                    </button>
                    
                  </div>
                </Glass>
              </div>

              {/* ✅ Carte Gestion des livreurs */}
              <Glass style={{ padding:"22px" }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                  fontSize:14, color:"#fff", marginBottom:16 }}>📦 Gestion des livreurs</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <Link href="/admin/create-delivery" style={{ textDecoration:"none" }}>
                    <button style={{
                      width:"100%",
                      padding:"12px",
                      borderRadius:10,
                      cursor:"pointer",
                      fontWeight:600,
                      fontSize:12,
                      background:"linear-gradient(135deg, #8b5cf6, #7c3aed)",
                      border:"none",
                      color:"#fff",
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      gap:8
                    }}>
                      <Truck size={16} />
                      + Ajouter un livreur
                    </button>
                  </Link>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", textAlign:"center", marginTop:8 }}>
                    Créez des comptes pour vos livreurs
                  </div>
                </div>
              </Glass>

            </div>
          )}

        </main>
      </div>

      {/* ═══════════════════════════════════════
          MODALS
      ═══════════════════════════════════════ */}
      <Modal open={!!modalUser} onClose={() => setModalUser(null)} title="Profil utilisateur">
        {modalUser && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14, paddingBottom:14,
              borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width:52, height:52, borderRadius:14,
                background:"linear-gradient(135deg,#00c952,#00ff87)",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#060e09", fontWeight:800, fontSize:20, flexShrink:0 }}>
                {modalUser.displayName?.charAt(0) || '?'}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>{modalUser.displayName || 'Sans nom'}</div>
                <div style={{ fontSize:10, color:"#00ff87", marginTop:3 }}>{modalUser.role || 'client'}</div>
              </div>
            </div>
            {[
              ["ID", modalUser.id],
              ["Email", modalUser.email],
              ["Téléphone", modalUser.phone || '—'],
              ["Inscription", modalUser.createdAt?.toDate?.()?.toLocaleString('fr-FR') || '—'],
            ].map(([k,v]) => (
              <div key={k as string} style={{ display:"flex", justifyContent:"space-between", gap:12 }}>
                <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)", flexShrink:0 }}>{k}</span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.75)", fontFamily:"monospace",
                  textAlign:"right", wordBreak:"break-all" }}>{v as string}</span>
              </div>
            ))}
            <button onClick={() => { sendNotif(modalUser.id); setModalUser(null); }} style={{
              marginTop:4, padding:"10px", borderRadius:10, cursor:"pointer", fontWeight:600,
              fontSize:11, background:"rgba(0,255,135,0.1)", border:"1px solid rgba(0,255,135,0.25)",
              color:"#00ff87" }}>Envoyer une notification</button>
          </div>
        )}
      </Modal>

      <Modal open={!!modalLoan} onClose={() => setModalLoan(null)} title="Détails du financement">
        {modalLoan && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ textAlign:"center", padding:"14px 0" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:32,
                color:"#00ff87" }}>{(modalLoan.amount||0).toLocaleString('fr-FR')} FCFA</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>
                Demandé par {modalLoan.sellerName}
              </div>
            </div>
            {[
              ["Durée",             `${modalLoan.duration} mois`],
              ["Mensualité",        `${(modalLoan.monthlyPayment||0).toLocaleString('fr-FR')} FCFA`],
              ["Motif",             modalLoan.purpose || '—'],
              ["Description",       modalLoan.description || '—'],
            ].map(([k,v]) => (
              <div key={k as string}>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)" }}>{v as string}</div>
              </div>
            ))}
            {modalLoan.status === 'pending' && (
              <div style={{ display:"flex", gap:10, marginTop:8 }}>
                <button onClick={() => { updateLoan(modalLoan.id,'approved'); setModalLoan(null); }} style={{
                  flex:1, padding:"11px", borderRadius:10, cursor:"pointer", fontWeight:700,
                  fontSize:12, background:"#00ff87", border:"none", color:"#060e09" }}>
                  ✓ Approuver
                </button>
                <button onClick={() => { updateLoan(modalLoan.id,'rejected'); setModalLoan(null); }} style={{
                  flex:1, padding:"11px", borderRadius:10, cursor:"pointer", fontWeight:700,
                  fontSize:12, background:"transparent", border:"1px solid #ff4d6d", color:"#ff4d6d" }}>
                  ✕ Refuser
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODALE ASSIGNER LIVREUR */}
      {assignModal.open && (
        <div onClick={() => setAssignModal({ open: false, orderId: null, orderNumber: '' })} 
             style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(16px)",
                      zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width:"92%", maxWidth:480, background:"#0c1a10",
                      border:"1px solid rgba(0,255,135,0.15)", borderRadius:24, overflow:"hidden" }}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid rgba(255,255,255,0.05)",
                          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, color:"#fff" }}>
                Assigner un livreur
              </span>
              <button onClick={() => setAssignModal({ open: false, orderId: null, orderNumber: '' })} 
                      style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", cursor:"pointer" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding:22 }}>
              <p style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:16 }}>
                Commande #{assignModal.orderNumber}
              </p>
              {loadingDelivery ? (
                <div style={{ textAlign:"center", padding:20 }}>Chargement...</div>
              ) : deliveryList.length === 0 ? (
                <div style={{ textAlign:"center", padding:20, color:"rgba(255,255,255,0.3)" }}>
                  Aucun livreur disponible. Créez un livreur d'abord.
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {deliveryList.map((delivery) => (
                    <button
                      key={delivery.id}
                      onClick={() => handleAssignDelivery(delivery.id, delivery.displayName, delivery.phone)}
                      style={{
                        padding:"14px",
                        borderRadius:12,
                        background:"rgba(255,255,255,0.03)",
                        border:"1px solid rgba(255,255,255,0.06)",
                        cursor:"pointer",
                        textAlign:"left",
                        transition:"all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0,255,135,0.08)";
                        e.currentTarget.style.borderColor = "rgba(0,255,135,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      }}
                    >
                      <div style={{ fontWeight:600, color:"#fff", marginBottom:4 }}>
                        {delivery.displayName}
                      </div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>
                        {delivery.phone || 'Pas de téléphone'} • {delivery.vehicle || 'Véhicule non spécifié'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminGuard>
  );
}
