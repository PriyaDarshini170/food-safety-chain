import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/Auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import NewProduct from "./pages/NewProduct";
import Participants from "./pages/Participants";
import PublicProduct from "./pages/PublicProduct";

function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/p/:id" element={<PublicProduct />} />
        <Route path="/" element={<Guard><Dashboard /></Guard>} />
        <Route path="/products" element={<Guard><Products /></Guard>} />
        <Route path="/products/new" element={<Guard roles={["FARMER"]}><NewProduct /></Guard>} />
        <Route path="/products/:id" element={<Guard><ProductDetail /></Guard>} />
        <Route path="/participants" element={<Guard roles={["ADMIN"]}><Participants /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
