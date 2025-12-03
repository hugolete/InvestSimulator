import React from 'react';
import PortfolioHeader from './PortfolioHeader';

export default function DashboardContent({ profileId }) {
    return (
        <section>
            {/* L'entête de portefeuille qui DOIT DISPARAÎTRE sur AssetPage */}
            <PortfolioHeader profileId={profileId} />

            {/* Le reste de tout votre contenu spécifique au Dashboard (graphiques, listes, etc.) */}
            <p>Voici le contenu du Dashboard principal qui était juste en dessous du PortfolioHeader.</p>
            {/* ... Le reste du contenu de Dashboard.jsx ... */}
        </section>
    );
}