import test from 'node:test';import assert from 'node:assert/strict';import {forecast,samples} from './engine.mjs';
test('trend extends a known line',()=>assert.deepEqual(forecast([1,2,3],3,'trend'),[4,5,6]));
test('average is a constant baseline',()=>assert.deepEqual(forecast([2,4,6],2,'average'),[4,4]));
test('counts never fall below zero',()=>assert.deepEqual(forecast([6,3,0],3,'trend'),[0,0,0]));
test('invalid inputs fail',()=>{assert.throws(()=>forecast([1,2],4,'trend'));assert.throws(()=>forecast([1,2,3],99,'trend'));});
test('every sample metric projects',()=>{for(const s of Object.values(samples))for(const k of ['issues','commits','pulls'])assert.equal(forecast(s[k],4,'trend').length,4);});

