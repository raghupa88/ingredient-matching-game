#!/usr/bin/env node
'use strict';

/**
 * apm — Agent Package Manager CLI
 *
 * Manages skills, prompts, agents, and hooks for this project.
 * Backed by npm for install/publish; apm.yml as the manifest.
 *
 * Usage:
 *   apm list                     list all skills, agents, and prompts
 *   apm info <name>              show details for a skill, agent, or prompt
 *   apm install <pkg>            install from npm (@apm-skills/<pkg>) and register in apm.yml
 *   apm uninstall <name>         remove from npm and deregister from apm.yml
 *   apm publish <name>           package a local skill and publish to npm
 *   apm search <query>           search npm for @apm-skills/* packages
 *   apm init skill <name>        scaffold a new skill file + apm.yml entry
 *   apm init prompt <name>       scaffold a new prompt file + apm.yml entry
 *   apm init agent <name>        add a new agent entry to apm.yml
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const APM_YML = path.join(ROOT, 'apm.yml');
const APM_LOCK = path.join(ROOT, 'apm-lock.yml');
const SKILLS_DIR = path.join(ROOT, 'skills');
const PROMPTS_DIR = path.join(ROOT, 'prompts');
const DEFAULT_SCOPE = '@apm-skills';
const SCOPES = { skill: '@apm-skills', prompt: '@apm-prompts', agent: '@apm-agents', hook: '@apm-hooks' };

// ── ANSI colours ──────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m',
};
const bold = s => `${C.bold}${s}${C.reset}`;
const dim = s => `${C.dim}${s}${C.reset}`;
const green = s => `${C.green}${s}${C.reset}`;
const yellow = s => `${C.yellow}${s}${C.reset}`;
const cyan = s => `${C.cyan}${s}${C.reset}`;
const red = s => `${C.red}${s}${C.reset}`;

// ── Config helpers ─────────────────────────────────────────────────────────────
function loadConfig() {
  if (!fs.existsSync(APM_YML)) throw new Error('apm.yml not found. Run from the project root.');
  return yaml.load(fs.readFileSync(APM_YML, 'utf8'));
}

function saveConfig(config) {
  const existing = fs.readFileSync(APM_YML, 'utf8');
  const header = existing.split('\n').filter(l => l.startsWith('#')).slice(0, 5).join('\n');
  fs.writeFileSync(APM_YML, (header ? header + '\n' : '') + yaml.dump(config, { lineWidth: 120, quotingType: '"' }));
}

// ── Commands ───────────────────────────────────────────────────────────────────

function cmdList() {
  const cfg = loadConfig();
  console.log(bold(`\n${cfg.name}@${cfg.version} — Agent Package Manager\n`));

  const sections = [
    { key: 'agents',  label: 'Agents',  color: cyan },
    { key: 'skills',  label: 'Skills',  color: green },
    { key: 'prompts', label: 'Prompts', color: yellow },
  ];

  for (const { key, label, color } of sections) {
    const items = cfg[key] ?? [];
    console.log(bold(`${label} (${items.length})`));
    if (!items.length) { console.log(dim('  (none)')); continue; }
    for (const item of items) {
      const deps = item.depends_on?.length ? dim(` → ${item.depends_on.join(', ')}`) : '';
      const extra = item.mcp_tools ? dim(` [${item.mcp_tools.join(', ')}]`) : '';
      console.log(`  ${color(item.name)}@${item.version ?? 'local'}${deps}${extra}`);
      if (item.description) console.log(dim(`    ${item.description}`));
    }
    console.log();
  }
}

function cmdInfo(name) {
  if (!name) { console.error(red('Usage: apm info <name>')); process.exit(1); }
  const cfg = loadConfig();
  const all = [...(cfg.agents ?? []), ...(cfg.skills ?? []), ...(cfg.prompts ?? [])];
  const item = all.find(i => i.name === name);
  if (!item) { console.error(red(`Not found: ${name}`)); process.exit(1); }

  console.log(bold(`\n${item.name}`));
  for (const [k, v] of Object.entries(item)) {
    const display = Array.isArray(v) ? v.join(', ') : v;
    console.log(`  ${cyan(k.padEnd(16))} ${display}`);
  }
  console.log();
}

function cmdInstall(pkg) {
  if (!pkg) { console.error(red('Usage: apm install <package|@scope/package>')); process.exit(1); }

  // Resolve full npm package name
  let npmPkg = pkg;
  if (!pkg.startsWith('@') && !pkg.startsWith('./') && !pkg.startsWith('/')) {
    npmPkg = `${DEFAULT_SCOPE}/${pkg}`;
  }

  if (npmPkg.startsWith('.') || path.isAbsolute(npmPkg)) {
    return installLocal(npmPkg);
  }

  console.log(`\nInstalling ${cyan(npmPkg)} from npm…`);
  const result = spawnSync('npm', ['install', npmPkg, '--save'], { cwd: ROOT, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(red(`\nnpm install failed. Is "${npmPkg}" published to npm?`));
    console.error(dim(`Tip: apm search ${pkg}  — to find available packages`));
    console.error(dim(`Tip: apm init skill ${pkg}  — to scaffold a local skill instead`));
    process.exit(1);
  }

  // Read apm metadata from the installed package
  const pkgJsonPath = path.join(ROOT, 'node_modules', ...npmPkg.split('/'), 'package.json');
  let meta = { type: 'skill', exports: [], description: '', depends_on: [] };
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (pkgJson.apm) Object.assign(meta, pkgJson.apm);
    if (!meta.description && pkgJson.description) meta.description = pkgJson.description;
  }

  const entry = {
    name: npmPkg.split('/').pop(),
    version: JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).version ?? 'latest',
    path: `./node_modules/${npmPkg}/index.js`,
    description: meta.description,
    exports: meta.exports,
    depends_on: meta.depends_on ?? [],
    source: npmPkg,
  };

  const cfg = loadConfig();
  cfg.skills = cfg.skills ?? [];
  const existing = cfg.skills.findIndex(s => s.name === entry.name);
  if (existing >= 0) {
    cfg.skills[existing] = entry;
    console.log(yellow(`Updated ${entry.name} in apm.yml`));
  } else {
    cfg.skills.push(entry);
    console.log(green(`Added ${entry.name} to apm.yml`));
  }
  saveConfig(cfg);
  regenerateLock(cfg);
  console.log(green(`\n✓ ${npmPkg} installed and registered in apm.yml\n`));
}

function installLocal(localPath) {
  const abs = path.resolve(process.cwd(), localPath);
  if (!fs.existsSync(abs)) { console.error(red(`File not found: ${abs}`)); process.exit(1); }

  const name = path.basename(abs, path.extname(abs));
  const dest = path.join(SKILLS_DIR, path.basename(abs));
  if (abs !== dest) {
    fs.copyFileSync(abs, dest);
    console.log(green(`Copied ${path.basename(abs)} → skills/`));
  }

  const cfg = loadConfig();
  cfg.skills = cfg.skills ?? [];
  if (!cfg.skills.find(s => s.name === name)) {
    cfg.skills.push({ name, version: '1.0.0', path: `./skills/${path.basename(abs)}`, description: '', exports: [], depends_on: [] });
    saveConfig(cfg);
    console.log(green(`Added ${name} to apm.yml`));
  }
  regenerateLock(cfg);
}

function cmdUninstall(name) {
  if (!name) { console.error(red('Usage: apm uninstall <name>')); process.exit(1); }
  const cfg = loadConfig();
  const skill = (cfg.skills ?? []).find(s => s.name === name);

  if (skill?.source) {
    console.log(`Removing ${cyan(skill.source)} from npm…`);
    spawnSync('npm', ['uninstall', skill.source], { cwd: ROOT, stdio: 'inherit' });
  }

  cfg.skills = (cfg.skills ?? []).filter(s => s.name !== name);
  saveConfig(cfg);
  regenerateLock(cfg);
  console.log(green(`✓ ${name} removed from apm.yml\n`));
}

function cmdPublish(name) {
  if (!name) { console.error(red('Usage: apm publish <skill-name>')); process.exit(1); }
  const cfg = loadConfig();
  const skill = (cfg.skills ?? []).find(s => s.name === name);
  if (!skill) { console.error(red(`Skill "${name}" not found in apm.yml`)); process.exit(1); }

  const absPath = path.resolve(ROOT, skill.path);
  if (!fs.existsSync(absPath)) { console.error(red(`Skill file not found: ${skill.path}`)); process.exit(1); }

  const scope = cfg.registry?.scope ?? DEFAULT_SCOPE;
  const publishName = `${scope}/${name}`;
  const tmpDir = path.join(ROOT, '.apm-publish', name);
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.copyFileSync(absPath, path.join(tmpDir, 'index.js'));

  const pkgJson = {
    name: publishName,
    version: skill.version ?? '1.0.0',
    description: skill.description ?? '',
    main: 'index.js',
    license: cfg.license ?? 'MIT',
    apm: {
      type: 'skill',
      exports: skill.exports ?? [],
      depends_on: skill.depends_on ?? [],
    },
    keywords: ['apm-skill', 'agent-package-manager', name],
  };
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

  console.log(bold(`\nPublishing ${publishName}@${skill.version}…`));
  console.log(dim(`  Package dir: ${tmpDir}`));
  console.log(dim(`  Run: npm publish --access public\n`));

  const result = spawnSync('npm', ['publish', '--access', 'public'], { cwd: tmpDir, stdio: 'inherit' });
  if (result.status === 0) {
    console.log(green(`\n✓ Published ${publishName} to npm`));
    console.log(dim(`  Others can now: apm install ${name}\n`));
  } else {
    console.log(yellow(`\nPublish failed or skipped (are you logged in to npm?)`));
    console.log(dim(`  npm login  — to authenticate`));
    console.log(dim(`  Package is ready in: ${tmpDir}\n`));
  }
}

function cmdSearch(query) {
  if (!query) { console.error(red('Usage: apm search <query>')); process.exit(1); }
  console.log(`\nSearching npm for ${cyan(`@apm-skills/*${query}*`)}…\n`);
  const scopes = Object.values(SCOPES).join(' ');
  try {
    const out = execSync(`npm search ${DEFAULT_SCOPE} ${query} --json 2>/dev/null`, { cwd: ROOT }).toString();
    const results = JSON.parse(out);
    if (!results.length) {
      console.log(yellow(`No packages found for "${query}"`));
      console.log(dim(`  Be the first to publish: apm publish <your-skill>\n`));
      return;
    }
    for (const r of results) {
      console.log(`  ${green(r.name)}@${r.version}`);
      if (r.description) console.log(dim(`    ${r.description}`));
    }
    console.log(dim(`\n  Install: apm install <name>\n`));
  } catch {
    // npm search may not return valid JSON for empty results
    console.log(yellow(`No packages found yet in the @apm-skills registry.`));
    console.log(dim(`  Publish your first skill: apm publish <name>\n`));
  }
}

function cmdInit(type, name) {
  if (!type || !name) { console.error(red('Usage: apm init <skill|prompt|agent> <name>')); process.exit(1); }

  switch (type) {
    case 'skill': initSkill(name); break;
    case 'prompt': initPrompt(name); break;
    case 'agent': initAgent(name); break;
    default: console.error(red(`Unknown type "${type}". Use: skill, prompt, agent`)); process.exit(1);
  }
}

function initSkill(name) {
  const file = path.join(SKILLS_DIR, `${name}.js`);
  if (fs.existsSync(file)) { console.error(red(`${file} already exists`)); process.exit(1); }

  fs.writeFileSync(file, `'use strict';

/**
 * ${name} skill
 * Add this skill's logic below and export functions as named exports.
 */

