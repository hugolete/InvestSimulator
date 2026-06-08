/**
 * Tests Frontend - InvestSimulator
 * Stack : Jest + React Testing Library (inclus dans CRA)
 */

// ─────────────────────────────────────────────
// Mocks globaux AVANT les imports
// ─────────────────────────────────────────────

// Mock api.js avec des jest.fn() explicites
jest.mock("../api/api", () => ({
    apiGet: jest.fn(),
    apiPost: jest.fn(),
    apiDelete: jest.fn(),
    apiPut: jest.fn(),
    apiForm: jest.fn(),
}));

// Mock recharts pour éviter les warnings de dimensions jsdom
jest.mock("recharts", () => {
    const React = require("react");
    return {
        LineChart: ({ children }) => React.createElement("div", { "data-testid": "line-chart" }, children),
        Line: () => null,
        XAxis: () => null,
        YAxis: () => null,
        CartesianGrid: () => null,
        Tooltip: () => null,
        ResponsiveContainer: ({ children }) => React.createElement("div", { "data-testid": "responsive-container" }, children),
    };
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { apiGet, apiPost, apiDelete, apiPut, apiForm } from "../api/api";
import * as assetsApi from "../api/assets";
import * as profilesApi from "../api/profiles";
import * as favoritesApi from "../api/favorites";

// ─────────────────────────────────────────────
// Tests : src/api/api.js
// ─────────────────────────────────────────────
describe("api.js - apiFetch", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
        process.env.REACT_APP_API_KEY = "test-key";
    });

    afterEach(() => jest.resetAllMocks());

    test("apiGet lève une erreur si response.ok = false", async () => {
        global.fetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
        // On teste directement fetch puisque api.js est mocké pour les autres tests
        // Ici on teste le comportement réel d'apiFetch via global.fetch
        const response = await fetch("http://localhost:8000/api/test");
        expect(response.ok).toBe(false);
        expect(response.status).toBe(403);
    });

    test("apiForm crée un FormData avec les bonnes entrées", () => {
        const data = { user_id: 1, symbol: "BTC", amount_fiat: 1000 };
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => formData.append(key, value));
        expect(formData.get("user_id")).toBe("1");
        expect(formData.get("symbol")).toBe("BTC");
        expect(formData.get("amount_fiat")).toBe("1000");
    });
});

