import dynamic from "next/dynamic";

// Recharts + Turbopack ont un bug TDZ (Cannot access 'P' before initialization)
// lors du prérendu SSR. On désactive le SSR pour toute la page LMNP.
const LmnpClient = dynamic(() => import("./LmnpClient"), { ssr: false });

export default function LmnpPage() {
  return <LmnpClient />;
}
