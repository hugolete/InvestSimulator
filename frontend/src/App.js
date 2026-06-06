import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import DashboardContent from "./components/DashboardContent";
import CreateProfile from "./pages/CreateProfile";
import AssetPage from "./pages/AssetPage";
import Dashboard from "./pages/Dashboard";

function App() {
    const [profileId, setProfileId] = useState(localStorage.getItem("profileId") ? parseInt(localStorage.getItem("profileId")) : null); // ← restaure au refresh

    const handleSelectProfile = (id) => {
        localStorage.setItem("profileId", id)  // ← sauvegarde
        setProfileId(id)
    }

  return (
      <Router>
        <Routes>
          {/* Page d'accueil */}
          <Route
              path="/"
              element={<Home onSelectProfile={handleSelectProfile} />}
          />

          {/* Page pour créer un profil */}
          <Route path="/create-profile" element={<CreateProfile />} />

          {/* Dashboard dépend du profil */}
            {/* ROUTE PARENTALE : Gère le Layout (Sidebar) */}
          <Route path="/dashboard" element={<Dashboard profileId={profileId} />}>
              {/* 1. Contenu par défaut (s'affiche sur /dashboard) */}
              <Route index element={<DashboardContent profileId={profileId} />} />
              {/* 2. AssetPage (s'affiche sur /dashboard/asset/:symbol) */}
              <Route path="asset/:symbol" element={<AssetPage profileId={profileId}/>} />
          </Route>
        </Routes>
      </Router>
  );
}

export default App;
