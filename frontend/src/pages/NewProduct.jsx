import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ImagePlus, Sparkles, UploadCloud } from "lucide-react";
import api, { errMsg } from "../api";
import { useWeb3 } from "../context/Web3";

export default function NewProduct() {
  const { send } = useWeb3();
  const nav = useNavigate();
  const fileRef = useRef();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ batchId: "", productName: "", origin: "", harvestDate: today, expiryDate: "", qualityScore: 90 });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const genBatch = () => setF({ ...f, batchId: `FC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}` });

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Add a product photo. It is what customers see when they scan the QR code.");
    setBusy(true);
    try {
      const t = toast.loading("Uploading photo to IPFS…");
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd);
      toast.success("Photo stored on IPFS", { id: t });

      const res = await send("Register product", (c) =>
        c.registerProduct(f.batchId, f.productName, f.origin, f.harvestDate, f.expiryDate, Number(f.qualityScore), data.cid));
      if (res) {
        let id = null;
        for (const log of res.receipt.logs) {
          try { const p = res.contract.interface.parseLog(log); if (p?.name === "ProductRegistered") id = Number(p.args.productId); } catch {}
        }
        nav(id ? `/products/${id}` : "/products");
      }
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  return (
    <>
      <div className="top"><div><h1>Register a new batch</h1><p>This writes the batch to the blockchain and creates its QR code.</p></div></div>
      <form className="card" onSubmit={submit} style={{ maxWidth: 820 }}>
        <div className="field">
          <label>Product photo</label>
          <div className="drop" onClick={() => fileRef.current.click()}>
            {file ? <img src={URL.createObjectURL(file)} alt="preview" /> : <><ImagePlus size={34} color="#12A072" /><p style={{ marginTop: 8 }}>Click to choose a clear photo of the produce</p></>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files[0])} />
          </div>
        </div>
        <div className="form2">
          <div className="field">
            <label>Batch ID</label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input className="inp" required value={f.batchId} onChange={set("batchId")} placeholder="FC-2026-A1B2C" />
              <button type="button" className="btn ghost" onClick={genBatch} title="Generate"><Sparkles size={16} /></button>
            </div>
          </div>
          <div className="field"><label>Product name</label><input className="inp" required value={f.productName} onChange={set("productName")} placeholder="Organic tomatoes" /></div>
          <div className="field"><label>Origin (farm, village, district)</label><input className="inp" required value={f.origin} onChange={set("origin")} placeholder="Gubbi, Tumakuru" /></div>
          <div className="field"><label>Quality score: <b>{f.qualityScore}</b>/100</label><input type="range" min="0" max="100" style={{ width: "100%", accentColor: "#12A072" }} value={f.qualityScore} onChange={set("qualityScore")} /></div>
          <div className="field"><label>Harvest date</label><input className="inp" type="date" required value={f.harvestDate} onChange={set("harvestDate")} /></div>
          <div className="field"><label>Expiry date</label><input className="inp" type="date" required min={f.harvestDate} value={f.expiryDate} onChange={set("expiryDate")} /></div>
        </div>
        <button className="btn" disabled={busy}><UploadCloud size={18} />{busy ? "Working…" : "Upload & register on blockchain"}</button>
      </form>
    </>
  );
}
