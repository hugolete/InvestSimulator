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
import { MemoryRouter, Routes, Route, Outlet, useOutletContext } from "react-router-dom";
import { apiGet, apiPost, apiDelete, apiPut, apiForm } from "../api/api";
import * as assetsApi from "../api/assets";
import * as profilesApi from "../api/profiles";
import * as favoritesApi from "../api/favorites";

// ─────────────────────────────────────────────
// Tests : src/api/api.js
// ─────────────────────────────────────────────
describe("api.js (implémentation réelle)", () => {
    // api.js est mocké pour le reste du fichier : ici on charge la vraie version
    const realApi = jest.requireActual("../api/api");

    const jsonResponse = (status, body) => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    });

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    test("apiGet renvoie le JSON si la réponse est OK", async () => {
        global.fetch.mockResolvedValueOnce(jsonResponse(200, { symbol: "BTC" }));
        await expect(realApi.apiGet("/api/assets/BTC")).resolves.toEqual({ symbol: "BTC" });
    });

    test("apiGet envoie la clé API dans les headers", async () => {
        global.fetch.mockResolvedValueOnce(jsonResponse(200, {}));
        await realApi.apiGet("/api/assets");
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toMatch(/\/api\/assets$/);
        expect(options.headers).toHaveProperty("X-API-Key");
    });

    test("lève une erreur avec le message 'detail' de FastAPI", async () => {
        global.fetch.mockResolvedValueOnce(jsonResponse(400, { detail: "Fonds insuffisants pour acheter" }));
        await expect(realApi.apiGet("/api/x")).rejects.toThrow("Fonds insuffisants pour acheter");
    });

    test("formate les erreurs de validation 422 (detail = liste)", async () => {
        global.fetch.mockResolvedValueOnce(jsonResponse(422, {
            detail: [{ loc: ["body", "amount_fiat"], msg: "Input should be greater than 0" }],
        }));
        await expect(realApi.apiGet("/api/x")).rejects.toThrow("amount_fiat : Input should be greater than 0");
    });

    test("message générique si le corps d'erreur n'est pas du JSON", async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false, status: 500, json: async () => { throw new SyntaxError("not json"); },
        });
        await expect(realApi.apiGet("/api/x")).rejects.toThrow("API error: 500");
    });

    test("l'erreur expose le code HTTP", async () => {
        global.fetch.mockResolvedValueOnce(jsonResponse(404, { detail: "Profil introuvable" }));
        await expect(realApi.apiGet("/api/x")).rejects.toMatchObject({ status: 404 });
    });

    test("apiForm envoie un FormData en POST", async () => {
        global.fetch.mockResolvedValueOnce(jsonResponse(200, { amount: 0.01 }));
        await realApi.apiForm("/api/buy", { user_id: 1, symbol: "BTC", amount_fiat: 1000 });

        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toMatch(/\/api\/buy$/);
        expect(options.method).toBe("POST");
        expect(options.body).toBeInstanceOf(FormData);
        expect(options.body.get("symbol")).toBe("BTC");
        expect(options.body.get("amount_fiat")).toBe("1000");
    });

    test("régression : apiForm rejette au lieu de résoudre avec {detail} en cas d'erreur", async () => {
        global.fetch.mockResolvedValueOnce(jsonResponse(400, { detail: "Fonds insuffisants pour acheter" }));
        await expect(
            realApi.apiForm("/api/buy", { user_id: 1, symbol: "BTC", amount_fiat: 999999 })
        ).rejects.toThrow("Fonds insuffisants pour acheter");
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

    test("affiche le titre et le libellé de sélection", async () => {
        getProfilesSpy.mockResolvedValueOnce([]);
        render(<MemoryRouter><Home onSelectProfile={jest.fn()} /></MemoryRouter>);

        // Résolution de l'effet asynchrone pour éviter l'avertissement 'act(...)'
        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "InvestSimulator" })).toBeInTheDocument();
            expect(screen.getByText(/Sélectionner un profil/i)).toBeInTheDocument();
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

    test("bouton 'Accéder au Dashboard' désactivé si pas de profils", async () => {
        getProfilesSpy.mockResolvedValueOnce([]);
        render(<MemoryRouter><Home onSelectProfile={jest.fn()} /></MemoryRouter>);
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Accéder au Dashboard/i })).toBeDisabled();
        });
    });

    test("appelle onSelectProfile (en nombre) au clic sur 'Accéder au Dashboard'", async () => {
        const mockOnSelect = jest.fn();
        getProfilesSpy.mockResolvedValueOnce([{ id: 1, name: "Alice" }]);
        render(<MemoryRouter><Home onSelectProfile={mockOnSelect} /></MemoryRouter>);

        await waitFor(() => expect(screen.getByText(/Alice/i)).toBeInTheDocument());
        fireEvent.click(screen.getByRole("button", { name: /Accéder au Dashboard/i }));
        expect(mockOnSelect).toHaveBeenCalledWith(1);
    });

    test("bouton 'Créer un nouveau profil' est présent", async () => {
        getProfilesSpy.mockResolvedValueOnce([]);
        render(<MemoryRouter><Home onSelectProfile={jest.fn()} /></MemoryRouter>);
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Créer un nouveau profil/i })).toBeInTheDocument();
        });
    });
});

