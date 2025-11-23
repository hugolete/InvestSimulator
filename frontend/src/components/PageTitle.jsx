import { useLocation, useParams } from "react-router-dom";

export default function PageTitle() {
    const location = useLocation();
    const { symbol } = useParams(); // assets seront transmis comme cela

    let title = "Dashboard";

    if (location.pathname.startsWith("/asset/") && symbol) {
        title = symbol.toUpperCase();
    }

    return (
        <div style={{textAlign:"center"}}>
            <h1>{title}</h1>
        </div>
    );
}
