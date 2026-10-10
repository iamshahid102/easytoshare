import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AirForShare.com - Virtual Desktop for your Wi-Fi",
    template: "%s - AirForShare.com",
  },
  description: "Share instantly between devices connected to one network",
  applicationName: "AirForShare",
  openGraph: {
    title: "AirForShare.com - Virtual Desktop for your Wi-Fi",
    description: "Share instantly between devices connected to one network",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={openSans.variable}>
      <body className="font-sans">
        <div className="relative mx-auto box-border min-h-screen w-full min-w-[320px] max-w-[992px] px-4 pb-48 md:flex md:flex-col md:justify-center md:pt-20 lg:pt-[155px]">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