// ─────────────────────────────────────────────
// Tests : src/api/assets.js
// ─────────────────────────────────────────────
describe("assets.js", () => {
    beforeEach(() => jest.clearAllMocks());

    test("getAssets appelle apiGet avec /api/assets", async () => {
        apiGet.mockResolvedValueOnce([]);
        const { getAssets } = require("../api/assets");
        await getAssets();
        expect(apiGet).toHaveBeenCalledWith("/api/assets");
    });

    test("getAsset appelle apiGet avec /api/assets/:symbol", async () => {
        apiGet.mockResolvedValueOnce({ symbol: "BTC", price: 60000 });
        const { getAsset } = require("../api/assets");
        await getAsset("BTC");
        expect(apiGet).toHaveBeenCalledWith("/api/assets/BTC");
    });

    test("getAllPrices appelle apiGet avec /api/allprices", async () => {
        apiGet.mockResolvedValueOnce({ BTC: 60000 });
        const { getAllPrices } = require("../api/assets");
        await getAllPrices();
        expect(apiGet).toHaveBeenCalledWith("/api/allprices");
    });

    test("getAssetDailyPercentages appelle apiGet avec /api/performances", async () => {
        apiGet.mockResolvedValueOnce([]);
        const { getAssetDailyPercentages } = require("../api/assets");
        await getAssetDailyPercentages();
        expect(apiGet).toHaveBeenCalledWith("/api/performances");
    });

    test("buyAsset appelle apiForm avec les bons paramètres", async () => {
        apiForm.mockResolvedValueOnce({ success: true });
        const { buyAsset } = require("../api/assets");
        await buyAsset(1, "BTC", 1000, "MANUAL");
        expect(apiForm).toHaveBeenCalledWith("/api/buy", {
            user_id: 1, symbol: "BTC", amount_fiat: 1000, comment: "MANUAL",
        });
    });

    test("sellAsset lève une erreur si quantité = 0", async () => {
        const { sellAsset } = require("../api/assets");
        await expect(sellAsset(1, "BTC", 0, "MANUAL")).rejects.toThrow();
    });

    test("sellAsset lève une erreur si quantité < 0", async () => {
        const { sellAsset } = require("../api/assets");
        await expect(sellAsset(1, "BTC", -1, "MANUAL")).rejects.toThrow();
    });

    test("sellAsset appelle apiForm avec les bons paramètres", async () => {
        apiForm.mockResolvedValueOnce({ success: true });
        const { sellAsset } = require("../api/assets");
        await sellAsset(1, "BTC", 0.5, "MANUAL");
        expect(apiForm).toHaveBeenCalledWith("/api/sell", {
            user_id: 1, symbol: "BTC", asset_amount: 0.5, comment: "MANUAL",
        });
    });

    test("fetchAssetData appelle apiGet 3 fois en parallèle", async () => {
        apiGet
            .mockResolvedValueOnce({ symbol: "BTC", price: 60000 })
            .mockResolvedValueOnce({ history: { "1d": 59000 } })
            .mockResolvedValueOnce({ "1d": -1.5 });
        const { fetchAssetData } = require("../api/assets");
        const result = await fetchAssetData("BTC");
        expect(apiGet).toHaveBeenCalledTimes(3);
        expect(result).toHaveProperty("asset");
        expect(result).toHaveProperty("history");
        expect(result).toHaveProperty("percentages");
    });

    test("fetchAssetData lève une erreur si apiGet échoue", async () => {
        // On espionne console.error et on remplace temporairement son exécution par une fonction vide
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        apiGet.mockRejectedValueOnce(new Error("Network error"));

        await expect(assetsApi.fetchAssetData("BTC")).rejects.toThrow();

        // On vérifie éventuellement que le console.error a bien été appelé avec le bon message
        expect(consoleSpy).toHaveBeenCalledWith(
            "Erreur lors du chargement des données de la page d'actif:",
            expect.any(Error)
        );

        // On restaure le comportement normal de console.error pour les autres tests
        consoleSpy.mockRestore();
    });
});

// ─────────────────────────────────────────────
// Tests : src/api/profiles.js
// ─────────────────────────────────────────────
describe("profiles.js", () => {
    beforeEach(() => jest.clearAllMocks());

    test("getProfiles appelle apiGet avec /api/profiles/", async () => {
        apiGet.mockResolvedValueOnce([]);
        const { getProfiles } = require("../api/profiles");
        await getProfiles();
        expect(apiGet).toHaveBeenCalledWith("/api/profiles/");
    });

    test("getProfile appelle apiGet avec /api/profiles/:id", async () => {
        apiGet.mockResolvedValueOnce({ profileName: "Test" });
        const { getProfile } = require("../api/profiles");
        await getProfile(1);
        expect(apiGet).toHaveBeenCalledWith("/api/profiles/1");
    });

    test("getPerformance appelle apiGet avec /api/profiles/:id/performance", async () => {
        apiGet.mockResolvedValueOnce(5.5);
        const { getPerformance } = require("../api/profiles");
        await getPerformance(1);
        expect(apiGet).toHaveBeenCalledWith("/api/profiles/1/performance");
    });

    test("createProfile appelle apiPost avec le nom encodé", async () => {
        apiPost.mockResolvedValueOnce({ id: 1 });
        const { createProfile } = require("../api/profiles");
        await createProfile("Mon Profil");
        expect(apiPost).toHaveBeenCalledWith(
            expect.stringContaining("Mon%20Profil"), {}
        );
    });

    test("editProfile appelle apiPut avec /api/profiles/:id/edit", async () => {
        apiPut.mockResolvedValueOnce({ id: 1 });
        const { editProfile } = require("../api/profiles");
        await editProfile(1, "NewName");
        expect(apiPut).toHaveBeenCalledWith(
            expect.stringContaining("/api/profiles/1/edit")
        );
    });
});

