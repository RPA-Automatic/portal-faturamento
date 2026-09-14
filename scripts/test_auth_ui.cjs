const { chromium } = require('../frontend/node_modules/playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const frontend = path.resolve(__dirname, '../frontend');
const servers = [];
let browser;
const errors = [];
const user = { id: '10000000-0000-0000-0000-000000000001', email: 'demo@example.test',
  aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Avaliação sintética' } };
const session = { user, access_token: 'synthetic-access-token', refresh_token: 'synthetic-refresh-token',
  token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600 };
async function serve(port, providers, configured = true) {
  const server = spawn(process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: frontend, stdio: 'ignore', env: { ...process.env,
      VITE_SUPABASE_URL: configured ? 'https://example-test.supabase.co' : '',
      VITE_SUPABASE_ANON_KEY: configured ? 'sb_publishable_synthetic_test_key' : '',
      VITE_AUTH_OAUTH_PROVIDERS: providers },
  });
  servers.push(server);
  const base = `http://127.0.0.1:${port}/`;
  for(let i=0;i<100;i++) { try { if((await fetch(base)).ok) return base; } catch {} await new Promise(r=>setTimeout(r,100)); }
  throw new Error('Vite did not start');
}
async function pageWithMock(handler) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(10000);
  await page.route('https://example-test.supabase.co/**', async route => {
    const request = route.request(); const url = new URL(request.url());
    const result = await handler?.(request, url);
    if (result === false) return route.abort();
    return route.fulfill({ status: result?.status || 200, contentType: 'application/json',
      body: JSON.stringify(result?.body ?? (url.pathname.startsWith('/rest/') ? [] : user)) });
  });
  return page;
}
(async () => {
  const base = await serve(5188, 'azure,github,google');
  browser = await chromium.launch({ headless: true });

  let reject = true;
  const emailPage = await pageWithMock((req, url) => {
    if(url.pathname.endsWith('/token')) {
      assert.equal(req.postDataJSON().email, 'demo@example.test');
      return reject ? {status:400,body:{error_code:'invalid_credentials',message:'provider detail must not leak'}} : {body:session};
    }
    if(url.pathname.endsWith('/signup')) return {body:user};
  });
  await emailPage.goto(base);
  await emailPage.getByLabel('E-mail', {exact:true}).fill(user.email);
  await emailPage.getByLabel('Senha', {exact:true}).fill('synthetic-password');
  await emailPage.getByRole('button', {name:'Entrar',exact:true}).click();
  await emailPage.getByRole('alert').filter({hasText:'E-mail ou senha incorretos'}).waitFor();
  assert.equal(await emailPage.getByText('provider detail must not leak').count(), 0);
  reject = false;
  await emailPage.getByRole('button', {name:'Entrar',exact:true}).click();
  await emailPage.getByRole('button', {name:'Sair',exact:true}).waitFor();
  await emailPage.reload(); await emailPage.getByRole('button', {name:'Sair',exact:true}).waitFor();
  await emailPage.getByRole('button', {name:'Sair',exact:true}).click();
  await emailPage.getByRole('heading', {name:'Acesse seu portal'}).waitFor();
  await emailPage.getByRole('button', {name:'Criar conta',exact:true}).click();
  await emailPage.getByLabel('Nome completo').fill('Avaliação sintética');
  await emailPage.getByLabel('E-mail', {exact:true}).fill(user.email);
  await emailPage.getByLabel('Senha', {exact:true}).fill('synthetic-password');
  await emailPage.getByRole('button', {name:'Criar conta',exact:true}).click();
  await emailPage.getByRole('status').filter({hasText:'Confira seu e-mail'}).waitFor();
  await emailPage.close();

  for(const [provider, label] of [['azure','Microsoft'],['github','GitHub'],['google','Google']]) {
    let authorization;
    const page = await pageWithMock((req,url)=>{if(url.pathname.endsWith('/authorize')) {authorization=url;return false;} });
    await page.goto(base);
    await page.getByRole('button',{name:`Continuar com ${label}`,exact:true}).click();
    await page.waitForURL(url => url.hostname !== '127.0.0.1').catch(()=>{});
    assert.ok(authorization, provider);
    assert.equal(authorization.searchParams.get('provider'),provider);
    assert.equal(authorization.searchParams.get('redirect_to'),base);
    assert.equal(authorization.searchParams.get('code_challenge_method'),'s256');
    assert.ok(authorization.searchParams.get('code_challenge'));
    if(provider==='azure') assert.ok(authorization.searchParams.get('scopes').includes('email'));
    await page.close();
  }

  let exchanges=0;
  const callbackPage = await pageWithMock((req,url) => {
    if(url.pathname.endsWith('/token')) {
      exchanges++; assert.equal(url.searchParams.get('grant_type'),'pkce');
      assert.equal(req.postDataJSON().auth_code,'synthetic-code');
      assert.equal(req.postDataJSON().code_verifier,'synthetic-verifier');
      return {body:session};
    }
  });
  await callbackPage.addInitScript(()=>localStorage.setItem('sb-example-test-auth-token-code-verifier',JSON.stringify('synthetic-verifier')));
  await callbackPage.goto(base+'?code=synthetic-code');
  await callbackPage.getByRole('button',{name:'Sair',exact:true}).waitFor();
  assert.equal(exchanges,1,'StrictMode must not exchange the same code twice');
  assert.equal(new URL(callbackPage.url()).search,'');
  await callbackPage.close();

  for(const suffix of ['?error=access_denied&error_description=private-provider-detail','#error=access_denied&error_description=private-provider-detail','?code=expired-code']) {
    const page = await pageWithMock(); await page.goto(base+suffix);
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByText('private-provider-detail').count(),0);
    assert.equal(new URL(page.url()).hash,''); assert.equal(new URL(page.url()).search,'');
    await page.close();
  }

  let resendRequest;
  const expiredPage = await pageWithMock((req,url) => {
    if(url.pathname.endsWith('/resend')) { resendRequest={body:req.postDataJSON(),redirectTo:url.searchParams.get('redirect_to')}; return {body:{}}; }
  });
  await expiredPage.goto(base+'?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  await expiredPage.getByRole('alert').filter({hasText:'link de confirmação expirou'}).waitFor();
  assert.equal(new URL(expiredPage.url()).search,'');
  const resendButton=expiredPage.getByRole('button',{name:'Reenviar confirmação',exact:true});
  assert.ok(await resendButton.isDisabled());
  await expiredPage.getByLabel('E-mail',{exact:true}).fill(user.email);
  await resendButton.click();
  await expiredPage.getByRole('status').filter({hasText:'novo link de confirmação'}).waitFor();
  assert.equal(resendRequest.body.email,user.email);
  assert.equal(resendRequest.body.type,'signup');
  assert.equal(resendRequest.redirectTo,base);
  await expiredPage.close();

  const gatedBase=await serve(5189,'');
  const gated=await pageWithMock(); await gated.goto(gatedBase);
  await gated.getByRole('heading',{name:'Acesse seu portal'}).waitFor();
  for(const label of ['Microsoft','GitHub','Google']) assert.equal(await gated.getByRole('button',{name:`Continuar com ${label}`,exact:false}).count(), 0);
  assert.ok(await gated.getByRole('button',{name:'Entrar',exact:true}).isEnabled());
  assert.equal(await gated.getByRole('alert').count(),0);
  assert.match(await gated.title(),/RPA Automatic/);
  for(const src of await gated.locator('img').evaluateAll(imgs=>imgs.map(img=>img.getAttribute('src')))) assert.ok(src.startsWith('/brand/'));
  await gated.screenshot({path:'/tmp/pf-login-desktop.png',fullPage:true});
  await gated.setViewportSize({width:390,height:844});
  await gated.screenshot({path:'/tmp/pf-login-mobile.png',fullPage:true});
  assert.ok(await gated.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await gated.close();

  const missingBase=await serve(5190,'',false);
  const missing=await pageWithMock(); await missing.goto(missingBase);
  await missing.getByRole('alert').filter({hasText:'temporariamente indisponível'}).waitFor();
  assert.ok(await missing.getByRole('button',{name:'Entrar',exact:true}).isDisabled());
  assert.equal(await missing.getByText('VITE_SUPABASE',{exact:false}).count(),0);
  await missing.close();
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS Auth: email, signup, resend after expired link, logout/session persistence, 3 OAuth PKCE redirects, single callback exchange, errors, hidden unconfigured providers, missing config, brand, mobile. Synthetic mocks only.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();servers.forEach(server=>server.kill());});
