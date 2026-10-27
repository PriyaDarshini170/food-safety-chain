import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { UserPlus, Power } from "lucide-react";
import api, { errMsg } from "../api";
import { useWeb3 } from "../context/Web3";
import { ROLE_COLOR, ROLE_ID, short } from "../constants";

const EMPTY = { name: "", email: "", password: "", role: "FARMER", location: "", wallet: "" };

export default function Participants() {
  const { send, account } = useWeb3();
  const [users, setUsers] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const load = () => api.get("/users").then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    let created;
    try { created = (await api.post("/users", f)).data; } catch (er) { toast.error(errMsg(er)); setBusy(false); return; }
    const res = await send("Register participant", (c) => c.registerParticipant(f.wallet, f.name, f.location, ROLE_ID[f.role]));
    if (!res) { await api.delete(`/users/${created._id}`); toast.error("Rolled back: the user was not saved because the blockchain transaction did not complete"); }
    else { setF(EMPTY); toast.success(`${f.name} can now sign in`); }
    await load();
    setBusy(false);
  };

  const toggle = async (u) => {
    const res = await send(u.active ? "Deactivate" : "Activate", (c) => (u.active ? c.deactivateParticipant(u.wallet) : c.activateParticipant(u.wallet)));
    if (res) { await api.patch(`/users/${u._id}/active`, { active: !u.active }); load(); }
  };

  return (
    <>
      <div className="top"><div><h1>Participants</h1><p>Creating a user saves the login and registers the wallet on the blockchain in one step. Your MetaMask must be on the admin account{account ? ` (${short(account)})` : ""}.</p></div></div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(300px,380px) 1fr", alignItems: "start" }}>
        <form className="card" onSubmit={add}>
          <h3>Add participant</h3>
          <div className="field"><label>Role</label>
            <select className="inp" value={f.role} onChange={set("role")}>{Object.keys(ROLE_ID).filter((r) => r !== "ADMIN").map((r) => <option key={r}>{r}</option>)}</select></div>
          <div className="field"><label>Organisation / name</label><input className="inp" required value={f.name} onChange={set("name")} /></div>
          <div className="field"><label>Location</label><input className="inp" required value={f.location} onChange={set("location")} /></div>
          <div className="field"><label>Email</label><input className="inp" type="email" required value={f.email} onChange={set("email")} /></div>
          <div className="field"><label>Temporary password</label><input className="inp" required minLength={6} value={f.password} onChange={set("password")} /></div>
          <div className="field"><label>MetaMask wallet address</label><input className="inp" required pattern="0x[a-fA-F0-9]{40}" placeholder="0x…" value={f.wallet} onChange={set("wallet")} /></div>
          <button className="btn" style={{ width: "100%" }} disabled={busy}><UserPlus size={17} />{busy ? "Working…" : "Create & register on-chain"}</button>
        </form>

        <div className="card scroll">
          <h3>Registered users ({users.length})</h3>
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Wallet</th><th>Status</th><th /></tr></thead>
            <tbody>
              {users.map((u, i) => (
                <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td><b>{u.name}</b><div className="muted" style={{ fontSize: 12.5 }}>{u.email}</div></td>
                  <td><span className="badge" style={{ background: ROLE_COLOR[u.role] + "22", color: ROLE_COLOR[u.role] }}>{u.role.toLowerCase()}</span></td>
                  <td className="muted">{short(u.wallet)}</td>
                  <td>{u.active ? <span className="badge b-CREATED">Active</span> : <span className="badge b-RECALLED">Inactive</span>}</td>
                  <td>{u.role !== "ADMIN" && <button className="btn ghost sm" onClick={() => toggle(u)}><Power size={14} />{u.active ? "Deactivate" : "Activate"}</button>}</td>
                </motion.tr>))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
