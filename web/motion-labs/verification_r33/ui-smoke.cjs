const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:9222');
  const rows = [];
  for (const [character, site] of [['diandian', 'diandian-classic-motion-lab'], ['zhigeng', 'zhigeng-motion-lab']]) {
    const page = await browser.contexts()[0].newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:8080/web/motion-labs/' + site + '/?r33-ui=1');
    await page.waitForFunction(() => (window.diandianLab || window.zhigengLab)?.getState().ready,
      null, { polling: 100, timeout: 90000 });
    const poses = [];
    for (const weapon of ['qcq171', 'qbu85', 'hanyang88', 'type97hawk']) {
      await page.evaluate(weapon => {
        const lab = window.diandianLab || window.zhigengLab;
        lab.selectWeapon(weapon); lab.setMotion('RifleAimingIdle'); lab.seek(0); lab.setPlaying(true);
      }, weapon);
      await page.waitForFunction(() => (window.diandianLab || window.zhigengLab).getState().time > .2,
        null, { polling: 100, timeout: 15000 });
      poses.push(await page.evaluate(() => {
        const lab = window.diandianLab || window.zhigengLab, a = lab.models.get('fixed').weaponAttachment;
        return { state: lab.getState(), revision: a.config.revision, attachment: a.getState() };
      }));
    }
    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    rows.push({ character, errors, layout, poses,
      pass: errors.length === 0 && layout.scrollWidth <= layout.width && poses.every(p => p.revision === 33 && p.state.playing) });
    await page.close();
  }
  fs.writeFileSync(__dirname + '/ui-smoke.json', JSON.stringify({ passed: rows.every(r => r.pass), rows }, null, 2) + '\n');
  console.log(rows.map(({ character, pass, errors }) => ({ character, pass, errors })));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
