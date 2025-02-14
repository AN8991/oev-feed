import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OEV Feed - DeFi Lending Protocol Data Aggregator',
  description: 'Monitoring DeFi lending protocols and user positions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Add no-flash script to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Add CSS loading check
                document.documentElement.classList.add('css-loading');
                
                // Remove class once CSS is loaded
                window.onload = function() {
                  document.documentElement.classList.remove('css-loading');
                  document.documentElement.classList.add('css-loaded');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-b from-background-start to-background-end`}>
        {/* CSS Loading indicator */}
        <div className="css-loading-indicator fixed top-0 left-0 w-full h-1 bg-blue-500 transition-transform duration-300 transform origin-left scale-x-0" />
        
        {/* Main content */}
        <div className="css-content opacity-0 transition-opacity duration-300">
          {children}
        </div>
        
        {/* Add CSS loaded script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (document.documentElement.classList.contains('css-loaded')) {
                  document.querySelector('.css-content').style.opacity = '1';
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
