import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPetAnimation} from '../scripts/pet-animation.js';

test('the video pet stays on its neutral standing frame, plays once without restarting, then resumes following',()=>{
  const meta=JSON.parse(readFileSync(new URL('../assets/workshop/animals/animal-900000104-animation.json',import.meta.url)));
  const p=createPetAnimation(meta),duration=meta.clips.pet.count/meta.clips.pet.fps*1000;
  assert.equal(p.clickClip,true);assert.equal(p.frame(0),228);assert.equal(p.frame(60000),228);
  assert.equal(p.click(61000),true);assert.equal(p.frame(61500),8);
  assert.equal(p.click(62000),false);assert.equal(p.frame(62000),16);
  assert.equal(p.paused(61000+duration-1),true);
  assert.equal(p.frame(61000+duration+1),228);assert.equal(p.paused(61000+duration+1),true);
  assert.equal(p.paused(61000+duration+701),false);
  assert.equal(p.click(80000),true);assert.equal(p.frame(80000),1);
});

test('the four photo dog pauses, counts physical clicks, resolves the stick interaction and resumes',()=>{
  const meta=JSON.parse(readFileSync(new URL('../assets/workshop/animals/animal-900000103-animation.json',import.meta.url)));
  const p=createPetAnimation(meta);
  assert.equal(p.interactive,true);assert.equal(p.frame(0),0);
  p.click(1000);assert.equal(p.frame(1100),1);assert.equal(p.paused(2700),true);
  assert.equal(p.frame(2700),0);assert.equal(p.paused(3400),false);
  for(const at of [5000,5200,5400,5600])p.click(at);
  assert.equal(p.frame(5700),2);assert.equal(p.paused(5700),true);
  p.click(5800);assert.equal(p.frame(5900),3);p.click(6000);assert.equal(p.state,'calm');
  assert.equal(p.frame(8100),0);assert.equal(p.paused(8800),false);
  for(const at of [10000,10200,10400,10600])p.click(at);
  assert.equal(p.state,'angry');assert.equal(p.frame(19000),0);assert.equal(p.paused(19500),false);
  for(const at of [30000,33000,36000,39000])p.click(at);
  assert.equal(p.state,'pet');
});

for (const id of ['animal-900000101','animal-900000102']) {
  const meta = JSON.parse(readFileSync(new URL(`../assets/workshop/animals/${id}-animation.json`,import.meta.url)));
  test(`${id}: idle, pet, play, sleep and wake use separate bounded clips`, () => {
    const p = createPetAnimation(meta);
    assert.equal(p.hasActions,true);
    assert.equal(p.frame(1000),0);
    assert.equal(p.frame(4100),1);
    for (const key of ['pet','play']) {
      assert.equal(p.play(key,5000),true);
      assert.equal(p.frame(5000),meta.clips[key].start);
      const mid=p.frame(5500);
      assert.ok(mid>=meta.clips[key].start && mid<meta.clips[key].start+meta.clips[key].count);
      assert.equal(p.frame(7000),0);
    }
    p.play('sleep',8000);
    assert.equal(p.frame(8000),90);
    assert.ok(p.frame(18000)>=90);
    p.play('wake',18000);assert.equal(p.frame(18000),0);
    assert.equal(p.play('unknown',19000),false);
  });
}
test('invalid clip ranges cannot read outside the atlas and legacy loops still work', () => {
  const p=createPetAnimation({count:12,fps:12,clips:{idle:{start:99,count:8,fps:30}}});
  assert.equal(p.hasActions,false);assert.equal(p.play('idle',0),false);
  assert.equal(p.frame(0),0);assert.equal(p.frame(1250),3);
});
