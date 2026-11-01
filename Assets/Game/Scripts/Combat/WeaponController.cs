using System;
using System.Collections.Generic;
using UnityEngine;

namespace Diandian
{
    public sealed class WeaponController : MonoBehaviour
    {
        sealed class AmmoState
        {
            public WeaponDefinition Definition;
            public int Magazine;
            public int Reserve;

            public AmmoState(WeaponDefinition definition)
            {
                Definition = definition;
                Magazine = definition.MagazineSize;
                Reserve = definition.ReserveAmmo;
            }
        }

        sealed class Tracer
        {
            public LineRenderer Line;
            public float ExpiresAt;
        }

        readonly Dictionary<string, AmmoState> weapons = new Dictionary<string, AmmoState>();
        readonly string[] slots = { "type56", "qsz92" };
        readonly Tracer[] tracers = new Tracer[48];
        GameSession game;
        Camera viewCamera;
        Transform muzzle;
        Material tracerMaterial;
        Material projectileMaterial;
        Material blastMaterial;
        int activeSlot;
        int nextTracer;
        float nextFireTime;
        float reloadStartedAt;
        bool fireHeld;
        bool firePressed;
        bool reloadPressed;

        AmmoState ActiveAmmo => weapons[slots[activeSlot]];
        public WeaponDefinition Current => ActiveAmmo.Definition;
        public int Magazine => ActiveAmmo.Magazine;
        public int Reserve => ActiveAmmo.Reserve;
        public bool IsReloading { get; private set; }
        public float ReloadProgress => IsReloading
            ? Mathf.Clamp01((Time.time - reloadStartedAt) / Current.ReloadSeconds)
            : 0f;
        public bool Aiming { get; private set; }
        public string PrimaryId => slots[0];
        public string SidearmId => slots[1];

        // 相机/枪模在展示层订阅此事件，应用后坐。
        public event Action Fired;

        public void Initialize(GameSession game, Camera camera, Transform muzzle, WeaponDefinition[] definitions)
        {
            this.game = game;
            viewCamera = camera;
            this.muzzle = muzzle;
            foreach (WeaponDefinition definition in definitions)
                weapons.Add(definition.Id, new AmmoState(definition));

            Shader effectShader = Resources.Load<Shader>("Weapons/CombatEffects");
            tracerMaterial = new Material(effectShader);
            projectileMaterial = new Material(effectShader);
            projectileMaterial.color = new Color(1f, 0.72f, 0.12f);
            blastMaterial = new Material(effectShader);

            for (int i = 0; i < tracers.Length; i++)
            {
                GameObject beam = new GameObject("Bullet trail");
                beam.transform.SetParent(transform, false);
                LineRenderer line = beam.AddComponent<LineRenderer>();
                line.sharedMaterial = tracerMaterial;
                line.positionCount = 2;
                line.useWorldSpace = true;
                line.startWidth = 0.025f;
                line.endWidth = 0.008f;
                line.startColor = new Color(1f, 0.88f, 0.45f, 0.85f);
                line.endColor = new Color(1f, 0.45f, 0.15f, 0.15f);
                line.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                line.receiveShadows = false;
                line.enabled = false;
                tracers[i] = new Tracer { Line = line };
            }
        }

        public void UpdateInput(bool fireHeld, bool firePressed, bool reloadPressed, bool aiming)
        {
            this.fireHeld = fireHeld;
            this.firePressed = firePressed;
            this.reloadPressed = reloadPressed;
            Aiming = aiming && game.IsGameplayActive && !IsReloading;
        }

        public void Tick()
        {
            foreach (Tracer tracer in tracers)
                if (tracer.Line.enabled && Time.time >= tracer.ExpiresAt)
                    tracer.Line.enabled = false;

            if (!game.IsGameplayActive)
            {
                Aiming = false;
                firePressed = false;
                reloadPressed = false;
                return;
            }

            if (IsReloading && ReloadProgress >= 1f)
            {
                int rounds = Mathf.Min(Current.MagazineSize - Magazine, Reserve);
                ActiveAmmo.Magazine += rounds;
                ActiveAmmo.Reserve -= rounds;
                IsReloading = false;
            }

            if (reloadPressed)
                BeginReload();

            bool wantsShot = Current.FireMode == FireMode.Automatic ? fireHeld : firePressed;
            if (wantsShot && !IsReloading && Time.time >= nextFireTime)
            {
                if (Magazine > 0)
                    Fire();
                else if (firePressed)
                    game.ShowMessage(Reserve > 0 ? "弹匣已空，按 R 换弹" : "弹药耗尽，寻找补给箱");
            }

            firePressed = false;
            reloadPressed = false;
        }

