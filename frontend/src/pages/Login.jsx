import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ShieldCheck, Sprout, Factory, Truck, Store, User, Crown, Boxes, LogIn } from "lucide-react";
import { useAuth } from "../context/Auth";
import api, { errMsg } from "../api";
import { ROLE_COLOR } from "../constants";

const ROLES = [
  { id: "ADMIN", label: "Admin", icon: Crown },
  { id: "FARMER", label: "Farmer", icon: Sprout },
  { id: "PROCESSOR", label: "Processor", icon: Factory },
  { id: "DISTRIBUTOR", label: "Distributor", icon: Truck },
  { id: "RETAILER", label: "Retailer", icon: Store },
  { id: "CUSTOMER", label: "Customer", icon: User },
];

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState("FARMER");
  const [email, setEmail] = useState("farmer@foodchain.com");
  const [password, setPassword] = useState("Demo@123");
  const [busy, setBusy] = useState(false);
  const [down, setDown] = useState(false);
  useEffect(() => { api.get("/health").catch(() => setDown(true)); }, []);
  if (user) return <Navigate to="/" replace />;

  const pick = (r) => {
    setRole(r);
    setEmail(r === "ADMIN" ? "admin@foodchain.com" : `${r.toLowerCase()}@foodchain.com`);
    setPassword(r === "ADMIN" ? "Admin@123" : "Demo@123");
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await login(email, password, role); toast.success("Welcome back"); nav("/"); }
    catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };

  return (
    <div className="login">
      <section className="hero">
        <div className="blob" style={{ width: 360, height: 360, background: "#12A072", top: -80, left: -80 }} />
        <div className="blob" style={{ width: 280, height: 280, background: "#F4A62A", bottom: -60, right: 40, animationDelay: "-5s" }} />
        <div className="brand" style={{ padding: 0, position: "relative" }}><i><ShieldCheck size={20} /></i>FoodChain</div>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ position: "relative" }}>
          Know where your food has been.
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ position: "relative" }}>
          Every harvest, batch, transfer and recall is written to the blockchain by the people who handled it, so no one can quietly change the story.
        </motion.p>
        <div className="chain" style={{ position: "relative" }}>
          {[Sprout, Factory, Truck, Store, User].map((Ic, i) => (
            <span key={i} className="row" style={{ gap: 0 }}>
              <span className="blk" style={{ animationDelay: `${i * 0.35}s` }}><Ic size={26} /></span>
              {i < 4 && <span className="lnk" />}
            </span>
          ))}
        </div>
        <div className="row" style={{ color: "#7be3b8", position: "relative", marginTop: 8 }}><Boxes size={18} />Ethereum smart contract · IPFS · MetaMask signing</div>
      </section>

      <section className="formside">
        <motion.form className="formbox" onSubmit={submit} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          {down && <div className="warn" style={{ marginBottom: 16 }}>Backend is not reachable. Start it with <b>npm run backend</b> (or <b>npm run dev</b> to start everything) and check that terminal for errors.</div>}
          <h2 style={{ fontSize: 30 }}>Sign in</h2>
          <p className="muted">Choose your role, then enter your credentials.</p>
          <div className="roles">
            {ROLES.map((r) => (
              <button type="button" key={r.id} className={`rolebtn ${role === r.id ? "on" : ""}`} style={{ "--c": ROLE_COLOR[r.id] }} onClick={() => pick(r.id)}>
                <r.icon size={20} />{r.label}
              </button>
            ))}
          </div>
          <div className="field"><label>Email</label><input className="inp" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label>Password</label><input className="inp" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button className="btn" style={{ width: "100%" }} disabled={busy}><LogIn size={18} />{busy ? "Signing in…" : `Sign in as ${role.toLowerCase()}`}</button>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>Demo accounts are pre-filled. Accounts are created by the admin, who also registers each wallet on the blockchain.</p>
        </motion.form>
      </section>
    </div>
  );
}
