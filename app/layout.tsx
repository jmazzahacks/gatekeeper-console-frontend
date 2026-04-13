import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gatekeeper Console',
  description: 'API gateway management console for authentication and authorization',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
