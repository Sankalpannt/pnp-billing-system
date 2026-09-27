const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  const secretPath = path.join(__dirname, 'token.secret');
  if (fs.existsSync(secretPath)) {
    token = fs.readFileSync(secretPath, 'utf8').trim();
  }
}
process.env.GH_TOKEN = token;
process.env.GITHUB_TOKEN = token;

const currentTag = `v${pkg.version}`;

console.log('🚀 Starting Packaging & Publishing to GitHub Releases...');
console.log(`Target Tag: ${currentTag} (Package Version: ${pkg.version})`);
console.log('Repository: Sankalpannt/pnp-billing-system');

async function publishAndUndraft() {
  try {
    execSync('npx electron-builder --win --publish always', {
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd()
    });

    console.log(`\n🔍 Checking GitHub releases for target tag ${currentTag}...`);
    const res = await fetch('https://api.github.com/repos/Sankalpannt/pnp-billing-system/releases', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'User-Agent': 'Node-Publish-Script'
      }
    });

    const releases = await res.json();
    if (!Array.isArray(releases)) {
      throw new Error('Could not fetch releases from GitHub: ' + JSON.stringify(releases));
    }

    // Filter releases belonging strictly to currentTag
    const matchingReleases = releases.filter(r => r.tag_name === currentTag);
    if (matchingReleases.length === 0) {
      console.warn(`No releases found matching ${currentTag}.`);
      return;
    }

    // Find primary release (either already public, or draft with the most assets)
    const primaryRelease = matchingReleases.sort((a, b) => (b.assets?.length || 0) - (a.assets?.length || 0))[0];
    const existingAssetNames = new Set((primaryRelease.assets || []).map(a => a.name));

    console.log(`Primary release for ${currentTag}: ID ${primaryRelease.id} (Draft: ${primaryRelease.draft}, Assets: ${existingAssetNames.size})`);

    // Ensure all required files from release/ directory are present in primary release
    const releaseDir = path.join(process.cwd(), 'release');
    const requiredFiles = [
      'latest.yml',
      `PNP-TECH-TRADERS-Billing-Software-Setup-${pkg.version}.exe`,
      `PNP-TECH-TRADERS-Billing-Software-Setup-${pkg.version}.exe.blockmap`,
      `PNP-TECH-TRADERS-Billing-Software-${pkg.version}.exe`
    ];

    for (const fileName of requiredFiles) {
      if (!existingAssetNames.has(fileName)) {
        // Look for file on disk (accounting for possible space or hyphen naming in local folder)
        const localCandidates = [
          path.join(releaseDir, fileName),
          path.join(releaseDir, fileName.replace(/-/g, ' ')),
          path.join(releaseDir, fileName.replace('PNP-TECH-TRADERS', 'PNP TECH TRADERS'))
        ];
        const localPath = localCandidates.find(p => fs.existsSync(p));
        if (localPath) {
          console.log(`Uploading missing asset: ${fileName} (${fs.statSync(localPath).size} bytes)...`);
          const fileContent = fs.readFileSync(localPath);
          const uploadUrl = `https://uploads.github.com/repos/Sankalpannt/pnp-billing-system/releases/${primaryRelease.id}/assets?name=${encodeURIComponent(fileName)}`;
          const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/octet-stream',
              'Content-Length': fileContent.length,
              'User-Agent': 'Node-Publish-Script'
            },
            body: fileContent
          });
          if (uploadRes.ok) {
            console.log(`✅ Uploaded ${fileName}`);
          } else {
            console.warn(`Failed to upload ${fileName}:`, await uploadRes.text());
          }
        }
      }
    }

    // Delete any duplicate/orphan drafts for this tag
    for (const r of matchingReleases) {
      if (r.id !== primaryRelease.id && r.draft) {
        console.log(`Cleaning up orphan draft ${r.id}...`);
        await fetch(`https://api.github.com/repos/Sankalpannt/pnp-billing-system/releases/${r.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Node-Publish-Script' }
        });
      }
    }

    // Publish primary release and guarantee it is set as latest
    console.log(`Publishing release ${currentTag} (ID: ${primaryRelease.id}) as latest...`);
    const patchRes = await fetch(`https://api.github.com/repos/Sankalpannt/pnp-billing-system/releases/${primaryRelease.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'User-Agent': 'Node-Publish-Script'
      },
      body: JSON.stringify({ draft: false, make_latest: 'true' })
    });

    if (patchRes.ok) {
      console.log(`✅ Release ${currentTag} is now PUBLIC and marked as LATEST!`);
    } else {
      console.warn(`Warning patching release ${primaryRelease.id}:`, await patchRes.text());
    }

    console.log(`\n🎉 Successfully published ${currentTag} to GitHub Releases: Sankalpannt/pnp-billing-system`);
  } catch (err) {
    console.error('\n❌ Packaging/Publishing failed:', err.message);
    process.exit(1);
  }
}

publishAndUndraft();