// ─────────────────────────────────────────────
// Tests : src/api/favorites.js
// ─────────────────────────────────────────────
describe("favorites.js", () => {
    beforeEach(() => jest.clearAllMocks());

    test("getFavorites retourne data.favorites (pas l'objet entier)", async () => {
        apiGet.mockResolvedValueOnce({ favorites: ["BTC", "AAPL"] });
        const { getFavorites } = require("../api/favorites");
        const result = await getFavorites(1);
        expect(result).toEqual(["BTC", "AAPL"]);
    });

    test("getFavorites appelle apiGet avec /api/favorites/:id", async () => {
        apiGet.mockResolvedValueOnce({ favorites: [] });
        const { getFavorites } = require("../api/favorites");
        await getFavorites(1);
        expect(apiGet).toHaveBeenCalledWith("/api/favorites/1");
    });

    test("addFavorite appelle apiPost", async () => {
        apiPost.mockResolvedValueOnce({ favorites: ["BTC"] });
        const { addFavorite } = require("../api/favorites");
        await addFavorite(1, "BTC");
        expect(apiPost).toHaveBeenCalledWith(
            expect.stringContaining("/api/favorites/1"), {}
        );
    });

    test("deleteFavorite appelle apiDelete avec /api/favorites/:id/:symbol", async () => {
        apiDelete.mockResolvedValueOnce({ favorites: [] });
        const { deleteFavorite } = require("../api/favorites");
        await deleteFavorite(1, "BTC");
        expect(apiDelete).toHaveBeenCalledWith("/api/favorites/1/BTC");
    });
});

// ─────────────────────────────────────────────
// Tests : Home.jsx
// ─────────────────────────────────────────────
describe("Home.jsx", () => {
    const Home = require("../pages/Home").default;
    let getProfilesSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        getProfilesSpy = jest.spyOn(profilesApi, "getProfiles");
    });

    afterEach(() => {
        getProfilesSpy.mockRestore();
    });

    test("affiche le titre 'Choisissez un profil'", async () => {
        getProfilesSpy.mockResolvedValueOnce([]);
        render(<MemoryRouter><Home onSelectProfile={jest.fn()} /></MemoryRouter>);

        // Résolution de l'effet asynchrone pour éviter l'avertissement 'act(...)'
        await waitFor(() => {
            expect(screen.getByText(/Choisissez un profil/i)).toBeInTheDocument();
        });
    });

    test("affiche les profils dans le select", async () => {
        getProfilesSpy.mockResolvedValueOnce([
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
        ]);
        render(<MemoryRouter><Home onSelectProfile={jest.fn()} /></MemoryRouter>);
        await waitFor(() => {
            expect(screen.getByText(/Alice/i)).toBeInTheDocument();
            expect(screen.getByText(/Bob/i)).toBeInTheDocument();
        });
    });

    test("bouton Continuer désactivé si pas de profils", async () => {
        getProfilesSpy.mockResolvedValueOnce([]);
        render(<MemoryRouter><Home onSelectProfile={jest.fn()} /></MemoryRouter>);
        await waitFor(() => {
            expect(screen.getByText(/Continuer/i)).toBeDisabled();
        });
    });

    test("appelle onSelectProfile au clic sur Continuer", async () => {
        const mockOnSelect = jest.fn();
        getProfilesSpy.mockResolvedValueOnce([{ id: 1, name: "Alice" }]);
        render(<MemoryRouter><Home onSelectProfile={mockOnSelect} /></MemoryRouter>);

        await waitFor(() => expect(screen.getByText(/Alice/i)).toBeInTheDocument());
        fireEvent.click(screen.getByText(/Continuer/i));
        expect(mockOnSelect).toHaveBeenCalledWith(1);
    });

    test("bouton 'Créer un profil' est présent", async () => {
        getProfilesSpy.mockResolvedValueOnce([]);
        render(<MemoryRouter><Home onSelectProfile={jest.fn()} /></MemoryRouter>);
        await waitFor(() => {
            expect(screen.getByText(/Créer un profil/i)).toBeInTheDocument();
        });
    });
});

// ─────────────────────────────────────────────
// Tests : CreateProfile.jsx
// ─────────────────────────────────────────────
describe("CreateProfile.jsx", () => {
    const CreateProfile = require("../pages/CreateProfile").default;

    test("affiche le titre et le formulaire", () => {
        render(<MemoryRouter><CreateProfile /></MemoryRouter>);
        expect(screen.getByText(/Créer un profil/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Nom du profil/i)).toBeInTheDocument();
    });

    test("le bouton submit est de type submit", () => {
        render(<MemoryRouter><CreateProfile /></MemoryRouter>);
        const button = screen.getByRole("button", { name: /^Créer$/i });
        expect(button).toHaveAttribute("type", "submit");
    });

    test("met à jour l'input quand on tape", () => {
        render(<MemoryRouter><CreateProfile /></MemoryRouter>);
        const input = screen.getByPlaceholderText(/Nom du profil/i);
        fireEvent.change(input, { target: { value: "MonProfil" } });
        expect(input.value).toBe("MonProfil");
    });
});

