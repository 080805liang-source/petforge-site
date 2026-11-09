import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPetAnimation} from '../scripts/pet-animation.js';

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
