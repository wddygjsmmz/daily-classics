const assert=require('node:assert/strict');
const {PlaybackOrder}=require('../playback-order.js');
const q=new PlaybackOrder(()=>.25);
q.reset(3);assert.equal(q.start(),0);assert.equal(q.next(0,true),1);assert.equal(q.next(2,true),-1);assert.equal(q.previous(0),-1);
q.setMode('list',2);assert.equal(q.next(2,true),0);assert.equal(q.previous(0),2);
q.setMode('single',1);assert.equal(q.next(1,true),1);assert.equal(q.next(1,false),2);assert.equal(q.next(2,false),0);
q.setMode('shuffle',0);q.reset(4);let current=q.start();const round=[current];
for(let i=0;i<3;i++){current=q.next(current,true);round.push(current)}
assert.equal(new Set(round).size,4);
const last=current;current=q.next(current,true);assert.notEqual(current,last);
assert.equal(q.previous(current),last);assert.equal(q.next(last),current);
for(const mode of ['sequence','list','single','shuffle']){
 q.reset(1);q.setMode(mode,0);assert.equal(q.next(0,true),mode==='sequence'?-1:0);
 q.reset(0);assert.equal(q.start(),-1);assert.equal(q.next(-1,true),-1);
}
q.setMode('invalid',-1);assert.equal(q.mode,'sequence');
console.log('PASS: four playback modes, boundaries, shuffle rounds/history, empty and single-track playlists');
