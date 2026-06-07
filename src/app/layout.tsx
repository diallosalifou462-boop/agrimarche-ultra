import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgriMarché - Votre marché agricole',
  description: 'Achetez et vendez des produits agricoles frais au Sénégal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}