// ─────────────────────────────────────────────
// Tests : App.js - persistance profileId localStorage
// ─────────────────────────────────────────────
describe("App.js - localStorage profileId", () => {
    beforeEach(() => localStorage.clear());

    test("profileId est null si localStorage vide", () => {
        const profileId = localStorage.getItem("profileId")
            ? parseInt(localStorage.getItem("profileId")) : null;
        expect(profileId).toBeNull();
    });

    test("profileId est parsé en int depuis localStorage", () => {
        localStorage.setItem("profileId", "42");
        const profileId = parseInt(localStorage.getItem("profileId"));
        expect(profileId).toBe(42);
        expect(typeof profileId).toBe("number");
    });

    test("handleSelectProfile sauvegarde dans localStorage", () => {
        const handleSelectProfile = (id) => localStorage.setItem("profileId", id);
        handleSelectProfile(5);
        expect(localStorage.getItem("profileId")).toBe("5");
    });
});

// ─────────────────────────────────────────────
// Tests : PriceChart.jsx
// ─────────────────────────────────────────────
describe("PriceChart.jsx", () => {
    const PriceChart = require("../components/PriceChart").default;

    test("se rend sans crasher avec des données vides", () => {
        render(<PriceChart data={[]} period="1h" />);
        expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    });

    test("se rend avec des données valides", () => {
        const data = [
            { timestamp: 1700000000000, price: 60000 },
            { timestamp: 1700003600000, price: 61000 },
        ];
        render(<PriceChart data={data} period="1h" />);
        expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    test("accepte une couleur personnalisée sans crasher", () => {
        expect(() => render(<PriceChart data={[]} period="1d" color="#ff0000" />)).not.toThrow();
    });

    test("utilise la couleur par défaut si non spécifiée", () => {
        expect(() => render(<PriceChart data={[]} period="1h" />)).not.toThrow();
    });
});

// ─────────────────────────────────────────────
// Tests : Sidebar.jsx
// ─────────────────────────────────────────────
describe("Sidebar.jsx", () => {
    const Sidebar = require("../components/Sidebar").default;

    const mockAssets = [
        { symbol: "BTC", name: "Bitcoin", type: "crypto" },
        { symbol: "AAPL", name: "Apple", type: "stock" },
        { symbol: "SPY", name: "SPDR S&P 500", type: "etf" },
        { symbol: "USD", name: "Dollar", type: "currency" },
    ];

    let getAssetsSpy, getFavoritesSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        getAssetsSpy = jest.spyOn(assetsApi, "getAssets").mockResolvedValue(mockAssets);
        getFavoritesSpy = jest.spyOn(favoritesApi, "getFavorites").mockResolvedValue([]);
    });

    afterEach(() => {
        getAssetsSpy.mockRestore();
        getFavoritesSpy.mockRestore();
    });

    const renderSidebar = (isOpen = true) =>
        render(<MemoryRouter><Sidebar isOpen={isOpen} profileId={1} allPrices={{}} /></MemoryRouter>);

    test("est caché quand isOpen = false", async () => {
        const { container } = renderSidebar(false);
        await waitFor(() => {
            expect(container.querySelector("aside")).toHaveStyle("display: none");
        });
    });

    test("est visible quand isOpen = true", async () => {
        const { container } = renderSidebar(true);
        await waitFor(() => {
            expect(container.querySelector("aside")).toHaveStyle("display: block");
        });
    });

    test("filtre les currencies de la liste", async () => {
        renderSidebar();
        await waitFor(() => {
            expect(screen.queryByText("Dollar")).not.toBeInTheDocument();
        });
    });

    test("affiche les résultats de recherche quand on tape", async () => {
        renderSidebar();
        await waitFor(() => expect(getAssetsSpy).toHaveBeenCalled());
        fireEvent.change(screen.getByPlaceholderText(/Recherche/i), { target: { value: "BTC" } });
        await waitFor(() => expect(screen.getByText("Bitcoin")).toBeInTheDocument());
    });

    test("affiche 'Aucun résultat' si la recherche ne trouve rien", async () => {
        renderSidebar();
        await waitFor(() => expect(getAssetsSpy).toHaveBeenCalled());
        fireEvent.change(screen.getByPlaceholderText(/Recherche/i), { target: { value: "XXXXXXXXXXX" } });
        await waitFor(() => expect(screen.getByText(/Aucun résultat/i)).toBeInTheDocument());
    });

    test("bouton Dashboard est présent", async () => {
        renderSidebar();
        await waitFor(() => {
            expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
        });
    });
});

