import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import toast from "react-hot-toast";
import api, { errMsg } from "../api";
import { useAuth } from "./Auth";

const Ctx = createContext(null);
export const useWeb3 = () => useContext(Ctx);

export function Web3Provider({ children }) {
  const { user } = useAuth();
  const [account, setAccount] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [wrongChain, setWrongChain] = useState(false);

  useEffect(() => { api.get("/config").then((r) => setCfg(r.data)).catch(() => {}); }, []);

  const checkChain = useCallback(async () => {
    if (!window.ethereum || !cfg) return;
    const id = parseInt(await window.ethereum.request({ method: "eth_chainId" }), 16);
    setWrongChain(id !== cfg.chainId);
  }, [cfg]);

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((a) => setAccount(a[0]?.toLowerCase() || null));
    const onAcc = (a) => setAccount(a[0]?.toLowerCase() || null);
    window.ethereum.on?.("accountsChanged", onAcc);
    window.ethereum.on?.("chainChanged", checkChain);
    return () => { window.ethereum.removeListener?.("accountsChanged", onAcc); window.ethereum.removeListener?.("chainChanged", checkChain); };
  }, [checkChain]);

  useEffect(() => { checkChain(); }, [checkChain]);

  const connect = async () => {
    if (!window.ethereum) return toast.error("MetaMask not found. Install the MetaMask extension to sign transactions.");
    try {
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accs[0].toLowerCase());
      if (cfg) {
        const hex = "0x" + cfg.chainId.toString(16);
        try {
          await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
        } catch {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: hex, chainName: "FoodChain Local", rpcUrls: [cfg.rpcUrl], nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 } }],
          });
        }
        await checkChain();
      }
    } catch (e) { toast.error(errMsg(e)); }
  };

  const walletOk = !!user && account === user.wallet && !wrongChain;

  // Run a contract write: fn receives the signer-connected contract and returns a tx.
  const send = async (label, fn) => {
    if (!cfg?.address) { toast.error("Contract not deployed yet"); return null; }
    if (!walletOk) { toast.error(`Connect MetaMask with your registered wallet (${user.wallet.slice(0, 8)}…) on the right network`); return null; }
    const t = toast.loading(`${label}: confirm in MetaMask…`);
    try {
      const signer = await new BrowserProvider(window.ethereum).getSigner();
      const contract = new Contract(cfg.address, cfg.abi, signer);
      const tx = await fn(contract);
      toast.loading(`${label}: waiting for block…`, { id: t });
      const receipt = await tx.wait();
      toast.success(`${label} confirmed on-chain`, { id: t });
      return { receipt, contract };
    } catch (e) {
      toast.error(errMsg(e), { id: t });
      return null;
    }
  };

  return <Ctx.Provider value={{ account, cfg, connect, walletOk, wrongChain, send }}>{children}</Ctx.Provider>;
}