function run(input) {
  // TODO: implement ${name}
  return { result: null, input };
}

module.exports = { run };
`);

  const cfg = loadConfig();
  cfg.skills = cfg.skills ?? [];
  cfg.skills.push({ name, version: '1.0.0', path: `./skills/${name}.js`, description: '', exports: ['run'], depends_on: [] });
  saveConfig(cfg);
  regenerateLock(cfg);
  console.log(green(`✓ Created skills/${name}.js and registered in apm.yml`));
  console.log(dim(`  Edit skills/${name}.js to implement your skill\n`));
}

function initPrompt(name) {
  const file = path.join(PROMPTS_DIR, `${name}.md`);
  if (fs.existsSync(file)) { console.error(red(`${file} already exists`)); process.exit(1); }

  fs.writeFileSync(file, `# ${name}\n\nYou are a helpful assistant for the Ingredient Matching Game.\n\n{{context}}\n\nRespond concisely and in a warm, friendly tone.\n`);

  const cfg = loadConfig();
  cfg.prompts = cfg.prompts ?? [];
  cfg.prompts.push({ name, version: '1.0.0', path: `./prompts/${name}.md`, description: '', variables: ['context'] });
  saveConfig(cfg);
  console.log(green(`✓ Created prompts/${name}.md and registered in apm.yml`));
  console.log(dim(`  Edit prompts/${name}.md to write your prompt template\n`));
}

