// pages/_app.js
import Head from 'next/head';
import Script from 'next/script';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Pre-Revenue Startups: Forecast the success potential of pre-revenue startups for sale using AI.</title>
      </Head>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=AW-11236640053"
        strategy="afterInteractive" // Load script after the page becomes interactive
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ // Use dangerouslySetInnerHTML for inline script
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-11236640053');
          `
        }}
      />
      <Component {...pageProps} />
    </>
  );
};
