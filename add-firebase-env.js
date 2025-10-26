// Script to properly format and add Firebase credentials to Vercel
const fs = require('fs');

// Read the service account file
const serviceAccount = fs.readFileSync('./firebase-service-account.json', 'utf8');

// Minify JSON (remove whitespace)
const minified = JSON.stringify(JSON.parse(serviceAccount));

console.log('===================================');
console.log('COPY THIS ENTIRE LINE (including quotes):');
console.log('===================================');
console.log(minified);
console.log('===================================');
console.log('\nNow run:');
console.log('vercel env add FIREBASE_SERVICE_ACCOUNT_KEY');
console.log('\nWhen prompted, paste the line above');
console.log('Select: Production, Preview, Development (all)');
