import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, PlusCircle, Users, LogOut, ShieldCheck, Wallet, Menu, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/Auth";
import { useWeb3 } from "../context/Web3";
import { ROLE_COLOR, short } from "../constants";
import { Page } from "./ui";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { account, connect, walletOk, wrongChain } = useWeb3();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const items = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/products", icon: Package, label: user.role === "CUSTOMER" ? "Products" : "Supply chain" },
    ...(user.role === "FARMER" ? [{ to: "/products/new", icon: PlusCircle, label: "Register product", end: true }] : []),
    ...(user.role === "ADMIN" ? [{ to: "/participants", icon: Users, label: "Participants" }] : []),
  ];
  return (
    <div className="shell">
      <aside className={`side ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        <div className="brand"><i><ShieldCheck size={20} /></i>FoodChain</div>
        <nav className="nav">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end}><it.icon size={19} />{it.label}</NavLink>
          ))}
        </nav>
        <div className="me">
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <div className="avatar" style={{ background: ROLE_COLOR[user.role] }}>{user.name[0]}</div>
            <div style={{ minWidth: 0 }}>
              <b style={{ color: "#fff", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</b>
              <small style={{ color: "#8fb1a6" }}>{user.role.toLowerCase()}</small>
            </div>
          </div>
          <button className="btn ghost sm" style={{ marginTop: 12, width: "100%", color: "#cfe3dc", borderColor: "rgba(255,255,255,.2)" }}
            onClick={() => { logout(); nav("/login"); }}><LogOut size={15} />Sign out</button>
        </div>
      </aside>
      <main className="main">
        <div className="row spread" style={{ marginBottom: 14 }}>
          <button className="btn ghost sm menu-btn" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={18} /></button>
          <div style={{ flex: 1 }} />
          {walletOk ? (
            <span className="badge b-CREATED"><Wallet size={14} />Wallet {short(account)}</span>
          ) : (
            <button className="btn ghost sm" onClick={connect}><Wallet size={15} />Connect MetaMask</button>
          )}
        </div>
        {account && user && account !== user.wallet && (
          <div className="warn"><AlertTriangle size={18} />MetaMask is on {short(account)} but your account is registered to {short(user.wallet)}. Switch accounts to sign transactions.</div>
        )}
        {wrongChain && <div className="warn"><AlertTriangle size={18} />MetaMask is on the wrong network. Click “Connect MetaMask” to switch.</div>}
        <Page>{children}</Page>
      </main>
    </div>
  );
}
