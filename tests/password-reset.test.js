import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { createAdminTestApi } from './helpers/admin-api-fixture.js';

function setup() {
  const calls=[];
  const https={ request(options,callback) {
    const req=new EventEmitter();req.setTimeout=()=>{};
    req.end=payload=>queueMicrotask(()=>{
      const body=JSON.parse(payload);calls.push(body);
      const answer=options.path.endsWith('/verify') ? body.verification_code==='123456' ? {verification_token:'proof'} : {error:'invalid_verification_code'} : {verification_id:'proof-id',expires_in:600};
      const res=new EventEmitter();res.statusCode=answer.error?400:200;callback(res);res.emit('data',JSON.stringify(answer));res.emit('end');
    });return req;
  }};
  return {...createAdminTestApi({}, {https}),calls};
}
const email='test@example.com';
const payload=id=>({email,challengeId:id,emailCode:'123456',password:'new-strong-password',confirmPassword:'new-strong-password'});

test('email reset updates only credentials, invalidates every previous session, and requires a fresh login',async()=>{
  const api=setup(), before={...api.rows.cp_users[1]};
  assert.equal((await api.call('GET','/me',null,'user-session')).status,200);
  const sent=await api.call('POST','/auth/send-reset-code',{email});assert.equal(sent.status,200);
  const reset=await api.call('POST','/auth/reset-password',payload(sent.body.challengeId));
  assert.equal(reset.status,200);assert.equal(reset.body.token,undefined);
  const user=api.rows.cp_users[1];assert.equal(user.passwordIterations,600000);assert.ok(user.authVersion);assert.ok(user.passwordHash);
  for(const key of ['_id','credits','createdAt','email'])assert.equal(user[key],before[key]);
  assert.equal((await api.call('GET','/me',null,'user-session')).status,401);
  const login=await api.call('POST','/auth/login',{email,password:'new-strong-password'});assert.equal(login.status,200);
  assert.equal((await api.call('GET','/me',null,login.body.token)).status,200);
  assert.equal((await api.call('POST','/auth/reset-password',payload(sent.body.challengeId))).status,400);
});

test('registration and password recovery challenges cannot substitute for each other or another mailbox',async()=>{
  const api=setup();
  const sent=await api.call('POST','/auth/send-reset-code',{email:'new@example.com'});assert.equal(sent.status,200);
  assert.equal((await api.call('POST','/auth/signup',{...payload(sent.body.challengeId),email:'new@example.com'})).status,400);
  assert.equal((await api.call('POST','/auth/reset-password',{...payload(sent.body.challengeId),email:'other@example.com'})).status,400);
  const registration=await api.call('POST','/auth/send-email-code',{email:'fresh@example.com'});
  assert.equal((await api.call('POST','/auth/reset-password',{...payload(registration.body.challengeId),email:'fresh@example.com'})).status,400);
  assert.equal(api.calls.length,2);
});

test('wrong and expired codes, invalid passwords, resend and concurrent reuse never reset extra accounts',async()=>{
  const api=setup();
  const first=await api.call('POST','/auth/send-reset-code',{email});
  assert.equal((await api.call('POST','/auth/send-reset-code',{email})).status,429);
  assert.equal((await api.call('POST','/auth/reset-password',{...payload(first.body.challengeId),confirmPassword:'different'})).status,400);
  for(let i=0;i<5;i++)assert.equal((await api.call('POST','/auth/reset-password',{...payload(first.body.challengeId),emailCode:'000000'})).status,400);
  assert.equal((await api.call('POST','/auth/reset-password',payload(first.body.challengeId))).status,429);
  api.rows.cp_email_codes[0].sentAt='2000-01-01T00:00:00Z';
  const second=await api.call('POST','/auth/send-reset-code',{email});
  assert.equal((await api.call('POST','/auth/reset-password',payload(first.body.challengeId))).status,400);
  const results=await Promise.all([1,2].map(()=>api.call('POST','/auth/reset-password',payload(second.body.challengeId))));
  assert.equal(results.filter(r=>r.status===200).length,1);
  api.rows.cp_email_codes[0].sentAt='2000-01-01T00:00:00Z';
  const third=await api.call('POST','/auth/send-reset-code',{email});api.rows.cp_email_codes[0].expiresAt='2000-01-01T00:00:00Z';
  assert.equal((await api.call('POST','/auth/reset-password',payload(third.body.challengeId))).status,400);
});
