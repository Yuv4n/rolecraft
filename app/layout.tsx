import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Rolecraft | Make your experience count',description:'An evidence-first CV studio for your next role.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
