import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHandler} from '../src/worker.mjs';

test('static frontend constrains scripts, network origins and framing; API health also carries defensive headers',async()=>{
 const headers=await readFile(new URL('../../public/_headers',import.meta.url),'utf8');
 assert.match(headers,/script-src 'self';/);assert.doesNotMatch(headers,/script-src[^;]*(?:unsafe-inline|unsafe-eval|\*)/);
 assert.match(headers,/connect-src 'self' https:\/\/houston-groq-proxy\.flamingo-research\.workers\.dev;/);
 assert.match(headers,/frame-ancestors 'none'/);assert.match(headers,/X-Frame-Options: DENY/);assert.match(headers,/Permissions-Policy: camera=\(\), microphone=\(\)/);
 const response=await createHandler()(new Request('https://service.test/health'),{});
 assert.equal(response.headers.get('X-Frame-Options'),'DENY');assert.match(response.headers.get('Content-Security-Policy'),/default-src 'none'/);assert.equal(response.headers.get('Strict-Transport-Security'),'max-age=31536000');
});
