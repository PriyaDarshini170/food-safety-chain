import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Download, FileCheck2, MapPin, ShieldAlert, ArrowRightCircle, Award, NotebookPen, ExternalLink } from "lucide-react";
import api, { errMsg } from "../api";
import { useAuth } from "../context/Auth";
import { useWeb3 } from "../context/Web3";
import { Stepper, StatusBadge } from "../components/ui";
import { STATUS_TO_STAGE, fmtDate, short, ROLE_COLOR } from "../constants";

const NEXT = { PROCESSED: ["DISTRIBUTOR", "Hand over to distributor", "transferToDistributor"], IN_DISTRIBUTION: ["RETAILER", "Deliver to retailer", "transferToRetailer"], AT_RETAILER: ["CUSTOMER", "Sell to customer", "sellToCustomer"] };

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { send } = useWeb3();
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const [targets, setTargets] = useState([]);
  const [pick, setPick] = useState("");
  const [log, setLog] = useState({ location: "", remarks: "" });
  const [certType, setCertType] = useState(3);
  const qrRef = useRef();
  const qrUrl = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/p/${id}`;

  const load = useCallback(() => api.get(`/products/${id}`).then((r) => setP(r.data)).catch((e) => setErr(errMsg(e))), [id]);
  useEffect(() => { load(); }, [load]);

  const me = user.wallet;
  const next = p && NEXT[p.status];
  const canAct = p && next && ((p.status === "PROCESSED" && user.role === "PROCESSOR" && p.processor === me) ||
    (p.status === "IN_DISTRIBUTION" && user.role === "DISTRIBUTOR" && p.distributor === me) ||
    (p.status === "AT_RETAILER" && user.role === "RETAILER" && p.retailer === me));
  const canProcess = p && user.role === "PROCESSOR" && p.status === "CREATED";
  const involved = p && (user.role === "ADMIN" || [p.farmer, p.processor, p.distributor, p.retailer].includes(me));
  const canCert = p && (user.role === "ADMIN" || [p.farmer, p.processor].includes(me) || ([p.distributor, p.retailer].includes(me)));

  useEffect(() => {
    if (canAct) api.get(`/users?role=${next[0]}`).then((r) => { setTargets(r.data.filter((u) => u.active)); setPick(r.data[0]?.wallet || ""); });
  }, [canAct, next]);

  const run = async (label, fn) => { const r = await send(label, fn); if (r) { await load(); } };

  const uploadCert = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd);
      await run("Add certificate", (c) => c.addCertificate(Number(id), certType, data.cid));
    } catch (er) { toast.error(errMsg(er)); }
    e.target.value = "";
  };

  const downloadQR = () => {
    const a = document.createElement("a");
    a.href = qrRef.current.querySelector("canvas").toDataURL("image/png");
    a.download = `product-${id}-qr.png`; a.click();
  };

  if (err) return <div className="card empty">{err}</div>;
  if (!p) return <div className="empty">Reading from blockchain…</div>;

  return (
    <>
      <div className="top">
        <div><h1>{p.productName}</h1><p>Batch {p.batchId} · Product #{p.id}</p></div>
        <StatusBadge status={p.status} />
      </div>

      {p.status === "RECALLED" && <div className="warn" style={{ background: "#FDE5E6", borderColor: "#F2B1B4", color: "#8F1F25" }}><ShieldAlert size={18} />This product has been recalled. Do not sell or consume it.</div>}

      <div className="card" style={{ marginBottom: 20 }}><h3>Journey</h3><Stepper status={p.status} /></div>

      <div className="grid g2" style={{ marginBottom: 20 }}>
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {p.imageUrl && <img src={p.imageUrl} alt={p.productName} style={{ width: "100%", height: 260, objectFit: "cover", borderRadius: 14, marginBottom: 16 }} />}
          <table><tbody>
            {[["Origin", p.origin], ["Harvested", p.harvestDate], ["Expires", p.expiryDate], ["Quality score", `${p.qualityScore}/100`]].map(([k, v]) => (
              <tr key={k}><td className="muted">{k}</td><td><b>{v}</b></td></tr>))}
          </tbody></table>
        </motion.div>

        <div className="grid" style={{ alignContent: "start" }}>
          <div className="card qrbox" ref={qrRef}>
            <h3 style={{ margin: 0 }}>Product QR code</h3>
            <QRCodeCanvas value={qrUrl} size={190} level="H" fgColor="#10302B" includeMargin={false} />
            <small className="muted" style={{ wordBreak: "break-all" }}>{qrUrl}</small>
            <button className="btn ghost sm" onClick={downloadQR}><Download size={15} />Download PNG</button>
            <small className="muted">Scanning shows only the product photo and its current stage.</small>
          </div>

          {(canProcess || canAct || involved) && (
            <div className="card">
              <h3>Actions</h3>
              <div className="grid" style={{ gap: 12 }}>
                {canProcess && <button className="btn" onClick={() => run("Process product", (c) => c.processProduct(Number(id)))}><FileCheck2 size={17} />Mark as processed</button>}
                {canAct && (
                  <div>
                    <label>{next[1]}</label>
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <select className="inp" value={pick} onChange={(e) => setPick(e.target.value)}>
                        {targets.length === 0 && <option value="">No active {next[0].toLowerCase()} found</option>}
                        {targets.map((t) => <option key={t._id} value={t.wallet}>{t.name} ({short(t.wallet)})</option>)}
                      </select>
                      <button className="btn" disabled={!pick} onClick={() => run(next[1], (c) => c[next[2]](Number(id), pick))}><ArrowRightCircle size={17} /></button>
                    </div>
                  </div>
                )}
                {involved && p.status !== "RECALLED" && user.role !== "ADMIN" && (
                  <div>
                    <label>Add a log entry (temperature, delays, inspection…)</label>
                    <input className="inp" style={{ marginBottom: 8 }} placeholder="Location" value={log.location} onChange={(e) => setLog({ ...log, location: e.target.value })} />
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <input className="inp" placeholder="e.g. Cold chain steady at 4°C" value={log.remarks} onChange={(e) => setLog({ ...log, remarks: e.target.value })} />
                      <button className="btn dark" disabled={!log.remarks} onClick={async () => { await run("Add log", (c) => c.addHistory(Number(id), STATUS_TO_STAGE[p.status], log.location || user.location, log.remarks, "")); setLog({ location: "", remarks: "" }); }}><NotebookPen size={17} /></button>
                    </div>
                  </div>
                )}
                {canCert && (
                  <div>
                    <label>Attach a certificate</label>
                    <div className="row" style={{ flexWrap: "nowrap" }}>
                      <select className="inp" onFocus={() => {}} value={certType} onChange={(e) => setCertType(Number(e.target.value))}>
                        {(user.role === "ADMIN" || [p.farmer, p.processor].includes(me)) && <><option value={1}>Quality certificate</option><option value={2}>Food safety certificate</option></>}<option value={3}>Additional document</option>
                      </select>
                      <label className="btn ghost" style={{ margin: 0, whiteSpace: "nowrap" }}><Award size={16} />Upload<input type="file" hidden onChange={uploadCert} /></label>
                    </div>
                  </div>
                )}
                {involved && p.status !== "RECALLED" && (
                  <button className="btn danger" onClick={() => window.confirm("Recall this product? This cannot be undone.") && run("Recall product", (c) => c.recallProduct(Number(id)))}><ShieldAlert size={17} />Recall product</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <h3>Handled by</h3>
          {["farmer", "processor", "distributor", "retailer", "customer"].map((k) => {
            const x = p.participants[k];
            return (
              <div key={k} className="row" style={{ padding: "9px 0", borderBottom: "1px solid #eef4f1", flexWrap: "nowrap", opacity: x ? 1 : 0.45 }}>
                <div className="avatar" style={{ background: ROLE_COLOR[k.toUpperCase()], width: 34, height: 34 }}>{(x?.name || k)[0].toUpperCase()}</div>
                <div><b>{x ? x.name : "Pending"}</b><div className="muted" style={{ fontSize: 12.5, textTransform: "capitalize" }}>{k}{x && ` · ${short(x.address)}`}</div></div>
              </div>);
          })}
          <h3 style={{ marginTop: 22 }}>Certificates</h3>
          {[["Quality", p.certificates.quality], ["Food safety", p.certificates.safety], ["Additional", p.certificates.document]].map(([k, u]) => (
            <div key={k} className="row spread" style={{ padding: "8px 0" }}>
              <span>{k}</span>{u ? <a className="btn ghost sm" href={u} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open</a> : <span className="muted">Not uploaded</span>}
            </div>))}
        </div>

        <div className="card">
          <h3>Blockchain history</h3>
          <div className="tl">
            {p.history.map((h, i) => (
              <motion.div key={i} className={`ev ${h.stage}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                <b>{h.remarks}</b>
                <div className="muted" style={{ fontSize: 13 }}>{h.participant?.name || "-"} · {h.stage.toLowerCase()}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>{h.location && <><MapPin size={11} /> {h.location} · </>}{fmtDate(h.timestamp)}</div>
              </motion.div>))}
          </div>
        </div>
      </div>
    </>
  );
}
