using UnityEngine;

namespace Diandian
{
    public sealed class EnemyAgent : MonoBehaviour
    {
        public Health Health { get; private set; }
        public EnemyKind Kind { get; private set; }

        private GameSession game;
        private PlayerController player;
        private CharacterController controller;
        private Renderer sensor;
        private Material sensorMaterial;
        private Material lineMaterial;
        private LineRenderer tracer;
        private MaterialPropertyBlock sensorProperties;
        private float suppressedUntil;
        private float nextAttack;
        private float fireAt = -1f;
        private float tracerUntil;
        private float speed;
        private float damage;
        private float preferredRange;

        public void Init(GameSession session, PlayerController target, EnemyKind kind)
        {
            game = session;
            player = target;
            Kind = kind;
            gameObject.layer = 10;
            Health = GetComponent<Health>();
            float maximum = kind == EnemyKind.Heavy ? 300f : kind == EnemyKind.Relay ? 150f : 90f;
            Health.Init(maximum, Faction.Machine);
            Health.Died += OnDied;
            speed = kind == EnemyKind.Heavy ? 1.6f : kind == EnemyKind.Observer ? 3.1f : 2.5f;
            damage = kind == EnemyKind.Heavy ? 16f : 8f;
            preferredRange = kind == EnemyKind.Observer ? 17f : kind == EnemyKind.Heavy ? 11f : 9f;
            nextAttack = Time.time + Random.Range(0.9f, 2f);

            controller = gameObject.AddComponent<CharacterController>();
            controller.height = 1.8f;
            controller.radius = kind == EnemyKind.Heavy ? 0.6f : 0.35f;
            controller.center = Vector3.up * 0.9f;
            controller.stepOffset = 0.3f;

            GameObject lens = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            lens.name = "ExposedOptics";
            lens.layer = 10;
            lens.transform.SetParent(transform, false);
            lens.transform.localPosition = new Vector3(0f, 1.55f, 0.34f);
            lens.transform.localScale = Vector3.one * 0.3f;
            lens.AddComponent<WeakPoint>().Init(Health, 3f);
            sensor = lens.GetComponent<Renderer>();
            sensorMaterial = new Material(Shader.Find("Standard"));
            sensorMaterial.EnableKeyword("_EMISSION");
            sensor.sharedMaterial = sensorMaterial;
            sensorProperties = new MaterialPropertyBlock();

            tracer = new GameObject("AttackTrace").AddComponent<LineRenderer>();
            tracer.transform.SetParent(transform, false);
            tracer.positionCount = 2;
            tracer.startWidth = 0.025f;
            tracer.endWidth = 0.01f;
            lineMaterial = new Material(Resources.Load<Shader>("Weapons/CombatEffects"));
            tracer.sharedMaterial = lineMaterial;
            tracer.startColor = new Color(1f, 0.3f, 0.1f);
            tracer.endColor = new Color(1f, 0.65f, 0.25f);
            tracer.enabled = false;
        }

        public void Suppress(float seconds)
        {
            suppressedUntil = Mathf.Max(suppressedUntil, Time.time + seconds);
            fireAt = -1f;
        }

        private void Update()
        {
            if (!game.IsGameplayActive || !Health.IsAlive)
                return;
            tracer.enabled = Time.time < tracerUntil;
            if (Time.time < suppressedUntil)
            {
                SetSensor(new Color(0.15f, 0.8f, 1f));
                return;
            }

            Vector3 offset = player.transform.position - transform.position;
            offset.y = 0f;
            Vector3 facing = offset.normalized;
            if (offset.sqrMagnitude > 0.01f)
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(facing),
                    5f * Time.deltaTime);
            bool visible = HasLineOfSight();
            if (offset.magnitude > preferredRange || !visible)
                MoveToward(facing);
            else
                controller.Move(Vector3.down * (2f * Time.deltaTime));

            if (fireAt >= 0f)
            {
                SetSensor(new Color(1f, 0.6f, 0.05f));
                if (Time.time >= fireAt)
                {
                    if (visible && player.Health.IsAlive)
                    {
                        Vector3 hit = player.AimOrigin.position;
                        player.Health.TakeDamage(damage, Faction.Machine, hit);
                        tracer.SetPosition(0, sensor.transform.position);
                        tracer.SetPosition(1, hit);
                        tracerUntil = Time.time + 0.09f;
                    }
                    fireAt = -1f;
                    nextAttack = Time.time + (Kind == EnemyKind.Heavy ? 2f : 1.5f);
                }
            }
            else
            {
                SetSensor(new Color(0.95f, 0.12f, 0.06f));
                if (visible && offset.magnitude < 32f && Time.time >= nextAttack)
                    fireAt = Time.time + (Kind == EnemyKind.Observer ? 0.8f : 0.55f);
            }
        }

        private void MoveToward(Vector3 desired)
        {
            int mask = ~((1 << 8) | (1 << 9) | (1 << 10));
            Vector3 origin = transform.position + Vector3.up * 0.9f;
            if (Physics.SphereCast(origin, controller.radius, desired, out RaycastHit hit, 1.2f,
                    mask, QueryTriggerInteraction.Ignore))
            {
                Vector3 right = Quaternion.Euler(0f, 65f, 0f) * desired;
                Vector3 left = Quaternion.Euler(0f, -65f, 0f) * desired;
                bool rightBlocked = Physics.SphereCast(origin, controller.radius, right, out _, 1.2f,
                    mask, QueryTriggerInteraction.Ignore);
                desired = rightBlocked ? left : right;
            }
            controller.Move((desired * speed + Vector3.down * 2f) * Time.deltaTime);
        }

        private bool HasLineOfSight()
        {
            Vector3 origin = sensor.transform.position;
            Vector3 offset = player.AimOrigin.position - origin;
            int mask = ~((1 << 9) | (1 << 10));
            return Physics.Raycast(origin, offset.normalized, out RaycastHit hit, offset.magnitude + 0.2f,
                       mask, QueryTriggerInteraction.Ignore) && hit.collider.GetComponentInParent<PlayerController>() == player;
        }

        private void SetSensor(Color color)
        {
            sensorProperties.SetColor("_Color", color);
            sensorProperties.SetColor("_EmissionColor", color * 1.7f);
            sensor.SetPropertyBlock(sensorProperties);
        }

        private void OnDied(Health health)
        {
            controller.enabled = false;
            sensor.GetComponent<Collider>().enabled = false;
            SetSensor(Color.gray);
            tracer.enabled = false;
            transform.rotation = Quaternion.Euler(0f, transform.eulerAngles.y, 76f);
            game.EnemyDefeated(this);
            enabled = false;
        }

        private void OnDestroy()
        {
            Health.Died -= OnDied;
            Destroy(sensorMaterial);
            Destroy(lineMaterial);
        }
    }
}
