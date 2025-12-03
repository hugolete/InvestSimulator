import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CreateProfile from "./pages/CreateProfile";
import AssetPage from "./pages/AssetPage";

function App() {
  const [profileId, setProfileId] = useState(null);

  return (
      <Router>
        <Routes>
          {/* Page d'accueil */}
          <Route
              path="/"
              element={<Home onSelectProfile={setProfileId} />}
          />

          {/* Page pour créer un profil */}
          <Route path="/create-profile" element={<CreateProfile />} />

          {/* Dashboard dépend du profil */}
          <Route
              path="/dashboard"
              element={<Dashboard profileId={profileId} />}
          />
        </Routes>
      </Router>
  );
}

export default App;
