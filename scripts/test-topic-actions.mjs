import test from 'node:test';
import assert from 'node:assert/strict';
import {topicReviewState} from '../src/topicActions.ts';
const run=(id,kind='full',review)=>({id,kind,wrong:2,completed_at:'2026-10-27T10:00:00Z',review});
test('completed review is retained without another invitation',()=>{
 const state=topicReviewState([run(1,'full',{completed_at:'2026-10-27T11:00:00Z'})]);
 assert.equal(state.pending,undefined);assert.equal(state.completed,true);
});
test('unfinished review resumes before a different unstarted batch',()=>{
 const state=topicReviewState([run(3,'new'),run(2,'new',{completed_at:null}),run(1)]);
 assert.equal(state.pending.id,2);assert.equal(state.completed,false);
});
test('a completed review for one batch does not hide errors in another',()=>{
 const state=topicReviewState([run(2,'new'),run(1,'full',{completed_at:'2026-10-27T11:00:00Z'})]);
 assert.equal(state.pending.id,2);assert.equal(state.completed,false);
});
test('new full repeat does not invite review of older cycles',()=>{
 const state=topicReviewState([{...run(3),completed_at:null},run(1)]);
 assert.equal(state.pending,undefined);assert.equal(state.completed,false);
});
test('no errors does not offer a review',()=>{
 assert.deepEqual(topicReviewState([{...run(1),wrong:0}]),{pending:undefined,completed:false});
});