function initAgent(name) {
  const cfg = loadConfig();
  cfg.agents = cfg.agents ?? [];
  if (cfg.agents.find(a => a.name === name)) {
    console.error(red(`Agent "${name}" already exists in apm.yml`)); process.exit(1);
  }
  cfg.agents.push({
    name,
    type: 'claude',
    model: 'claude-sonnet-4-6',
    description: '',
    mcp_tools: [],
    instructions: `You are the ${name} for the Ingredient Matching Game.`,
    depends_on: [],
  });
  saveConfig(cfg);
  regenerateLock(cfg);
  console.log(green(`✓ Added agent "${name}" to apm.yml`));
  console.log(dim(`  Set mcp_tools and instructions in apm.yml\n`));
}

function cmdHelp() {
  console.log(`
${bold('apm')} — Agent Package Manager

${bold('USAGE')}
  apm <command> [args]

${bold('COMMANDS')}
  ${cyan('list')}                     List all skills, agents, and prompts
  ${cyan('info')} <name>              Show details for a skill, agent, or prompt
  ${cyan('install')} <pkg>            Install from npm (@apm-skills/<pkg>) and register in apm.yml
  ${cyan('uninstall')} <name>         Remove from npm and deregister from apm.yml
  ${cyan('publish')} <name>           Package a local skill and publish to npm
  ${cyan('search')} <query>           Search npm for @apm-skills/* packages
  ${cyan('init skill')} <name>        Scaffold a new skill file + apm.yml entry
  ${cyan('init prompt')} <name>       Scaffold a new prompt file + apm.yml entry
  ${cyan('init agent')} <name>        Add a new agent entry to apm.yml

${bold('EXAMPLES')}
  apm list
  apm install fuzzy-matcher              # installs @apm-skills/fuzzy-matcher
  apm install @apm-prompts/hint          # install from a specific scope
  apm install ./my-custom-skill.js       # install from local file
  apm publish ingredient-matcher         # publish to npm as @apm-skills/ingredient-matcher
  apm search tamil                       # search for Tamil-related APM packages
  apm init skill levenshtein-pro
  apm init agent recipe-agent

${bold('REGISTRY SCOPES')}
  ${cyan('@apm-skills')}   reusable skill modules (fuzzy matchers, scorers, validators)
  ${cyan('@apm-prompts')}  prompt templates for AI agents
  ${cyan('@apm-agents')}   pre-configured agent definitions
  ${cyan('@apm-hooks')}    pre/post skill and prompt hooks
`);
}