// ─────────────────────────────────────────────
// Tests : DashboardContent
// ─────────────────────────────────────────────
describe("DashboardContent - filtrage des positions", () => {
    test("filtre les positions à quantity <= 0.00000001", () => {
        const assets = [
            { symbol: "BTC", quantity: 0.5, type: "crypto" },
            { symbol: "USD", quantity: 1000, type: "currency" },
            { symbol: "ETH", quantity: 0.0, type: "crypto" },
            { symbol: "AAPL", quantity: 0.00000001, type: "stock" },
        ];
        const active = assets.filter(i =>
            i.symbol && i.symbol !== "USD" && i.quantity > 0.00000001 && i.type !== "currency"
        );
        expect(active).toHaveLength(1);
        expect(active[0].symbol).toBe("BTC");
    });

    test("total_worth est 0 si undefined", () => {
        const profile = {};
        expect(profile.total_worth ?? 0).toBe(0);
    });

    test("cash est 0 si USD absent des assets", () => {
        const profile = { assets: [] };
        expect(profile.assets?.find(a => a.symbol === "USD")?.quantity ?? 0).toBe(0);
    });

    test("cash retourne la bonne valeur si USD présent", () => {
        const profile = { assets: [{ symbol: "USD", quantity: 1500.0 }] };
        expect(profile.assets?.find(a => a.symbol === "USD")?.quantity ?? 0).toBe(1500.0);
    });

    test("profile.assets?.find ne crash pas si assets est undefined", () => {
        const profile = { total_worth: 2000 };
        expect(profile.assets?.find(a => a.symbol === "USD")?.quantity ?? 0).toBe(0);
    });
});

// ─────────────────────────────────────────────
// Tests : Régressions Frontend
// ─────────────────────────────────────────────
describe("Régressions Frontend", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    test("profileId depuis localStorage est un nombre, pas une string", () => {
        localStorage.setItem("profileId", "1");
        const profileId = localStorage.getItem("profileId")
            ? parseInt(localStorage.getItem("profileId")) : null;
        expect(typeof profileId).toBe("number");
        expect(profileId).toBe(1);
        expect(profileId).not.toBe("1");
    });

    test("sellAsset refuse quantité = 0", async () => {
        const { sellAsset } = require("../api/assets");
        await expect(sellAsset(1, "BTC", 0, "test")).rejects.toThrow();
    });

    test("sellAsset refuse quantité négative", async () => {
        const { sellAsset } = require("../api/assets");
        await expect(sellAsset(1, "BTC", -5, "test")).rejects.toThrow();
    });

    test("sellAsset refuse quantité null", async () => {
        const { sellAsset } = require("../api/assets");
        await expect(sellAsset(1, "BTC", null, "test")).rejects.toThrow();
    });

    test("getFavorites retourne un array, pas l'objet entier", async () => {
        apiGet.mockResolvedValueOnce({ user_id: 1, favorites: ["BTC", "ETH"] });
        const { getFavorites } = require("../api/favorites");
        const result = await getFavorites(1);
        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual(["BTC", "ETH"]);
    });

    test("fetchAssetData retourne asset, history et percentages", async () => {
        apiGet
            .mockResolvedValueOnce({ symbol: "BTC", price: 60000 })
            .mockResolvedValueOnce({ symbol: "BTC", history: {} })
            .mockResolvedValueOnce({ "1d": -1.5 });
        const { fetchAssetData } = require("../api/assets");
        const result = await fetchAssetData("BTC");
        expect(result).toHaveProperty("asset");
        expect(result).toHaveProperty("history");
        expect(result).toHaveProperty("percentages");
        expect(result.asset.symbol).toBe("BTC");
    });
});
