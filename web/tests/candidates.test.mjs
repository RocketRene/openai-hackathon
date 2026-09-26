import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,searchCandidates,safeLinkedIn,interviewFor} from '../server/candidates.mjs';
import {executeTool,agentTurn} from '../server/agent.mjs';
const p=normalize({id:'p1',profile:{display_name:'Ada Example',company:'Example',interests:['machine-learning'],email:'private@example.test'},linkedin_url:'https://www.linkedin.com/in/ada/?tracking=x',linkedin_enrichment:{status:'enriched',data:{headline:'AI Engineer',position:[{title:'Engineer',companyName:'Example',start:{year:2020},end:{year:2024}}],skills:[{name:'Python'}]}}});
test('search matches word prefixes from the first character, including standalone stopwords',()=>{
  const profiles=[normalize({id:'s',profile:{display_name:'Sophia'}}),normalize({id:'a',profile:{display_name:'Ada'}}),normalize({id:'b',profile:{display_name:'Bert'}})];
  for(const query of ['S','So','Sop'])assert.deepEqual(searchCandidates(profiles,query).map(p=>p.id),['s']);
  assert.deepEqual(searchCandidates(profiles,'a').map(p=>p.id),['a']);
  assert.deepEqual(searchCandidates([p],'Py').map(p=>p.id),['p1']);
  assert.equal(searchCandidates(profiles,'').length,3);
});
test('founder is a searchable professional term',()=>{
  const founder=normalize({id:'f',profile:{display_name:'Sophia',job_title:'Founder'}});
  assert.deepEqual(searchCandidates([p,founder],'founder').map(p=>p.id),['f']);
});
test('normalization only exposes professional allowlisted fields',()=>{assert.equal(p.name,'Ada Example');assert.equal(p.skills[0],'Python');assert.equal(p.email,undefined);assert.equal(p.linkedin,'https://www.linkedin.com/in/ada/');});
test('unsafe or deceptive LinkedIn URLs are rejected',()=>{for(const url of ['javascript:alert(1)','https://linkedin.com.evil.test/in/ada','http://linkedin.com/in/ada','https://linkedin.com/company/a'])assert.equal(safeLinkedIn(url),'');});
test('AI matches word boundaries and German synonym without matching unrelated substrings',()=>{const other={...p,id:'p2',headline:'Retail',interests:[],skills:[]};assert.deepEqual(searchCandidates([p,other],'AI').map(x=>x.id),['p1']);assert.equal(searchCandidates([p],'KI')[0].id,'p1');});
test('search uses experience and education and respects LinkedIn filter',()=>{assert.equal(searchCandidates([p],'Python').length,1);assert.equal(searchCandidates([{...p,linkedin:''}],'',{linkedInOnly:true}).length,0);assert.equal(searchCandidates([p],'zzzunfindable').length,0);});
test('failed enrichment does not become a claimed LinkedIn CV',()=>{const c=normalize({id:'f',profile:{display_name:'Failed'},linkedin_enrichment:{status:'failed',data:{headline:'Wrong'}}});assert.equal(c.headline,'');assert.equal(c.enriched,false);});
test('interview references actual experience and keeps availability unknown',()=>{const plan=interviewFor(p);assert.match(plan.sections[1].questions[0],/Example/);assert.equal(plan.sections.reduce((s,x)=>s+x.minutes,0),30);assert.match(plan.unknowns.join(' '),/Verfügbarkeit/);});
test('tool boundary rejects unsupported actions and unknown profiles',()=>{assert.throws(()=>executeTool('send_message',{},[p]),/Unbekannt/);assert.throws(()=>executeTool('get_candidate',{id:'missing'},[p]),/nicht gefunden/);assert.throws(()=>executeTool('update_brief',{idea:1},[p]),/Ungültig/);});
test('agent executes a search, supplies result and continues to an answer',async()=>{let calls=0;const fake=async(_url,options)=>{calls++;const request=JSON.parse(options.body);if(calls===1)return {ok:true,json:async()=>({output:[{type:'function_call',call_id:'call1',name:'search_candidates',arguments:'{"query":"AI"}'}]})};assert.equal(request.input.at(-1).type,'function_call_output');assert.match(request.input.at(-1).output,/Ada Example/);return {ok:true,json:async()=>({output:[{type:'message',content:[{type:'output_text',text:'Ada hat AI-Erfahrung.'}]}]})};};const r=await agentTurn([{role:'user',content:'Suche AI'}],{},[p],fake);assert.equal(calls,2);assert.equal(r.events[0].name,'search_candidates');assert.match(r.text,/Ada/);});
test('agent provider failures surface instead of generating a pretend response',async()=>{await assert.rejects(agentTurn([{role:'user',content:'Hallo'}],{},[p],async()=>({ok:false,status:401})),/HTTP 401/);});
