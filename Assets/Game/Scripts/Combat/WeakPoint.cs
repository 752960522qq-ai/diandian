using UnityEngine;

namespace Diandian
{
    public sealed class WeakPoint : MonoBehaviour
    {
        public Health Owner { get; private set; }
        public float Multiplier { get; private set; }

        public void Init(Health owner, float multiplier)
        {
            Owner = owner;
            Multiplier = multiplier;
        }
    }
}