// ── Lock file regeneration ─────────────────────────────────────────────────────
function regenerateLock(cfg) {
  const existing = fs.existsSync(APM_LOCK) ? yaml.load(fs.readFileSync(APM_LOCK, 'utf8')) : {};
  const sorted = topoSort(cfg.skills ?? []);
  existing.resolvedSkills = sorted.map((s, i) => ({
    name: s.name,
    version: s.version ?? '1.0.0',
    path: s.path,
    source: s.source ?? 'local',
    resolvedOrder: i + 1,
    dependsOn: s.depends_on ?? [],
  }));
  fs.writeFileSync(APM_LOCK, `# apm-lock.yml — auto-generated by apm CLI, do not edit manually\n` + yaml.dump(existing, { lineWidth: 120 }));
}

function topoSort(skills) {
  const map = new Map(skills.map(s => [s.name, s]));
  const visited = new Set();
  const result = [];
  const visit = name => {
    if (visited.has(name)) return;
    visited.add(name);
    const s = map.get(name);
    if (!s) return;
    for (const dep of s.depends_on ?? []) visit(dep);
    result.push(s);
  };
  skills.forEach(s => visit(s.name));
  return result;
}

// ── Entry point ────────────────────────────────────────────────────────────────
const [,, command, ...args] = process.argv;
switch (command) {
  case 'list':      cmdList(); break;
  case 'info':      cmdInfo(args[0]); break;
  case 'install':   cmdInstall(args[0]); break;
  case 'uninstall': cmdUninstall(args[0]); break;
  case 'publish':   cmdPublish(args[0]); break;
  case 'search':    cmdSearch(args[0]); break;
  case 'init':      cmdInit(args[0], args[1]); break;
  default:          cmdHelp();
}
