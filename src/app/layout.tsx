import type { Metadata,Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Brillo · Gestión de lavaderos',description:'Tu lavadero, en orden. Servicios, equipo y caja en un solo lugar.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,statusBarStyle:'default',title:'Brillo'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#134e48'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es-CO" data-theme="brillo"><body>{children}</body></html>;}
