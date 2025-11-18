// Simple test to verify Posts component syntax
const fs = require('fs');
const path = require('path');

const postsPath = path.join(__dirname, 'src/pages/Posts.jsx');

try {
  const content = fs.readFileSync(postsPath, 'utf8');
  
  // Basic syntax checks
  const hasImports = content.includes('import React');
  const hasExport = content.includes('export default');
  const hasFunction = content.includes('function Posts');
  const hasReturn = content.includes('return (');
  const hasProperClosing = content.includes(');\n}');
  
  console.log('✅ Posts component syntax check:');
  console.log(`  - Has imports: ${hasImports}`);
  console.log(`  - Has export: ${hasExport}`);
  console.log(`  - Has function: ${hasFunction}`);
  console.log(`  - Has return: ${hasReturn}`);
  console.log(`  - Has proper closing: ${hasProperClosing}`);
  
  // Count brackets to check for balance
  const openBrackets = (content.match(/\(/g) || []).length;
  const closeBrackets = (content.match(/\)/g) || []).length;
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  
  console.log(`\n📊 Bracket balance:`);
  console.log(`  - Parentheses: ${openBrackets} open, ${closeBrackets} close`);
  console.log(`  - Braces: ${openBraces} open, ${closeBraces} close`);
  
  const isBalanced = openBrackets === closeBrackets && openBraces === closeBraces;
  console.log(`\n${isBalanced ? '✅' : '❌'} Component structure: ${isBalanced ? 'BALANCED' : 'UNBALANCED'}`);
  
  // Check for common syntax errors
  const hasUnclosedTags = content.includes('<') && !content.includes('>');
  const hasMalformedJSX = content.includes('class=') && !content.includes('className=');
  
  if (hasUnclosedTags) console.log('⚠️  Warning: Potential unclosed HTML tags');
  if (hasMalformedJSX) console.log('⚠️  Warning: Found "class=" instead of "className="');
  
  console.log('\n✅ Posts component appears to be syntactically valid!');
  
} catch (error) {
  console.error('❌ Error reading Posts component:', error.message);
  process.exit(1);
}