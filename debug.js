import Database from 'better-sqlite3';

const db = new Database('./history.tmp/globalStorage/state.vscdb', { readonly: true });

// Look for write operations with diff data
console.log('=== Looking for write/edit operations with diffs ===\n');
const writeBubbles = db.prepare("SELECT key, value FROM cursorDiskKV WHERE value LIKE '%\"name\":\"write\"%' OR value LIKE '%edit_file%' OR value LIKE '%search_replace%' OR value LIKE '%diffString%' LIMIT 10").all();

for (const bubble of writeBubbles) {
  console.log('\n=== Key:', bubble.key, '===');
  try {
    const data = JSON.parse(bubble.value);
    if (data.toolFormerData) {
      console.log('Tool:', data.toolFormerData.name);
      if (data.toolFormerData.params) {
        const params = JSON.parse(data.toolFormerData.params);
        console.log('Params keys:', Object.keys(params));
        if (params.targetFile) console.log('  targetFile:', params.targetFile);
        if (params.relativeWorkspacePath) console.log('  relativeWorkspacePath:', params.relativeWorkspacePath);
        if (params.filePath) console.log('  filePath:', params.filePath);
      }
      if (data.toolFormerData.result) {
        try {
          const result = JSON.parse(data.toolFormerData.result);
          console.log('Result keys:', Object.keys(result));
          if (result.diff) {
            console.log('  Has diff:', !!result.diff);
            if (result.diff.editor) console.log('  diff.editor:', result.diff.editor);
          }
        } catch {}
      }
    }
    // Check for codeBlocks with file references
    if (data.codeBlocks) {
      for (const cb of data.codeBlocks) {
        if (cb.uri) console.log('  codeBlock.uri:', cb.uri);
      }
    }
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

// Now look at workspace storage to see file references there
console.log('\n\n=== Checking workspace storage ===');
const fs = await import('node:fs');
const workspaces = fs.readdirSync('./history.tmp/workspaceStorage');
for (const wsId of workspaces.slice(0, 2)) {
  const dbPath = `./history.tmp/workspaceStorage/${wsId}/state.vscdb`;
  if (!fs.existsSync(dbPath)) continue;

  console.log('\n--- Workspace:', wsId, '---');
  const wsDb = new Database(dbPath, { readonly: true });

  // Check for file-related entries
  const fileItems = wsDb.prepare("SELECT key FROM ItemTable WHERE value LIKE '%/Users/%' LIMIT 5").all();
  console.log('Keys with file paths:', fileItems.map(i => i.key));

  // Check composerData for file references
  const composerRow = wsDb.prepare("SELECT value FROM ItemTable WHERE key = 'composer.composerData'").get();
  if (composerRow) {
    const data = JSON.parse(composerRow.value);
    if (data.allComposers) {
      for (const composer of data.allComposers.slice(0, 1)) {
        console.log('Composer keys:', Object.keys(composer));
        if (composer.context) console.log('  context:', JSON.stringify(composer.context).slice(0, 200));
        if (composer.files) console.log('  files:', composer.files);
        if (composer.fileUris) console.log('  fileUris:', composer.fileUris);
      }
    }
  }

  wsDb.close();
}

db.close();