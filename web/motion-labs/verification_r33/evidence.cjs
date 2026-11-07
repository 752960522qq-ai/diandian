const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/codex/cua_node/lib/node_modules/playwright-core');
const fs = require('fs');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
  for (const ch of ['diandian', 'zhigeng']) {
    const p = b.contexts()[0].pages().find(p => p.url().includes(ch === 'diandian' ? 'diandian-classic-motion-lab' : 'zhigeng-motion-lab'));
    const shots = [
      ['hanyang88', 'RifleWalk', .32, 'front', 'hanyang-walk'],
      ['qcq171', 'RifleIdle', 4.39, 'top', 'qcq-idle'],
      ['qcq171', 'RifleAimingIdle', 1.45, 'side', 'qcq-aim'],
      ['qbu85', 'RifleIdle', 3.56, 'side', 'qbu-idle'],
      ['qbu85', 'RifleRun', .278, 'side', 'qbu-run'],
      ...(ch === 'zhigeng' ? [['type97hawk', 'RifleAimingIdle', 2.06, 'top', 'type97-aim'],
        ['type97hawk', 'RifleAimingIdle', 2.06, 'side', 'type97-side']] : [])
    ];
    fs.mkdirSync(__dirname + '/' + ch, { recursive: true });
    for (const [w, mo, t, angle, name] of shots) {
      const r = await p.evaluate(([w, mo, t, angle]) => {
        const { a, l, T } = qa, images = {}, data = {};
        a.config = qa.baseline; a.character = a.config.characters[a.characterId]; poseAt(w, mo, t);
        const gun = a.weapons.get(w);
        const dir = angle === 'front' ? new T.Vector3(0, 0, 1) : angle === 'top'
          ? new T.Vector3(0, 1, .1).normalize() : new T.Vector3(1, .1, .1).normalize().applyQuaternion(gun.quaternion);
        const center = angle === 'front' ? new T.Vector3(0, 1.22, 0) :
          pos('RightArm').lerp(pos('LeftHand'), .5);
        l.renderer.setSize(800, 800, false); l.camera.aspect = 1; l.camera.updateProjectionMatrix();
        const bg = l.scene.background; l.scene.background = new T.Color('#282f3b');
        for (const [name, config] of [['before', qa.baseline], ['after', qa.candidate]]) {
          a.config = config; a.character = config.characters[a.characterId]; poseAt(w, mo, t);
          view(dir.toArray(), center.toArray(), angle === 'top' ? 1.7 : 1.6);
          images[name] = l.renderer.domElement.toDataURL('image/png'); data[name] = metrics();
        }
        l.scene.background = bg; return { images, data };
      }, [w, mo, t, angle]);
      for (const [label, image] of Object.entries(r.images)) fs.writeFileSync(__dirname + '/' + ch + '/' + name + '-' + label + '.png', Buffer.from(image.split(',')[1], 'base64'));
      fs.writeFileSync(__dirname + '/' + ch + '/' + name + '.json', JSON.stringify(r.data, null, 2) + '\n');
    }
  }
  await b.close(); console.log('12 same-camera before/after pairs captured.');
})().catch(e => { console.error(e); process.exit(1); });
