import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
      <Head>
        <title>Pre-Revenue | Free Startup Evaluation Tool</title>
        <link rel='icon' href='/Little Exits Icon Dark.png' />
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
