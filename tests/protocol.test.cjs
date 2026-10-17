const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let source = fs.readFileSync('ixl-auto-answer.user.js','utf8');
source = source.replace("const host = document.createElement('div'); host.id = 'ixl-ai-choice';", "globalThis.test = {validate,buildRequest,extract,apiError}; return; const host = null;");
const sandbox = {document:{getElementById:()=>null},GM_getValue:(_,v)=>v,setTimeout,console};
vm.runInNewContext(source,sandbox);
const {validate,buildRequest,extract,apiError} = sandbox.test;
const p={question_id:'q1',mode:'single',options:[{id:'o1'},{id:'o2'}]};
const a={question_id:'q1',status:'answer',selected_ids:['o1'],confidence:.95,explanation:'测试'};
const check = obj=>validate(JSON.stringify(obj),p);
assert.equal(check(a).selected_ids[0],'o1');
assert.throws(()=>validate('{"explanation":"unescaped "quote""}',p),e=>e.code==='ANSWER_JSON_SYNTAX');
assert.equal(check({...a,explanation:'包含 "引号" 和\n换行'}).explanation,'包含 "引号" 和\n换行');
for(const change of [{question_id:'wrong'},{selected_ids:['o3']},{selected_ids:['o1','o1']},{selected_ids:['o1','o2']},{confidence:2},{confidence:'1'},{status:'abstain'},{extra:true},{selected_ids:[]}]) assert.throws(()=>check({...a,...change}));
assert.equal(check({...a,status:'abstain',selected_ids:[]}).status,'abstain');
assert.equal(validate('```json\n'+JSON.stringify(a)+'\n```',p).status,'answer');
const multiple={...p,mode:'multiple'};
assert.equal(validate(JSON.stringify({...a,selected_ids:['o1','o2']}),multiple).selected_ids.length,2);
const matrix={question_id:'q1',mode:'matrix',options:['r1c1','r1c2','r2c1','r2c2'].map(id=>({id})),groups:[{option_ids:['r1c1','r1c2']},{option_ids:['r2c1','r2c2']}]};
assert.equal(validate(JSON.stringify({...a,selected_ids:['r1c1','r2c2']}),matrix).selected_ids.length,2);
assert.equal(validate(JSON.stringify({...a,selected_ids:['r1c1','r2c1']}),matrix).selected_ids.length,2);
for(const selected_ids of [['r1c1'],['r1c1','r1c2'],['r1c1','r2c1','r2c2'],['r1c1','r9c1']]) assert.throws(()=>validate(JSON.stringify({...a,selected_ids}),matrix));
assert.equal(validate(JSON.stringify({...a,status:'abstain',selected_ids:[]}),matrix).status,'abstain');
for(const protocol of ['chat','responses','anthropic']) {
 const req=buildRequest({protocol,model:'test-model',key:'test-only-key',jsonMode:true},p);
 assert.equal(req.body.model,'test-model');
 if(protocol==='chat') {assert.equal(req.body.response_format.type,'json_object');assert.equal(req.headers.Authorization,'Bearer test-only-key');}
 if(protocol==='responses') {assert.equal(req.body.store,false);assert.equal(typeof req.body.instructions,'string');}
 if(protocol==='anthropic') {assert.equal(req.headers['x-api-key'],'test-only-key');assert.equal(req.body.max_tokens,2048);}
}
assert.equal(extract({choices:[{finish_reason:'stop',message:{content:'ok'}}]},'chat'),'ok');
const deepseek={protocol:'chat',model:'deepseek-v4.1-flash',key:'',effort:'fast'};
assert.equal(buildRequest(deepseek,p).body.thinking.type,'disabled');
assert.equal(buildRequest(deepseek,p).body.reasoning_effort,undefined);
assert.equal(buildRequest({...deepseek,effort:'low'},p).body.reasoning_effort,'low');
assert.equal(buildRequest({...deepseek,effort:'low'},p).body.thinking.type,'enabled');
assert.equal(buildRequest({...deepseek,effort:'default'},p).body.thinking,undefined);
assert.equal(buildRequest({...deepseek,model:'other',effort:'low'},p).body.reasoning_effort,'low');
assert.equal(buildRequest({...deepseek,protocol:'responses'},p).body.reasoning.effort,'none');
assert.equal(buildRequest({...deepseek,protocol:'anthropic'},p).body.thinking,undefined);
assert.throws(()=>extract({choices:[{finish_reason:'length'}]},'chat'));
assert.equal(extract({status:'completed',output:[{content:[{type:'output_text',text:'ok'}]}]},'responses'),'ok');
assert.throws(()=>extract({status:'incomplete'},'responses'));
assert.equal(extract({content:[{type:'text',text:'ok'}]},'anthropic'),'ok');
assert.throws(()=>extract({stop_reason:'max_tokens'},'anthropic'));
const config={key:'private-secret-value',model:'test-model',protocol:'chat'};
const error=apiError({status:400,responseText:JSON.stringify({error:{message:'Invalid model private-secret-value Bearer another-key sk-example123',code:'invalid_model'}})},config);
assert.match(error.message,/invalid_model/);
assert.match(error.message,/Invalid model/);
assert.ok(!error.message.includes(config.key));
assert.ok(!error.message.includes('another-key'));
assert.ok(!error.message.includes('sk-example123'));
assert.match(apiError({status:502,responseText:'<html><body>Bad gateway</body></html>'},config).message,/Bad gateway/);
assert.match(apiError({status:400,responseText:''},config).message,/服务端未返回/);
console.log('PASS: JSON validation, request formats, response parsing, error details and secret redaction. No live API calls.');
