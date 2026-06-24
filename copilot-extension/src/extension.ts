import * as vscode from 'vscode';
import * as path from 'path';
import { loadAgents, resolveInstructions, ApmAgent } from './apmConfig.js';
import { isBackendReachable, getLeaderboard } from './gameClient.js';

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) return;

  const agents = loadAgents(workspaceRoot);
  if (!agents.length) {
    vscode.window.showWarningMessage('ingredient-game-agents: no agents found in apm.yml');
    return;
  }

  for (const agent of agents) {
    registerParticipant(context, workspaceRoot, agent);
  }

  vscode.window.showInformationMessage(
    `Ingredient Game: ${agents.length} agents loaded from apm.yml (${agents.map(a => '@' + a.name).join(', ')})`
  );
}

function registerParticipant(
  context: vscode.ExtensionContext,
  workspaceRoot: string,
  agent: ApmAgent
) {
  const id = `ingredient-game.${agent.name}`;

  const participant = vscode.chat.createChatParticipant(
    id,
    async (
      request: vscode.ChatRequest,
      _ctx: vscode.ChatContext,
      stream: vscode.ChatResponseStream,
      token: vscode.CancellationToken
    ) => {
      const systemPrompt = resolveInstructions(agent.instructions, workspaceRoot);

      // Check if backend is up; add a status note if not
      const backendUp = await isBackendReachable();
      const toolsContext = backendUp
        ? `The game backend is running. Your available MCP tools are: ${agent.mcp_tools.join(', ')}.`
        : `The game backend is not running (start with \`npm run dev\`). You can still answer from knowledge, but live game data is unavailable.`;

      // Optionally inject leaderboard for game-agent
      let liveContext = '';
      if (agent.name === 'game-agent' && backendUp) {
        try {
          const { leaderboard } = await getLeaderboard();
          if (leaderboard.length) {
            liveContext = `\n\nCurrent leaderboard top ${leaderboard.length}:\n` +
              leaderboard.map((e, i) => `${i + 1}. ${e.playerId} — ${e.score} pts`).join('\n');
          }
        } catch { /* non-fatal */ }
      }

      const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4o',
      });

      if (!models.length) {
        stream.markdown('❌ No Copilot model available. Ensure GitHub Copilot is signed in.');
        return;
      }

      const messages = [
        vscode.LanguageModelChatMessage.User(
          `<system>\n${systemPrompt}\n\n${toolsContext}${liveContext}\n</system>\n\nUser: ${request.prompt}`
        ),
      ];

      try {
        const response = await models[0].sendRequest(messages, {}, token);
        for await (const chunk of response.text) {
          stream.markdown(chunk);
        }
      } catch (err) {
        if (err instanceof vscode.LanguageModelError) {
          stream.markdown(`❌ Model error: ${err.message}`);
        } else {
          throw err;
        }
      }

      // Show which MCP tools this agent has access to as a follow-up button hint
      stream.button({
        command: 'workbench.action.chat.open',
        title: `Tools: ${agent.mcp_tools.join(', ')}`,
      });
    }
  );

  participant.iconPath = new vscode.ThemeIcon('robot');
  participant.followupProvider = {
    provideFollowups(_result, _ctx, _token) {
      return agentFollowups(agent.name);
    },
  };

  context.subscriptions.push(participant);
}

function agentFollowups(agentName: string): vscode.ChatFollowup[] {
  const map: Record<string, vscode.ChatFollowup[]> = {
    'hint-agent': [
      { prompt: 'Give me another hint without naming the ingredient', label: '🔍 Another hint' },
      { prompt: 'What makes this ingredient unique in Tamil cooking?', label: '🌿 Cultural clue' },
    ],
    'cultural-agent': [
      { prompt: 'What festival is this dish associated with?', label: '🎉 Festival connection' },
      { prompt: 'Tell me more about the key spice in this dish', label: '🌶 Key spice' },
    ],
    'scoring-agent': [
      { prompt: 'How can I improve my score next round?', label: '📈 Improve score' },
      { prompt: 'What did I miss?', label: '❓ What did I miss' },
    ],
    'difficulty-agent': [
      { prompt: 'Should I switch to hard difficulty?', label: '⬆ Try harder' },
      { prompt: 'What score do I need to unlock hard mode?', label: '🏆 Hard mode target' },
    ],
    'game-agent': [
      { prompt: 'Start a new game on medium difficulty', label: '▶ New game' },
      { prompt: 'Show me the leaderboard', label: '🏆 Leaderboard' },
      { prompt: 'Suggest a Tamil dish to play next', label: '🍛 Tamil dish' },
    ],
  };
  return map[agentName] ?? [];
}

export function deactivate() {}
