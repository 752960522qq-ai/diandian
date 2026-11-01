using UnityEngine;

namespace Diandian
{
    public static class CombatHit
    {
        // 玩家、同伴与枪口模型不遮挡玩家的第三人称射线。
        public const int PlayerShotMask = Physics.DefaultRaycastLayers & ~(1 << 8) & ~(1 << 9);

        public static bool Apply(Collider collider, float damage, Faction source, Vector3 point)
        {
            WeakPoint weakPoint = collider.GetComponentInParent<WeakPoint>();
            if (weakPoint != null)
            {
                Health owner = weakPoint.Owner;
                bool damaged = owner.IsAlive && owner.Faction != source;
                owner.TakeDamage(damage * weakPoint.Multiplier, source, point);
                return damaged;
            }

            Health health = collider.GetComponentInParent<Health>();
            if (health == null)
                return false;

            bool applied = health.IsAlive && health.Faction != source;
            health.TakeDamage(damage, source, point);
            return applied;
        }
    }
}
