import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {icons:{icon:'/favicon.svg'},title:'Rolecraft | Know where to focus next',description:'Upload your CV and your available time. Get a direction, a plan that fits your hours, a tailored CV and one email to send.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
