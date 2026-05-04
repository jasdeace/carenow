const https = require('https');

https.get('https://frontend-sepia-nine-1sdiqgi5oz.vercel.app', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const match = data.match(/src="(\/assets\/index-[^\"]*\.js)"/);
    if (match) {
      const jsUrl = 'https://frontend-sepia-nine-1sdiqgi5oz.vercel.app' + match[1];
      https.get(jsUrl, (jsRes) => {
        let jsData = '';
        jsRes.on('data', (chunk) => jsData += chunk);
        jsRes.on('end', () => {
          // Check if addMedication is sending Number()
          const addMedMatch = jsData.match(/addMedication\([^)]+\)/g);
          console.log("addMedication calls found:", addMedMatch);
        });
      });
    }
  });
});
