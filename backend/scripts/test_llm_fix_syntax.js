const fs = require('fs');
const path = require('path');

const filePath = path.join('/Users/cipher/prism/backend/src/routes/integrations.js');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Simple check for the changes
    if (!content.includes("model: 'gemini-1.5-flash'")) {
        console.error('FAIL: gemini-1.5-flash not found');
        process.exit(1);
    }
    if (!content.includes("gemini_error: geminiErrorMsg")) {
        console.error('FAIL: gemini_error field not found');
        process.exit(1);
    }

    // Syntax check by requiring it (will fail if syntax is bad, though it might fail due to missing env vars/dependencies too)
    try {
        require(filePath);
        console.log('SUCCESS: File required successfully (syntax is valid)');
    } catch (e) {
        // Expected to fail on missing dependencies or router setup, but let's check if it's a syntax error
        if (e instanceof SyntaxError) {
            console.error('FAIL: Syntax Error:', e.message);
            process.exit(1);
        }
        console.log('NOTE: Require failed as expected (runtime deps), but likely not a syntax error: ' + e.message);
        console.log('SUCCESS: Static checks passed');
    }

} catch (err) {
    console.error('FAIL: ' + err.message);
    process.exit(1);
}
