import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface ApmSkill {
  name: string;
  version: string;
  path: string;
  description: string;
  exports: string[];
  depends_on: string[];
}

interface ApmPrompt {
  name: string;
  version: string;
  path: string;
  description: string;
  variables: string[];
}

interface ApmConfig {
  name: string;
  version: string;
  skills: ApmSkill[];
  prompts: ApmPrompt[];
}

interface SkillRecord {
  name: string;
  version: string;
  description: string;
  exports: string[];
  module: Record<string, (...args: unknown[]) => unknown>;
  status: 'ready' | 'error';
  error?: string;
}

interface PromptRecord {
  name: string;
  version: string;
  description: string;
  variables: string[];
  template: string;
  status: 'ready' | 'error';
}

class ApmLoader {
  private skills = new Map<string, SkillRecord>();
  private prompts = new Map<string, PromptRecord>();
  private config: ApmConfig | null = null;

  async init() {
    const apmPath = path.resolve(__dirname, '../../../apm.yml');
    if (!fs.existsSync(apmPath)) {
      console.warn('[APM] apm.yml not found at', apmPath);
      return;
    }
    this.config = yaml.load(fs.readFileSync(apmPath, 'utf8')) as ApmConfig;

    const sorted = this.topoSort(this.config.skills);
    for (const skill of sorted) {
      this.loadSkill(skill);
    }
    for (const prompt of this.config.prompts) {
      this.loadPrompt(prompt);
    }
  }

  private topoSort(skills: ApmSkill[]): ApmSkill[] {
    const map = new Map(skills.map(s => [s.name, s]));
    const visited = new Set<string>();
    const result: ApmSkill[] = [];
    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);
      const skill = map.get(name);
      if (!skill) return;
      for (const dep of skill.depends_on ?? []) visit(dep);
      result.push(skill);
    };
    skills.forEach(s => visit(s.name));
    return result;
  }

  private loadSkill(skill: ApmSkill) {
    try {
      const absPath = path.resolve(__dirname, '../../../', skill.path);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(absPath);
      this.skills.set(skill.name, { ...skill, module: mod, status: 'ready' });
      console.log(`[APM] Skill loaded: ${skill.name}@${skill.version}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.skills.set(skill.name, { ...skill, module: {}, status: 'error', error: msg } as SkillRecord);
      console.error(`[APM] Skill failed: ${skill.name} — ${msg}`);
    }
  }

  private loadPrompt(prompt: ApmPrompt) {
    try {
      const absPath = path.resolve(__dirname, '../../../', prompt.path);
      const template = fs.readFileSync(absPath, 'utf8');
      this.prompts.set(prompt.name, { ...prompt, template, status: 'ready' });
      console.log(`[APM] Prompt loaded: ${prompt.name}@${prompt.version}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.prompts.set(prompt.name, { ...prompt, template: '', status: 'error', error: msg } as PromptRecord);
    }
  }

  getSkill(name: string) { return this.skills.get(name); }
  getPrompt(name: string) { return this.prompts.get(name); }
  listSkills() { return Array.from(this.skills.values()).map(({ name, version, description, exports: ex, status, error }) => ({ name, version, description, exports: ex, status, error })); }
  listPrompts() { return Array.from(this.prompts.values()).map(({ name, version, description, variables, status }) => ({ name, version, description, variables, status })); }

  renderPrompt(name: string, vars: Record<string, string>): string {
    const p = this.prompts.get(name);
    if (!p || p.status !== 'ready') return '';
    let out = p.template;
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
    return out;
  }

  invokeSkill(name: string, fn: string, ...args: unknown[]) {
    const skill = this.skills.get(name);
    if (!skill || skill.status !== 'ready') throw new Error(`Skill ${name} not ready`);
    const func = skill.module[fn];
    if (typeof func !== 'function') throw new Error(`Export ${fn} not found in skill ${name}`);
    return func(...args);
  }
}

export const apmLoader = new ApmLoader();
