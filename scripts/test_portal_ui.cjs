const { chromium } = require('../frontend/node_modules/playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const frontend = path.resolve(__dirname, '../frontend');
const server = spawn(process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5187', '--strictPort'], { cwd: frontend, stdio: 'ignore', env: { ...process.env, VITE_SUPABASE_URL: 'https://example-test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-public-key' } });
(async () => {
 for (let i=0; i<50; i++) { try { if ((await fetch('http://127.0.0.1:5187')).ok) break; } catch {} await new Promise(r=>setTimeout(r,100)); }
 const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const id='20000000-0000-0000-0000-000000000001'; let fail=false;
 const user={id:'10000000-0000-0000-0000-000000000001',email:'demo@example.test',user_metadata:{full_name:'Avaliação sintética'},app_metadata:{provider:'email'},aud:'authenticated'};
 await page.addInitScript(user=>{localStorage.setItem('sb-example-test-auth-token',JSON.stringify({access_token:'synthetic-test-access-token',refresh_token:'synthetic-test-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));},user);
 await page.route('https://example-test.supabase.co/**',route=>{
  const url=new URL(route.request().url());const table=url.pathname.split('/').pop();let data=[];
  if(url.pathname.includes('/auth/')) return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)});
  if(fail&&table==='document_versions')return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'test unavailable'})});
  if(table==='v_operations_farol')data=[{id,oper_b2b:'DEMO-001',description:'Cenário sintético de avaliação',item_description:'Produto de teste',current_stage:'E1',current_stage_name:'Documentação',semaphore:'vermelho',purchase_contracts_count:1,sales_contracts_count:0,blocking_pending_count:1,warning_pending_count:0,aging_days:1}];
  if(table==='v_operation_stage_readiness')data=['E1','E2','E3','E4','E5'].map(stage=>({stage,result:'pendente',reason:null}));
  if(table==='pending_items')data=[{id:'p1',stage:'E1',owner_area:'fiscal',severity:'bloqueante',status:'aberta',message:'Conferir instrução fiscal',next_step:'Obter documento aprovado'}];
  if(table==='operation_contract_links')data=[{contract_id:'c1',contracts:{contract_number:'TEST-001',contract_type:'compra',establishment:'TEST',item_description:'Produto de teste',normalized_status:'andamento',data_carga:'2026-09-13'}}];
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:5187');await page.getByRole('button',{name:'OP DEMO-001',exact:true}).click();
 await page.getByRole('heading',{name:'Ficha operacional',exact:false}).count();
 await page.getByRole('heading',{name:'Verificações por etapa'}).waitFor();
 assert.equal(await page.getByText('Conferir instrução fiscal',{exact:true}).count(),1);
 await page.screenshot({path:'/tmp/pf-operation-detail-desktop.png'});
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').count(),0);
 fail=true;await page.getByRole('button',{name:'OP DEMO-001',exact:true}).click();await page.getByRole('alert').waitFor();
 fail=false;await page.getByRole('button',{name:'Tentar novamente'}).click();await page.getByRole('heading',{name:'Verificações por etapa'}).waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/pf-operation-detail-mobile.png'});
 assert.equal(errors.length,0,errors.join('\n'));await browser.close();console.log('PASS UI: abrir ficha, dados, fechar com Escape, erro/retry, mobile; zero page errors');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.kill());
