using UnityEngine;

namespace Diandian
{
    public enum WeaponCategory { Pistol, Rifle, Sniper, Smg, Shotgun, Heavy }
    public enum FireMode { Semi, Automatic }

    [CreateAssetMenu(menuName = "点点滴滴/武器")]
    public sealed class WeaponDefinition : ScriptableObject
    {
        public string Id;
        public string DisplayName;
        public int Order;
        public WeaponCategory Category;
        public FireMode FireMode;
        public float Damage;
        public float ShotsPerSecond;
        public float ReloadSeconds;
        public float Range;
        public float SpreadDegrees;
        public int MagazineSize;
        public int ReserveAmmo;
        public int Pellets = 1;
        public bool Explosive;
        public float ProjectileSpeed;
        public float BlastRadius;
    }
}
