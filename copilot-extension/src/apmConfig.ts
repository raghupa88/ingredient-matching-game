import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface ApmAgent {
  name: string;
  type: string;
  model: string;
  description: string;
  mcp_tools: string[];
  instructions: string;
  depends_on?: string[];
}

interface ApmConfig {
  agents: ApmAgent[];
}

export function loadAgents(workspaceRoot: string): ApmAgent[] {
  const apmPath = path.join(workspaceRoot, 'apm.yml');
  if (!fs.existsSync(apmPath)) return [];
  const config = yaml.load(fs.readFileSync(apmPath, 'utf8')) as ApmConfig;
  return config.agents ?? [];
}

export function resolveInstructions(instructions: string, workspaceRoot: string): string {
  const trimmed = instructions.trim();
  if (trimmed.startsWith('./') || trimmed.startsWith('.\\')) {
    const absPath = path.join(workspaceRoot, trimmed);
    if (fs.existsSync(absPath)) return fs.readFileSync(absPath, 'utf8');
  }
  return trimmed;
}
