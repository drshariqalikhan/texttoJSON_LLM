// extract.js
// No npm installations required! This uses standard Node.js built-in modules.
const https = require('https');

// 1. Define the input text you want to parse
const naturalLanguageInput = "Alex is a 28-year-old software engineer skilled in Python, JavaScript, and Docker.";

// 2. Define your strict target output layout
const targetSchema = {
    name: "string",
    age: "integer",
    skills: ["string"]
};

console.log(" Sending extraction request to keyless engine...");

// Prepare the Jina Reader JSON configuration layers
const options = {
    hostname: 'r.jina.ai',
    path: '/' + encodeURIComponent(naturalLanguageInput),
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'X-Respond-With': 'json',
        'X-Json-Schema': JSON.stringify(targetSchema)
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                // The response is already structural valid JSON matching your schema shell
                const parsedResult = JSON.parse(data);
                
                console.log("\n\x1b[32m✓ Successfully Extracted JSON Object:\x1b[0m");
                console.dir(parsedResult, { depth: null, colors: true });
            } catch (parseError) {
                console.error("\x1b[31mFailed to parse response data as JSON:\x1b[0m", parseError.message);
                console.log("Raw output was:", data);
            }
        } else {
            console.error(`\x1b[31mServer error status code:\x1b[0m ${res.statusCode}`);
            console.log("Response:", data);
        }
    });
});

req.on('error', (error) => {
    console.error('\x1b[31mNetwork Request Error:\x1b[0m', error.message);
});

req.end();
