using System;
using UnityEngine;

namespace Diandian
{
    public enum Faction { Resistance, Machine }

    public sealed class Health : MonoBehaviour
    {
        public float Current { get; private set; }
        public float Maximum { get; private set; }
        public bool IsAlive => Current > 0f;
        public Faction Faction { get; private set; }

        public event Action<Health> Died;

        public void Restore() => Current = Maximum;

        public void Init(float maximum, Faction faction)
        {
            Maximum = maximum;
            Current = maximum;
            Faction = faction;
        }

        public void TakeDamage(float amount, Faction source, Vector3 point)
        {
            if (!IsAlive || source == Faction)
                return;

            Current = Mathf.Max(0f, Current - amount);
            if (!IsAlive)
                Died?.Invoke(this);
        }
    }
}
