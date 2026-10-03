import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { getAdvertisement } from '../cloud-functions/templates/advertisement.js';
import { renderPage } from '../cloud-functions/templates/layout.js';

const script = getAdvertisement().match(/<script>([\s\S]*?)<\/script>/)[1];

function createAd({ earlyFailure = false, pushFailure = false, initialStatus = null } = {}) {
  let status = initialStatus;
  const timers = new Map();
  const listeners = new Map();
  const requests = [];
  const warnings = [];
  const ad = { getAttribute: () => status };
  const container = { dataset: { adState: 'pending' }, querySelector: () => ad };
  const loader = { dataset: {}, addEventListener: (event, callback) => listeners.set(event, callback) };
  let notify;

  if (earlyFailure) {
    // Run the real head handler before the component exists, as a blocker can do.
    const handler = renderPage().match(/id="adsense-loader"[^>]*onerror="([^"]+)"/)[1];
    vm.runInNewContext(`(function () { ${handler} }).call(loader)`, { loader });
  }

  vm.runInNewContext(script, {
    document: { currentScript: { closest: () => container }, getElementById: () => loader },
    window: { adsbygoogle: { push(value) { if (pushFailure) throw new Error('blocked'); requests.push(value); } } },
    MutationObserver: class {
      constructor(callback) { notify = callback; }
      observe() {}
    },
    setTimeout(callback, delay) { timers.set(1, { callback, delay }); return 1; },
    clearTimeout(id) { timers.delete(id); },
    console: { warn: (...args) => warnings.push(args) },
  });

  return {
    container, timers, requests, warnings,
    failLoader() { listeners.get('error')(); },
    timeout() { for (const { callback } of [...timers.values()]) callback(); },
    setStatus(next) { status = next; notify(); },
  };
}

test('pending ads request once and do not activate the advertisement label', () => {
  const ad = createAd();
  assert.equal(ad.container.dataset.adState, 'pending');
  assert.equal(ad.requests.length, 1);
  assert.equal(ad.timers.get(1).delay, 8000);
});

test('a loader blocked before the component is parsed collapses immediately', () => {
  const ad = createAd({ earlyFailure: true });
  assert.equal(ad.container.dataset.adState, 'unavailable');
  assert.equal(ad.requests.length, 0);
  assert.equal(ad.timers.size, 0);
});

test('a loader failure after initialization collapses the advertisement', () => {
  const ad = createAd();
  ad.failLoader();
  assert.equal(ad.container.dataset.adState, 'unavailable');
  assert.equal(ad.timers.size, 0);
});

test('blocked requests that never report a status collapse after the timeout', () => {
  const ad = createAd();
  ad.timeout();
  assert.equal(ad.container.dataset.adState, 'unavailable');
  assert.equal(ad.timers.size, 0);
});

test('unfilled and optimized empty units collapse without waiting for the timeout', () => {
  for (const status of ['unfilled', 'unfill-optimized']) {
    const ad = createAd();
    ad.setStatus(status);
    assert.equal(ad.container.dataset.adState, 'unavailable');
    assert.equal(ad.timers.size, 0);
  }
});

test('filled ads remain visible and cancel the fallback timer', () => {
  const ad = createAd();
  ad.setStatus('filled');
  ad.timeout();
  assert.equal(ad.container.dataset.adState, 'filled');
  assert.equal(ad.timers.size, 0);
  assert.equal(createAd({ initialStatus: 'filled' }).container.dataset.adState, 'filled');
});

test('a late fill restores the advertisement without making another request', () => {
  const ad = createAd();
  ad.timeout();
  ad.setStatus('filled');
  assert.equal(ad.container.dataset.adState, 'filled');
  assert.equal(ad.requests.length, 1);
});

test('an initialization exception collapses the advertisement without escaping', () => {
  const ad = createAd({ pushFailure: true });
  assert.equal(ad.container.dataset.adState, 'unavailable');
  assert.equal(ad.timers.size, 0);
  assert.equal(ad.warnings.length, 1);
});
