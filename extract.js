// extract.js
const https = require('https');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// 1. Path setup to decouple the schema definition cleanly
const SCHEMA_FILE_PATH = path.join(__dirname, 'schema.json');
let targetSchema = null;

try {
    // Read and parse the external schema profile file synchronously on startup
    const schemaRawData = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
    targetSchema = JSON.parse(schemaRawData);
    console.log("\x1b[32m✓ Successfully loaded target template definition configuration from schema.json\x1b[0m");
} catch (err) {
    console.error("\x1b[31m❌ Initialization Failure: Unable to parse schema.json profile file.\x1b[0m");
    console.error(err.message);
    process.exit(1);
}

// Setup the terminal interactive reading interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Configure the clean, resilient regex cleansing parsing routine
function cleanAndParseJSON(rawString) {
    let sanitized = rawString.trim();
    if (sanitized.startsWith('```')) {
        sanitized = sanitized.replace(/```(?:json)?\s*([\s\(\S\)]*?)\s*```/gi, '$1');
    }
    const startIdx = sanitized.indexOf('{');
    const endIdx = sanitized.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
        throw new Error("Could not find valid JSON structural brackets inside response.");
    }
    return JSON.parse(sanitized.substring(startIdx, endIdx + 1));
}

// Function to handle the keyless network call out to the LLM engine
function parseTextRequest(userInput, callback) {
    const systemPrompt = `You are a strict data extraction engine.
Analyze the user's input text and extract data into a valid JSON object matching this schema blueprint layout layout exactly:
${JSON.stringify(targetSchema)}

CRITICAL: Return ONLY the raw valid JSON object. Do not wrap it in markdown code fences (\`\`\`json) and do not provide conversational text.`;

    const postData = JSON.stringify({
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
        ],
        model: "openai",
        temperature: 0.0,
        jsonMode: true
    });

    const options = {
        hostname: 'text.pollinations.ai',
        path: '/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let rawText = '';
        res.on('data', (chunk) => { rawText += chunk; });
        res.on('end', () => {
            if (res.statusCode === 429) {
                callback("Rate limit triggered (429: Too Many Requests). Please pause for 6 seconds and try again.");
            } else if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const parsedJson = cleanAndParseJSON(rawText);
                    callback(null, parsedJson);
                } catch (err) {
                    callback(`Parsing Error: ${err.message}. Raw Output: ${rawText}`);
                }
            } else {
                callback(`Server Error Status ${res.statusCode}`);
            }
        });
    });

    req.on('error', (e) => { callback(`Network Error: ${e.message}`); });
    req.write(postData);
    req.end();
}

// Main interactive CLI application recursive loop
function promptUser() {
    console.log("\n-------------------------------------------------------------");
    rl.question('\x1b[36m📝 Enter unstructured text (or type "exit" to quit):\x1b[0m\n> ', (input) => {
        const cleanedInput = input.trim();
        
        if (cleanedInput.toLowerCase() === 'exit') {
            console.log('\n👋 Exiting parser application. Goodbye!');
            rl.close();
            process.exit(0);
        }

        if (!cleanedInput) {
            console.log('\x1b[33m⚠️ Please enter some text data to process.\x1b[0m');
            promptUser();
            return;
        }

        console.log('\n⏳ Processing your input text via keyless LLM engine...');
        
        parseTextRequest(cleanedInput, (error, result) => {
            if (error) {
                console.error(`\x1b[31m❌ Extraction Failed: ${error}\x1b[0m`);
            } else {
                console.log("\n\x1b[32m✓ Successfully Extracted JSON Object:\x1b[0m");
                console.dir(result, { depth: null, colors: true });
            }
            // Loop back cleanly to ask for next input
            promptUser();
        });
    });
}

// Clear screen and fire up the console interface loop
console.clear();
console.log("\x1b[1m🚀 Interactive Text-to-JSON CLI Engine Initiated\x1b[0m");
promptUser();
