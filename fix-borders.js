const fs = require('fs');
const path = require('path');

// Function to recursively find all .tsx and .ts files
function findFiles(dir, extensions = ['.tsx', '.ts']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      results = results.concat(findFiles(filePath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

// Function to replace border colors in a file
function replaceBorderColors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace border-gray-300 with border-gray-200
    if (content.includes('border-gray-300')) {
      content = content.replace(/border-gray-300/g, 'border-gray-200');
      modified = true;
      console.log(`Replaced border-gray-300 in: ${filePath}`);
    }
    
    // Replace other common inconsistent border colors
    // border-gray-400 -> border-gray-200 (for default borders)
    const grayBorderPattern = /border-gray-400(?!\w)/g;
    if (grayBorderPattern.test(content)) {
      content = content.replace(grayBorderPattern, 'border-gray-200');
      modified = true;
      console.log(`Replaced border-gray-400 in: ${filePath}`);
    }
    
    // border-slate-200 -> border-gray-200 for consistency
    if (content.includes('border-slate-200')) {
      content = content.replace(/border-slate-200/g, 'border-gray-200');
      modified = true;
      console.log(`Replaced border-slate-200 in: ${filePath}`);
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    
    return modified;
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Main execution
const projectDir = __dirname;
const files = findFiles(projectDir);
let totalModified = 0;

console.log(`Found ${files.length} TypeScript/TSX files to process...`);

files.forEach(file => {
  if (replaceBorderColors(file)) {
    totalModified++;
  }
});

console.log(`\nCompleted! Modified ${totalModified} files to use border-gray-200 as default.`);
