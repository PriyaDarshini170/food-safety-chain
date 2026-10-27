import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { animate, motion } from "framer-motion";
import { Leaf, Check } from "lucide-react";
import { STAGE_STEPS, STATUS_LABEL, STATUSES } from "../constants";

export const Page = ({ children }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
    {children}
  </motion.div>
);

export const StatusBadge = ({ status }) => (
  <span className={`badge b-${status}`}>
    {status !== "SOLD" && status !== "RECALLED" && <i className="pulse" />}
    {STATUS_LABEL[status]}
  </span>
);

export function CountUp({ to }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, to, { duration: 1.1, ease: "easeOut", onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [to]);
  return <>{v}</>;
}

export function Stepper({ status }) {
  const idx = STATUSES.indexOf(status);
  return (
    <div className="steps">
      {STAGE_STEPS.map((s, i) => {
        const cls = status === "RECALLED" ? "" : i < idx || status === "SOLD" ? "done" : i === idx ? "now" : "";
        return (
          <motion.div key={s.key} className={`step ${cls}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="c">{cls === "done" ? <Check size={18} /> : i + 1}</div>
            <b style={{ fontSize: 14 }}>{s.label}</b>
            <small>{s.note}</small>
          </motion.div>
        );
      })}
    </div>
  );
}

export const ProductCard = ({ p, i = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }}>
    <Link to={`/products/${p.id}`} className="card pcard">
      <div className="img">{p.imageUrl ? <img src={p.imageUrl} alt={p.productName} loading="lazy" /> : <Leaf size={44} />}</div>
      <div className="body">
        <div className="row spread" style={{ marginBottom: 6 }}>
          <StatusBadge status={p.status} />
          <span className="muted" style={{ fontSize: 12 }}>#{p.id}</span>
        </div>
        <h3 style={{ margin: "8px 0 2px", fontSize: 18 }}>{p.productName}</h3>
        <div className="muted" style={{ fontSize: 13 }}>Batch {p.batchId} · {p.origin}</div>
        <div className="mini"><i style={{ width: `${Math.min(100, (Math.max(0, p.statusIndex) / 4) * 100)}%` }} /></div>
      </div>
    </Link>
  </motion.div>
);
