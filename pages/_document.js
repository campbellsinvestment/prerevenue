import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
      <Head>
        <link rel='icon' href='/favicon.png' />
        <meta
          name="description"
          content="Forecast the success potential of pre-revenue startups for sale using AI."
        />
        <meta property="og:site_name" content="prerevenue.io" />
        <meta
          property="og:description"
          content="Forecast the success potential of pre-revenue startups for sale using AI."
        />
        <meta property="og:title" content="Pre-Revenue Startups" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pre-revenue Startups" />
        <meta
          name="twitter:description"
          content="Forecast the success potential of pre-revenue startups for sale using AI."
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