// ─────────────────────────────────────────────
// Tests : CreateProfile.jsx
// ─────────────────────────────────────────────
describe("CreateProfile.jsx", () => {
    const CreateProfile = require("../pages/CreateProfile").default;
    let createProfileSpy, alertSpy;

    beforeEach(() => {
        createProfileSpy = jest.spyOn(profilesApi, "createProfile");
        alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    });

    afterEach(() => {
        createProfileSpy.mockRestore();
        alertSpy.mockRestore();
    });

    test("affiche le titre et le formulaire", () => {
        render(<MemoryRouter><CreateProfile /></MemoryRouter>);
        expect(screen.getByRole("heading", { name: /Nouveau Profil/i })).toBeInTheDocument();
        expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    test("le bouton 'Créer le profil' est de type submit", () => {
        render(<MemoryRouter><CreateProfile /></MemoryRouter>);
        const button = screen.getByRole("button", { name: /Créer le profil/i });
        expect(button).toHaveAttribute("type", "submit");
    });

    test("met à jour l'input quand on tape", () => {
        render(<MemoryRouter><CreateProfile /></MemoryRouter>);
        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "MonProfil" } });
        expect(input.value).toBe("MonProfil");
    });

    test("refuse un nom vide sans appeler l'API", () => {
        render(<MemoryRouter><CreateProfile /></MemoryRouter>);
        fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
        fireEvent.click(screen.getByRole("button", { name: /Créer le profil/i }));

        expect(createProfileSpy).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith("Veuillez entrer un nom valide.");
    });

    test("affiche le message d'erreur renvoyé par l'API", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        createProfileSpy.mockRejectedValueOnce(new Error("Un profil avec ce nom existe déjà"));

        render(<MemoryRouter><CreateProfile /></MemoryRouter>);
        fireEvent.change(screen.getByRole("textbox"), { target: { value: "Alice" } });
        fireEvent.click(screen.getByRole("button", { name: /Créer le profil/i }));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Un profil avec ce nom existe déjà"));
        });
        consoleSpy.mockRestore();
    });
});

