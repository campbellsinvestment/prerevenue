import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
      <Head>
        <title>Pre-Revenue | Free Startup Evaluation Tool - Powered by Little Exits</title>
        <link rel='icon' href='/Little Exits Icon Dark.png' />
        <meta
          name="description"
          content="Free pre-revenue startup evaluation tool. Get instant AI-powered analysis and valuation based on real marketplace data from 200+ successful exits. Analyze your startup with just a tagline and basic metrics."
        />
        <meta name="keywords" content="startup evaluation, pre-revenue valuation, startup analysis, Little Exits, startup scoring, business valuation, startup assessment, AI startup analysis, startup metrics, startup success score" />
        <meta name="author" content="Little Exits" />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://prerevenue.io/" />
        <meta property="og:site_name" content="Pre-Revenue" />
        <meta property="og:title" content="Pre-Revenue | Free Startup Evaluation Tool" />
        <meta
          property="og:description"
          content="Free pre-revenue startup evaluation tool. Get instant AI-powered analysis and valuation based on real marketplace data from 200+ successful exits."
        />
        <meta property="og:image" content="https://prerevenue.io/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://prerevenue.io/" />
        <meta name="twitter:title" content="Pre-Revenue | Free Startup Evaluation Tool" />
        <meta
          name="twitter:description"
          content="Free pre-revenue startup evaluation tool. Get instant AI-powered analysis and valuation based on real marketplace data from 200+ successful exits."
        />
        <meta name="twitter:image" content="https://prerevenue.io/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="theme-color" content="#3B82F6" />
        <meta name="application-name" content="Pre-Revenue" />
        <meta name="apple-mobile-web-app-title" content="Pre-Revenue" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Pre-Revenue",
              "description": "Free pre-revenue startup evaluation tool powered by Little Exits marketplace data",
              "url": "https://prerevenue.io",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "Little Exits",
                "url": "https://littleexits.com"
              },
              "featureList": [
                "AI-powered startup analysis",
                "Pre-revenue valuation estimation",
                "Market data insights",
                "Success score calculation",
                "Category performance analysis"
              ]
            })
          }}
        />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://prerevenue.io/" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://api.openai.com" />
        <link rel="preconnect" href="https://littleexits.com" />
        <link rel="preconnect" href="https://plausible.io" />
        
        {/* Analytics */}
        <script defer data-domain="prerevenue.io" src="https://plausible.io/js/script.js"></script>
        
        <meta
          name="description"
          content="Evaluate your pre-revenue startup with AI analysis based on Little Exits marketplace data from 200+ successful exits."
        />
        <meta property="og:site_name" content="prerevenue.io" />
        <meta
          property="og:description"
          content="Evaluate your pre-revenue startup with AI analysis based on Little Exits marketplace data from 200+ successful exits."
        />
        <meta property="og:title" content="Pre-Revenue Startup Evaluation Tool" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pre-Revenue Startup Evaluation Tool" />
        <meta
          name="twitter:description"
          content="Evaluate your pre-revenue startup with AI analysis based on Little Exits marketplace data from 200+ successful exits."
        />
        <meta
          property="og:image"
          content="https://prerevenue.io/prerevenue-tile.png"
        />
        <meta
          name="twitter:image"
          content="https://prerevenue.io/prerevenue-tile.png"
        />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
