import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Truck, BadgeCheck, ShieldAlert, Sprout, Factory, Store, ShoppingBag, PlusCircle, Users } from "lucide-react";
import api from "../api";
import { useAuth } from "../context/Auth";
import { CountUp, ProductCard, StatusBadge } from "../components/ui";

const PIPE = [
  { key: "CREATED", label: "At farm", icon: Sprout },
  { key: "PROCESSED", label: "Processed", icon: Factory },
  { key: "IN_DISTRIBUTION", label: "In transport", icon: Truck },
  { key: "AT_RETAILER", label: "At retailer", icon: Store },
  { key: "SOLD", label: "Sold", icon: ShoppingBag },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get("/products").then((r) => setList(r.data)).catch(() => setList([]));
    if (user.role === "ADMIN") api.get("/users").then((r) => setUsers(r.data));
  }, [user.role]);

  const count = (s) => (list || []).filter((p) => p.status === s).length;
  const me = user.wallet;

  const todo = useMemo(() => {
    if (!list) return [];
    switch (user.role) {
      case "PROCESSOR": return list.filter((p) => p.status === "CREATED" || (p.status === "PROCESSED" && p.processor === me));
      case "DISTRIBUTOR": return list.filter((p) => p.status === "IN_DISTRIBUTION" && p.distributor === me);
      case "RETAILER": return list.filter((p) => p.status === "AT_RETAILER" && p.retailer === me);
      case "CUSTOMER": return list.filter((p) => p.customer === me);
      case "FARMER": return list.filter((p) => p.farmer === me);
      default: return list.filter((p) => p.status === "RECALLED");
    }
  }, [list, user.role, me]);

  const todoTitle = {
    PROCESSOR: "Waiting for you to process or hand over", DISTRIBUTOR: "Loads you need to deliver to a retailer",
    RETAILER: "Stock ready to sell", CUSTOMER: "Your purchases", FARMER: "Your registered batches", ADMIN: "Recalled products",
  }[user.role];

  const stats = [
    { label: "Products on chain", v: list?.length || 0, icon: Package, c: "#12A072", t: "#E6F6EF" },
    { label: "Moving through the chain", v: count("PROCESSED") + count("IN_DISTRIBUTION") + count("AT_RETAILER") + count("CREATED"), icon: Truck, c: "#E07A1F", t: "#FFF1DA" },
    { label: "Sold to customers", v: count("SOLD"), icon: BadgeCheck, c: "#0E8FA8", t: "#DDF3F7" },
    { label: "Recalled", v: count("RECALLED"), icon: ShieldAlert, c: "#D9484F", t: "#FDE5E6" },
  ];
  const total = list?.length || 0;
  const avgQ = total ? Math.round(list.reduce((a, p) => a + p.qualityScore, 0) / total) : 0;

  return (
    <>
      <div className="top">
        <div>
          <h1>Hello, {user.name.split(" ")[0]}</h1>
          <p>{user.role === "ADMIN" ? "Here is how the whole network is doing." : "Here is what is happening with your products today."}</p>
        </div>
        {user.role === "FARMER" && <Link to="/products/new" className="btn"><PlusCircle size={18} />Register product</Link>}
        {user.role === "ADMIN" && <Link to="/participants" className="btn"><Users size={18} />Manage participants</Link>}
      </div>

      <div className="grid g4" style={{ marginBottom: 20 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} className="card stat" style={{ "--tint": s.t }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="ico" style={{ background: s.t, color: s.c }}><s.icon size={22} /></div>
            <b><CountUp to={s.v} /></b><span>{s.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row spread"><h3>Supply chain pipeline</h3><span className="muted">Average quality score <b style={{ color: "var(--em2)" }}>{avgQ}/100</b></span></div>
        <div className="pipe">
          {PIPE.map((n, i) => (
            <motion.div className="node" key={n.key} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.12 }}>
              <div className="dot"><n.icon size={24} /></div>
              <b style={{ fontSize: 22, fontFamily: "var(--head)" }}><CountUp to={count(n.key)} /></b>
              <div className="muted" style={{ fontSize: 13 }}>{n.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Status breakdown</h3>
          {total === 0 && <div className="empty">No products yet.</div>}
          {PIPE.concat([{ key: "RECALLED", label: "Recalled" }]).map((n, i) => (
            <div key={n.key} style={{ marginBottom: 12 }}>
              <div className="row spread" style={{ fontSize: 13.5 }}><StatusBadge status={n.key} /><b>{count(n.key)}</b></div>
              <div className="mini" style={{ marginTop: 6 }}>
                <motion.i initial={{ width: 0 }} animate={{ width: total ? `${(count(n.key) / total) * 100}%` : 0 }} transition={{ delay: 0.4 + i * 0.08, duration: 0.8 }}
                  style={{ background: n.key === "RECALLED" ? "var(--red)" : undefined }} />
              </div>
            </div>
          ))}
        </div>
        {user.role === "ADMIN" ? (
          <div className="card">
            <h3>Network participants</h3>
            {["FARMER", "PROCESSOR", "DISTRIBUTOR", "RETAILER", "CUSTOMER"].map((r) => (
              <div key={r} className="row spread" style={{ padding: "9px 0", borderBottom: "1px solid #eef4f1" }}>
                <span style={{ textTransform: "capitalize" }}>{r.toLowerCase()}s</span><b>{users.filter((u) => u.role === r).length}</b>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <h3>How it works for you</h3>
            <p style={{ color: "var(--ink2)" }}>
              {{
                FARMER: "Register each harvest with a photo and quality score. A QR code is generated for the batch. Anyone scanning it sees the photo and where it is now.",
                PROCESSOR: "Mark incoming batches as processed, upload the safety certificate, then hand the batch to a distributor.",
                DISTRIBUTOR: "Log transport conditions as you go, then hand the batch to a retailer on arrival.",
                RETAILER: "Confirm receipt, then record the sale to a customer. Recall a batch if a problem is reported.",
                CUSTOMER: "Open any product to see its full journey, certificates, and every hand it passed through.",
              }[user.role]}
            </p>
          </div>
        )}
      </div>

      <div className="row spread" style={{ marginBottom: 14 }}><h2 style={{ fontSize: 22 }}>{todoTitle}</h2><Link to="/products" className="btn ghost sm">View all</Link></div>
      {list === null ? <div className="empty">Loading from blockchain…</div> : todo.length === 0 ? (
        <div className="card empty">Nothing here right now.</div>
      ) : (
        <div className="pgrid">{todo.slice(0, 6).map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}</div>
      )}
    </>
  );
}