// ─────────────────────────────────────────────
// Tests : App.js - persistance profileId localStorage (vrai composant App)
// ─────────────────────────────────────────────
describe("App.js - localStorage profileId", () => {
    const App = require("../App").default;
    let getProfilesSpy, getProfileSpy, getAllPricesSpy, consoleSpy;

    beforeEach(() => {
        localStorage.clear();
        window.history.pushState({}, "", "/");
        getProfilesSpy = jest.spyOn(profilesApi, "getProfiles").mockResolvedValue([{ id: 1, name: "Alice" }]);
        // Le profil n'est pas chargeable : le Dashboard affiche son écran d'erreur, ce qui suffit ici
        getProfileSpy = jest.spyOn(profilesApi, "getProfile").mockRejectedValue(new Error("not found"));
        getAllPricesSpy = jest.spyOn(assetsApi, "getAllPrices").mockResolvedValue({});
        consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        getProfilesSpy.mockRestore();
        getProfileSpy.mockRestore();
        getAllPricesSpy.mockRestore();
        consoleSpy.mockRestore();
        window.history.pushState({}, "", "/");
    });

    test("sélectionner un profil le sauvegarde dans localStorage", async () => {
        render(<App />);

        await waitFor(() => expect(screen.getByText(/Alice/i)).toBeInTheDocument());
        fireEvent.click(screen.getByRole("button", { name: /Accéder au Dashboard/i }));

        expect(localStorage.getItem("profileId")).toBe("1");
        await waitFor(() => expect(getProfileSpy).toHaveBeenCalledWith(1));
    });

    test("le profileId sauvegardé est restauré (en nombre) au rechargement", async () => {
        localStorage.setItem("profileId", "42");
        window.history.pushState({}, "", "/dashboard");

        render(<App />);

        await waitFor(() => expect(getProfileSpy).toHaveBeenCalledWith(42));
        await waitFor(() => expect(screen.getByText(/Profil non trouvé/i)).toBeInTheDocument());
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

    test("n'est pas rendu quand isOpen = false", async () => {
        const { container } = renderSidebar(false);
        await waitFor(() => expect(getAssetsSpy).toHaveBeenCalled());
        expect(container.querySelector("aside")).toBeNull();
    });

    test("est rendu quand isOpen = true", async () => {
        const { container } = renderSidebar(true);
        await waitFor(() => {
            expect(container.querySelector("aside")).toBeInTheDocument();
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
// Monte `child` sous une route parente qui fournit le contexte d'Outlet (comme Dashboard)
const outletTree = (child, context, { initialPath = "/dashboard", childPath = null } = {}) => (
    <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
            <Route path="/dashboard" element={<Outlet context={context} />}>
                {childPath
                    ? <Route path={childPath} element={child} />
                    : <Route index element={child} />}
            </Route>
        </Routes>
    </MemoryRouter>
);

const fmtUsd = (value) =>
    Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

describe("DashboardContent + PortfolioHeader (profil partagé par Dashboard)", () => {
    const DashboardContent = require("../components/DashboardContent").default;
    let spies;

    const profile = {
        profileName: "Alice",
        total_worth: 2500,
        performance: 25,
        assets: [
            { symbol: "BTC", name: "Bitcoin", type: "crypto", quantity: 0.5, worth: 1500 },
            { symbol: "USD", name: "Dollar", type: "currency", quantity: 1000, worth: 1000 },
            { symbol: "ETH", name: "Ethereum", type: "crypto", quantity: 0, worth: 0 },
            { symbol: "AAPL", name: "Apple", type: "stock", quantity: 0.00000001, worth: 0 },
        ],
    };
    const context = (p) => ({ profileData: p, refreshProfile: jest.fn(), allPrices: { BTC: 3000 } });

    beforeEach(() => {
        spies = [
            jest.spyOn(assetsApi, "getAssets").mockResolvedValue([]),
            jest.spyOn(assetsApi, "getAssetDailyPercentages").mockResolvedValue([{ symbol: "BTC", percentage: 2.5 }]),
            jest.spyOn(profilesApi, "getProfile"),
            jest.spyOn(profilesApi, "getPerformance"),
        ];
    });

    afterEach(() => spies.forEach(s => s.mockRestore()));

    test("affiche seulement les positions actives (hors cash et quantités nulles)", async () => {
        render(outletTree(<DashboardContent />, context(profile)));

        await waitFor(() => expect(assetsApi.getAssets).toHaveBeenCalled());
        expect(screen.getByText("Bitcoin")).toBeInTheDocument();
        expect(screen.queryByText("Dollar")).not.toBeInTheDocument();
        expect(screen.queryByText("Ethereum")).not.toBeInTheDocument();
        expect(screen.queryByText("Apple")).not.toBeInTheDocument();
    });

    test("ne refait pas de requête profil : utilise le profil du Dashboard", async () => {
        render(outletTree(<DashboardContent />, context(profile)));

        await waitFor(() => expect(assetsApi.getAssetDailyPercentages).toHaveBeenCalled());
        expect(profilesApi.getProfile).not.toHaveBeenCalled();
        expect(profilesApi.getPerformance).not.toHaveBeenCalled();
    });

    test("l'en-tête affiche total, gain vs départ, performance et liquidités", async () => {
        render(outletTree(<DashboardContent />, context(profile)));
        await waitFor(() => expect(assetsApi.getAssets).toHaveBeenCalled());

        expect(screen.getByText(`$${fmtUsd(2500)}`)).toBeInTheDocument();     // valeur totale
        expect(screen.getByText(`+$${fmtUsd(500)}`)).toBeInTheDocument();     // vs départ (2000)
        expect(screen.getByText("(+25.00%)")).toBeInTheDocument();             // performance
        expect(screen.getByText(`$${fmtUsd(1000)}`)).toBeInTheDocument();     // liquidités
        expect(screen.getAllByText(`$${fmtUsd(1500)}`).length).toBeGreaterThan(0); // positions
    });

    test("se met à jour quand le profil du contexte change (après un trade)", async () => {
        const { rerender } = render(outletTree(<DashboardContent />, context(profile)));
        await waitFor(() => expect(assetsApi.getAssets).toHaveBeenCalled());

        rerender(outletTree(<DashboardContent />, context({ ...profile, total_worth: 3200, performance: 60 })));

        expect(screen.getByText(`$${fmtUsd(3200)}`)).toBeInTheDocument();
        expect(screen.getByText("(+60.00%)")).toBeInTheDocument();
    });
});

// ─────────────────────────────────────────────
// Tests : Dashboard.jsx (chargement du profil, redirection, rafraîchissement)
// ─────────────────────────────────────────────
describe("Dashboard.jsx", () => {
    const Dashboard = require("../pages/Dashboard").default;
    let spies, mountCount;

    // Page enfant qui compte ses montages et peut déclencher refreshProfile
    function Probe() {
        const { profileData, refreshProfile } = useOutletContext();
        React.useEffect(() => { mountCount += 1; }, []);
        return (
            <div>
                <span>{`Solde: ${profileData.total_worth}`}</span>
                <button onClick={refreshProfile}>Rafraîchir</button>
            </div>
        );
    }

    const renderDashboard = (profileId) => render(
        <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
                <Route path="/" element={<div>Page d'accueil</div>} />
                <Route path="/dashboard" element={<Dashboard profileId={profileId} />}>
                    <Route index element={<Probe />} />
                </Route>
            </Routes>
        </MemoryRouter>
    );

    const profileWith = (total) => ({ profileName: "Alice", total_worth: total, performance: 0, assets: [] });

    beforeEach(() => {
        mountCount = 0;
        spies = {
            getProfile: jest.spyOn(profilesApi, "getProfile"),
            getAllPrices: jest.spyOn(assetsApi, "getAllPrices").mockResolvedValue({}),
            getAssets: jest.spyOn(assetsApi, "getAssets").mockResolvedValue([]),
            getFavorites: jest.spyOn(favoritesApi, "getFavorites").mockResolvedValue([]),
            consoleError: jest.spyOn(console, "error").mockImplementation(() => {}),
        };
    });

    afterEach(() => Object.values(spies).forEach(s => s.mockRestore()));

    test("redirige vers l'accueil si aucun profil n'est sélectionné", async () => {
        renderDashboard(null);

        await waitFor(() => expect(screen.getByText("Page d'accueil")).toBeInTheDocument());
        expect(spies.getProfile).not.toHaveBeenCalled();
    });

    test("refreshProfile rafraîchit en arrière-plan sans démonter la page enfant", async () => {
        spies.getProfile
            .mockResolvedValueOnce(profileWith(2000))
            .mockResolvedValueOnce(profileWith(2500));

        renderDashboard(1);
        await waitFor(() => expect(screen.getByText("Solde: 2000")).toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: "Rafraîchir" }));

        await waitFor(() => expect(screen.getByText("Solde: 2500")).toBeInTheDocument());
        expect(mountCount).toBe(1);
        expect(screen.queryByText(/Chargement des données du terminal/i)).not.toBeInTheDocument();
    });

    test("un rafraîchissement en échec garde les dernières données affichées", async () => {
        spies.getProfile
            .mockResolvedValueOnce(profileWith(2000))
            .mockRejectedValueOnce(new Error("Network error"));

        renderDashboard(1);
        await waitFor(() => expect(screen.getByText("Solde: 2000")).toBeInTheDocument());

        fireEvent.click(screen.getByRole("button", { name: "Rafraîchir" }));

        await waitFor(() => expect(spies.getProfile).toHaveBeenCalledTimes(2));
        expect(screen.getByText("Solde: 2000")).toBeInTheDocument();
        expect(screen.queryByText(/Profil non trouvé/i)).not.toBeInTheDocument();
    });
});

// ─────────────────────────────────────────────
// Tests : AssetPage.jsx (achat : rafraîchissement + messages d'erreur)
// ─────────────────────────────────────────────
describe("AssetPage.jsx - achat", () => {
    const AssetPage = require("../pages/AssetPage").default;
    let spies, context;

    beforeEach(() => {
        context = {
            profileData: { assets: [{ symbol: "USD", quantity: 2000 }] },
            refreshProfile: jest.fn(),
            allPrices: { BTC: 50000 },
        };
        spies = {
            fetchAssetData: jest.spyOn(assetsApi, "fetchAssetData").mockResolvedValue({
                asset: { symbol: "BTC", name: "Bitcoin", type: "crypto", sector: "Crypto", price: 50000 },
                history: { history: { "1d": 49000 } },
                percentages: {},
            }),
            fetchChartData: jest.spyOn(assetsApi, "fetchChartData").mockResolvedValue({ data: [] }),
            buyAsset: jest.spyOn(assetsApi, "buyAsset"),
            getProfileHistory: jest.spyOn(profilesApi, "getProfileHistory").mockResolvedValue([]),
            alert: jest.spyOn(window, "alert").mockImplementation(() => {}),
            consoleLog: jest.spyOn(console, "log").mockImplementation(() => {}),
        };
    });

    afterEach(() => Object.values(spies).forEach(s => s.mockRestore()));

    const buy100 = async () => {
        render(outletTree(<AssetPage profileId={1} />, context, {
            initialPath: "/dashboard/asset/BTC", childPath: "asset/:symbol",
        }));

        await waitFor(() => expect(screen.getByRole("heading", { name: "Bitcoin" })).toBeInTheDocument());
        fireEvent.click(screen.getByRole("button", { name: "Acheter" }));
        fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "100" } });
        fireEvent.click(screen.getByRole("button", { name: /Confirmer l'achat/i }));
    };

    test("après un achat réussi : rafraîchit le profil ET l'historique (PRU / plus-values)", async () => {
        spies.buyAsset.mockResolvedValueOnce({ amount: 0.002, symbol: "BTC" });

        await buy100();

        await waitFor(() => expect(context.refreshProfile).toHaveBeenCalledTimes(1));
        expect(spies.buyAsset).toHaveBeenCalledWith(1, "BTC", "100", "MANUAL");
        expect(spies.alert).toHaveBeenCalledWith(expect.stringContaining("Achat réussi"));
        await waitFor(() => expect(spies.getProfileHistory).toHaveBeenCalledTimes(2));
    });

    test("en cas d'échec : affiche le message de l'API et ne rafraîchit rien", async () => {
        spies.buyAsset.mockRejectedValueOnce(new Error("Fonds insuffisants pour acheter"));

        await buy100();

        await waitFor(() => {
            expect(spies.alert).toHaveBeenCalledWith(expect.stringContaining("Fonds insuffisants pour acheter"));
        });
        expect(context.refreshProfile).not.toHaveBeenCalled();
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
