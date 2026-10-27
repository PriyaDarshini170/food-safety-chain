import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../api";
import { useAuth } from "../context/Auth";
import { ProductCard } from "../components/ui";
import { STATUSES, STATUS_LABEL } from "../constants";

export default function Products() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState("ALL");
  const [mine, setMine] = useState(false);

  useEffect(() => { api.get("/products").then((r) => setList(r.data)).catch(() => setList([])); }, []);

  const shown = (list || []).filter((p) =>
    (f === "ALL" || p.status === f) &&
    (!mine || [p.farmer, p.processor, p.distributor, p.retailer, p.customer].includes(user.wallet)) &&
    `${p.productName} ${p.batchId} ${p.origin} ${p.id}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <div className="top"><div><h1>Supply chain</h1><p>Every product recorded on the blockchain, newest first.</p></div></div>
      <div className="row" style={{ marginBottom: 20 }}>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
          <Search size={17} style={{ position: "absolute", left: 14, top: 14, color: "var(--muted)" }} />
          <input className="inp" style={{ paddingLeft: 40 }} placeholder="Search by name, batch, origin…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {["ALL", ...STATUSES].map((s) => <button key={s} className={`chip ${f === s ? "on" : ""}`} onClick={() => setF(s)}>{s === "ALL" ? "All" : STATUS_LABEL[s]}</button>)}
        {user.role !== "ADMIN" && <button className={`chip ${mine ? "on" : ""}`} onClick={() => setMine(!mine)}>Mine only</button>}
      </div>
      {list === null ? <div className="empty">Loading from blockchain…</div> : shown.length === 0 ? (
        <div className="card empty">No products match. {user.role === "FARMER" && "Register your first batch from the sidebar."}</div>
      ) : <div className="pgrid">{shown.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}</div>}
    </>
  );
}