        public void Equip(string id)
        {
            WeaponDefinition definition = weapons[id].Definition;
            activeSlot = definition.Category == WeaponCategory.Pistol ? 1 : 0;
            slots[activeSlot] = id;
            IsReloading = false;
            Aiming = false;
            game.ShowMessage("已装备：" + definition.DisplayName);
        }

        public void SwitchSlot(int slot)
        {
            activeSlot = slot;
            IsReloading = false;
            Aiming = false;
        }

        public void RestoreLoadout(string primary, string sidearm)
        {
            Equip(primary);
            Equip(sidearm);
            SwitchSlot(0);
        }

        public void Refill()
        {
            foreach (AmmoState ammo in weapons.Values)
            {
                ammo.Magazine = ammo.Definition.MagazineSize;
                ammo.Reserve = ammo.Definition.ReserveAmmo;
            }
            IsReloading = false;
            game.ShowMessage("弹药补充完毕");
        }

        void BeginReload()
        {
            if (IsReloading || Magazine == Current.MagazineSize)
                return;
            if (Reserve == 0)
            {
                game.ShowMessage("没有备用弹药，寻找补给箱");
                return;
            }

            reloadStartedAt = Time.time;
            IsReloading = true;
            Aiming = false;
        }

        void Fire()
        {
            WeaponDefinition definition = Current;
            ActiveAmmo.Magazine--;
            // 所有武器共用射击时钟，切枪不会重置射速限制。
            nextFireTime = Time.time + 1f / definition.ShotsPerSecond;
            float spread = Mathf.Tan(definition.SpreadDegrees * (Aiming ? 0.22f : 1f) * Mathf.Deg2Rad);
            Ray cameraRay = viewCamera.ViewportPointToRay(new Vector3(0.5f, 0.5f, 0f));

            for (int pellet = 0; pellet < definition.Pellets; pellet++)
            {
                Vector2 offset = UnityEngine.Random.insideUnitCircle * spread;
                Vector3 direction = (cameraRay.direction + viewCamera.transform.right * offset.x
                    + viewCamera.transform.up * offset.y).normalized;
                Vector3 target = cameraRay.origin + direction * definition.Range;
                bool hit = Physics.Raycast(cameraRay.origin, direction, out RaycastHit impact,
                    definition.Range, CombatHit.PlayerShotMask, QueryTriggerInteraction.Ignore);
                if (hit)
                    target = impact.point;

                if (definition.Explosive)
                {
                    Vector3 projectileDirection = (target - muzzle.position).normalized;
                    Projectile.Launch(game, definition, muzzle.position, projectileDirection,
                        Faction.Resistance, projectileMaterial, blastMaterial);
                }
                else
                {
                    // 枪口与准星之间有近处掩体时，子弹先命中掩体。
                    Vector3 barrelRay = target - muzzle.position;
                    if (Physics.Raycast(muzzle.position, barrelRay.normalized, out RaycastHit obstruction,
                        barrelRay.magnitude, CombatHit.PlayerShotMask, QueryTriggerInteraction.Ignore))
                    {
                        target = obstruction.point;
                        CombatHit.Apply(obstruction.collider, definition.Damage, Faction.Resistance, target);
                    }
                    else if (hit)
                    {
                        CombatHit.Apply(impact.collider, definition.Damage, Faction.Resistance, target);
                    }
                    DrawTracer(muzzle.position, target);
                }
            }

            game.PlayShot(definition.Category == WeaponCategory.Heavy ? 0.65f
                : definition.Category == WeaponCategory.Pistol ? 1.2f : 0.9f);
            Fired?.Invoke();
        }

        void DrawTracer(Vector3 start, Vector3 end)
        {
            Tracer tracer = tracers[nextTracer];
            nextTracer = (nextTracer + 1) % tracers.Length;
            tracer.Line.SetPosition(0, start);
            tracer.Line.SetPosition(1, end);
            tracer.Line.enabled = true;
            tracer.ExpiresAt = Time.time + 0.055f;
        }

        void OnDestroy()
        {
            Destroy(tracerMaterial);
            Destroy(projectileMaterial);
            Destroy(blastMaterial);
        }
    }
}
