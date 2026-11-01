using System.Collections.Generic;
using UnityEngine;

namespace Diandian
{
    public sealed class Projectile : MonoBehaviour
    {
        readonly HashSet<Health> damaged = new HashSet<Health>();
        readonly MaterialPropertyBlock properties = new MaterialPropertyBlock();
        GameSession game;
        WeaponDefinition definition;
        Faction source;
        Vector3 velocity;
        Material blastMaterial;
        MeshRenderer visual;
        TrailRenderer trail;
        float remainingLife;
        float explosionTime;
        bool exploding;

        public static void Launch(GameSession session, WeaponDefinition weapon, Vector3 position,
            Vector3 direction, Faction faction, Material projectileMaterial, Material explosionMaterial)
        {
            GameObject grenade = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            grenade.transform.SetParent(session.Player.transform.parent);
            grenade.name = weapon.DisplayName + "·榴弹";
            grenade.layer = 2;
            grenade.transform.position = position;
            grenade.transform.localScale = Vector3.one * 0.12f;
            Collider collider = grenade.GetComponent<Collider>();
            collider.enabled = false;
            Destroy(collider);

            Projectile projectile = grenade.AddComponent<Projectile>();
            projectile.game = session;
            projectile.definition = weapon;
            projectile.source = faction;
            projectile.velocity = direction * weapon.ProjectileSpeed;
            projectile.remainingLife = 5f;
            projectile.blastMaterial = explosionMaterial;
            projectile.visual = grenade.GetComponent<MeshRenderer>();
            projectile.visual.sharedMaterial = projectileMaterial;
            projectile.visual.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            projectile.visual.receiveShadows = false;
            projectile.trail = grenade.AddComponent<TrailRenderer>();
            projectile.trail.sharedMaterial = explosionMaterial;
            projectile.trail.time = 0.18f;
            projectile.trail.startWidth = 0.065f;
            projectile.trail.endWidth = 0f;
            projectile.trail.startColor = new Color(1f, 0.75f, 0.1f, 0.85f);
            projectile.trail.endColor = new Color(1f, 0.3f, 0.05f, 0f);
        }

        void Update()
        {
            if (!game.IsGameplayActive)
                return;

            if (exploding)
            {
                explosionTime += Time.deltaTime;
                float progress = explosionTime / 0.2f;
                transform.localScale = Vector3.one * definition.BlastRadius * Mathf.Lerp(0.25f, 2f, progress);
                properties.SetColor("_Color", new Color(1f, 0.38f, 0.06f, (1f - progress) * 0.45f));
                visual.SetPropertyBlock(properties);
                if (progress >= 1f)
                    Destroy(gameObject);
                return;
            }

            float delta = Time.deltaTime;
            velocity += Physics.gravity * delta;
            Vector3 movement = velocity * delta;
            if (Physics.SphereCast(transform.position, 0.08f, movement.normalized,
                out RaycastHit hit, movement.magnitude, CombatHit.PlayerShotMask, QueryTriggerInteraction.Ignore))
            {
                transform.position = hit.point + hit.normal * 0.1f;
                Detonate();
                return;
            }

            transform.position += movement;
            remainingLife -= delta;
            if (remainingLife <= 0f)
                Detonate();
        }

        void Detonate()
        {
            exploding = true;
            trail.emitting = false;
            visual.sharedMaterial = blastMaterial;
            Vector3 center = transform.position;
            Collider[] targets = Physics.OverlapSphere(center, definition.BlastRadius,
                CombatHit.PlayerShotMask, QueryTriggerInteraction.Ignore);

            foreach (Collider target in targets)
            {
                Health health = target.GetComponentInParent<Health>();
                if (health == null || health.Faction == source || !health.IsAlive || damaged.Contains(health))
                    continue;

                Vector3 point = target.ClosestPoint(center);
                Vector3 toTarget = point - center;
                if (Physics.Raycast(center, toTarget.normalized, out RaycastHit cover, toTarget.magnitude,
                    CombatHit.PlayerShotMask, QueryTriggerInteraction.Ignore)
                    && cover.collider.GetComponentInParent<Health>() != health)
                    continue;

                damaged.Add(health);
                float falloff = Mathf.Lerp(1f, 0.3f, Mathf.Clamp01(toTarget.magnitude / definition.BlastRadius));
                health.TakeDamage(definition.Damage * falloff, source, point);
            }
        }
    }
}
