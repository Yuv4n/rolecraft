// Checks the exact request the app sends to the API, using a local stand-in server. No key or network is needed.
import assert from 'node:assert/strict';
import http from 'node:http';
import {makeAnthropicCall, workspaceHeaders} from '../lib/focus/anthropic.ts';

let checks = 0;
const eq = (a, b, m) => { checks++; assert.deepEqual(a, b, m); };

eq(workspaceHeaders('wrkspc_01AbCdEf'), {'anthropic-workspace-id': 'wrkspc_01AbCdEf'});
eq(workspaceHeaders(undefined), undefined);
eq(workspaceHeaders(''), undefined);
eq(workspaceHeaders('bad value\r\nx-evil: 1'), undefined, 'a value that is not a plain identifier is ignored');

const seen = [];
const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    seen.push({headers: req.headers, body: JSON.parse(raw)});
    res.writeHead(200, {'content-type': 'application/json'});
    res.end(JSON.stringify({id: 'm', type: 'message', role: 'assistant', model: 'x', content: [{type: 'text', text: '{"ok":true}'}], stop_reason: 'end_turn', stop_sequence: null, usage: {input_tokens: 1, output_tokens: 1}}));
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${server.address().port}`;
const request = {agent: 'a', model: 'claude-opus-5-5', effort: 'low', system: 's', user: 'u', schema: {type: 'object'}, maxTokens: 100};

eq(await makeAnthropicCall('test-key', 'wrkspc_01AbCdEf')(request), {ok: true});
eq(seen[0].headers['anthropic-workspace-id'], 'wrkspc_01AbCdEf', 'the workspace header is sent');
eq(seen[0].headers['x-api-key'], 'test-key');
eq(seen[0].body.output_config.format.type, 'json_schema');
eq(seen[0].body.fallbacks, 'default');
await makeAnthropicCall('test-key')(request);
eq(seen[1].headers['anthropic-workspace-id'], undefined, 'no header when no workspace is configured');
server.close();
console.log(`PASS: ${checks} API request checks (workspace header, key, structured output, fallbacks)`);
