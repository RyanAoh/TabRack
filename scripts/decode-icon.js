// Automatically decodes a Base64 text file into a binary PNG
// This prevents AI Studio's git text-sync from corrupting binary image files

import fs from 'fs';
import path from 'path';

const base64FilePath = path.join(process.cwd(), 'public', 'icons', 'icon.base64.txt');
const outputPngPath = path.join(process.cwd(), 'public', 'icons', 'icon-small.png');

try {
  if (fs.existsSync(base64FilePath)) {
    const base64Data = fs.readFileSync(base64FilePath, 'utf8').trim();
    // Strip off the data URL prefix if it exists (e.g., "data:image/png;base64,")
    const cleanBase64 = base64Data.replace(/^data:image\/png;base64,/, '');
    
    // Convert text back to binary and write to file
    fs.writeFileSync(outputPngPath, Buffer.from(cleanBase64, 'base64'));
    console.log('[TabRack] Successfully decoded png icon from base64 text.');
  }
} catch (error) {
  console.error('[TabRack] Failed to decode icon:', error);
}
