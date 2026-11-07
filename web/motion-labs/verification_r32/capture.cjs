const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const character = process.argv[2] || 'diandian';
  const browser = await chromium.connectOverCDP(process.env.CDP_URL || 'http://127.0.0.1:9222');
  const site = character === 'diandian' ? 'diandian-classic-motion-lab' : 'zhigeng-motion-lab';
  const page = browser.contexts()[0].pages().find(p => p.url().includes('/' + site + '/'));
  const output = path.join(__dirname, character);
  fs.mkdirSync(output, { recursive: true });
  const cases = [
    ['qcq171', 'RifleAimingIdle', 3.05, 'Left', [0, 1, 0], .7, 'qcq-aim'],
    ['qbz95', 'RifleAimingIdle', .89, 'Left', [-1, -.6, .2], .65, 'qbz-wrist'],
    ['hanyang88', 'RifleAimingIdle', .89, 'Right', [1, 0, 0], .6, 'hanyang-aim'],
    ['hanyang88', 'RifleWalk', .23, 'Right', [1, 0, 0], .7, 'hanyang-walk'],
    ['qcq171', 'RifleIdle', 3.05, 'Left', [0, 1, 0], .7, 'qcq-idle'],
  ];
  for (const [weapon, motion, time, side, direction, distance, name] of cases) {
    const result = await page.evaluate(({ weapon, motion, time, side, direction, distance }) => {
      const { a, l, T, candidate, baseline } = qa;
      const use = config => { a.config = config; a.character = config.characters[a.characterId]; };
      use(candidate); poseAt(weapon, motion, time);
      const center = pos(side + 'Hand').lerp(pos(side + 'HandMiddle2'), .55);
      const dir = new T.Vector3(...direction).normalize().applyQuaternion(a.weapons.get(weapon).quaternion);
      l.renderer.setSize(800, 800, false); l.camera.aspect = 1; l.camera.updateProjectionMatrix();
      const background = l.scene.background; l.scene.background = new T.Color('#282f3b');
      const images = [];
      for (const [label, config] of [['before', baseline], ['after', candidate]]) {
        use(config); poseAt(weapon, motion, time);
        view(dir.toArray(), center.toArray(), distance);
        images.push({ label, png: l.renderer.domElement.toDataURL('image/png'),
          data: { weapon, motion, time, camera: l.camera.position.toArray(), target: center.toArray(), ...metrics() } });
      }
      l.scene.background = background;
      return images;
    }, { weapon, motion, time, side, direction, distance });
    for (const item of result) {
      fs.writeFileSync(path.join(output, item.label + '-' + name + '.png'), Buffer.from(item.png.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(output, item.label + '-' + name + '.json'), JSON.stringify(item.data, null, 2) + '\n');
    }
  }
  await browser.close();
  console.log(character + ': five matching-camera comparison pairs captured');
})().catch(e => { console.error(e); process.exit(1); });
