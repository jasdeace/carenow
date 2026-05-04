const https = require('https');

https.get('https://frontend-sepia-nine-1sdiqgi5oz.vercel.app', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^\"]*\.js)"/);
    if (match) {
      const jsUrl = 'https://frontend-sepia-nine-1sdiqgi5oz.vercel.app' + match[1];
      console.log('Fetching JS:', jsUrl);
      https.get(jsUrl, (jsRes) => {
        let jsData = '';
        jsRes.on('data', (chunk) => jsData += chunk);
        jsRes.on('end', () => {
          console.log('Contains 10/60?', jsData.includes('10/60'));
          console.log('Contains Number(', jsData.includes('Number('));
        });
      });
    } else {
      console.log('JS bundle not found');
    }
  });
});
