const fs = require('node:fs');

function replaceOrFail(path, before, after){
  const source = fs.readFileSync(path, 'utf8');
  if(!source.includes(before)) throw new Error(`${path}: expected block was not found`);
  fs.writeFileSync(path, source.replace(before, after));
}

replaceOrFail(
  'index.html',
  '<script src="js/i18n.js"></script><script src="js/landing-i18n.js"></script><script src="js/data.js"></script><script src="js/platform-core.js"></script><script src="js/supabase-config.js"></script><script src="js/platform-data.js"></script><script src="js/platform-directory.js"></script><script src="js/landing.js"></script>',
  '<script src="js/i18n.js"></script><script src="js/platform-core.js"></script><script src="js/data-loader.js"></script><script src="js/platform-directory.js"></script><script src="js/landing.js"></script>'
);

replaceOrFail(
  'explore.html',
  '<script src="js/i18n.js"></script><script src="js/data.js"></script><script src="js/platform-core.js"></script><script src="js/supabase-config.js"></script><script src="js/platform-data.js"></script><script src="js/platform-directory.js"></script><script src="js/app.js"></script><script src="js/accessibility.js"></script><script src="js/explore-nav.js"></script>',
  '<script src="js/i18n.js"></script><script src="js/platform-core.js"></script><script src="js/data-loader.js"></script><script src="js/platform-directory.js"></script><script src="js/app.js"></script><script src="js/accessibility.js"></script><script src="js/explore-nav.js"></script>'
);

replaceOrFail(
  'platform.html',
  '<script src="js/i18n.js"></script><script src="js/data.js"></script><script src="js/platform-core.js"></script><script src="js/supabase-config.js"></script><script src="js/platform-data.js"></script><script src="js/platform-detail.js"></script><script src="js/platform-back-nav.js"></script>',
  '<script src="js/i18n.js"></script><script src="js/platform-core.js"></script><script src="js/data-loader.js"></script><script src="js/platform-detail.js"></script><script src="js/platform-back-nav.js"></script>'
);

for(const path of ['explore.html']){
  const source=fs.readFileSync(path,'utf8');
  fs.writeFileSync(path, source.replace(/\s*<div id="platformDataStatus" class="data-status" role="status"><\/div>/, ''));
}

for(const path of ['js/data.js','js/platform-data.js','js/supabase-config.js','js/landing-i18n.js']){
  if(fs.existsSync(path)) fs.unlinkSync(path);
}

console.log('Switched HTML runtime to data.json and removed obsolete browser data files');
