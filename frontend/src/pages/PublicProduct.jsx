import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ImageOff, ShieldAlert } from "lucide-react";
import api from "../api";
import { STAGE_STEPS, STATUS_LABEL } from "../constants";

// Opened from the QR code. Shows ONLY the product photo and its current stage.
export default function PublicProduct() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { api.get(`/public/product/${id}`).then((r) => setD(r.data)).catch(() => setErr(true)); }, [id]);

  if (err) return <div className="pub"><div><ShieldAlert size={44} /><h2 style={{ marginTop: 10 }}>Product not found</h2><p style={{ color: "#a9c6bc" }}>This QR code is not registered on the blockchain.</p></div></div>;
  if (!d) return <div className="pub">Verifying on blockchain…</div>;
  const recalled = d.status === "RECALLED";

  return (
    <div className="pub">
      <motion.div className="frame" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="photo">
          {d.imageUrl ? <img src={d.imageUrl} alt="Product" /> : <div style={{ height: "100%", display: "grid", placeItems: "center" }}><ImageOff size={48} /></div>}
        </div>
        {recalled ? (
          <div className="recall"><ShieldAlert size={20} style={{ verticalAlign: -4 }} /> This product has been recalled</div>
        ) : (
          <motion.div className="stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <div className="nowtag"><i className="pulse" style={{ color: "#F4A62A" }} />{STATUS_LABEL[d.status]}</div>
            <div className="steps">
              {STAGE_STEPS.map((s, i) => {
                const cls = i < d.statusIndex || d.status === "SOLD" ? "done" : i === d.statusIndex ? "now" : "";
                return (
                  <div key={s.key} className={`step ${cls}`}>
                    <div className="c">{cls === "done" ? <Check size={16} /> : i + 1}</div>{s.label}
                  </div>);
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
