using UnityEngine;

namespace Diandian
{
    public sealed class CompanionAgent : MonoBehaviour
    {
        public CompanionStage Stage { get; private set; }
        public Health Health { get; private set; }
        public bool CanCooperate => (int)Stage < (int)CompanionStage.Fading && Time.time >= readyAt;
        public string StatusLabel => Stage switch
        {
            CompanionStage.Calibration => "点点 · 身体校准中",
            CompanionStage.Trust => "点点 · 可以配合",
            CompanionStage.Injured => "点点 · 左肩受损",
            CompanionStage.Reversal => "点点 · 等你开路",
            CompanionStage.Linked => "点点 · 接入协作",
            CompanionStage.Fading => "点点 · 陪她慢慢走",
            _ => "点点 · 留在她身边"
        };

        private GameSession game;
        private PlayerController player;
        private CharacterController controller;
        private Transform cooperationTarget;
        private float cooperateUntil;
        private float readyAt;
        private float verticalSpeed;

        public void Init(GameSession session, PlayerController leader, Health health)
        {
            game = session;
            player = leader;
            Health = health;
            gameObject.layer = 9;
            controller = gameObject.AddComponent<CharacterController>();
            controller.height = 1.75f;
            controller.radius = 0.3f;
            controller.center = Vector3.up * 0.875f;
            controller.stepOffset = 0.3f;
        }

        public void SetStage(CompanionStage stage)
        {
            Stage = stage;
            cooperationTarget = null;
            cooperateUntil = 0f;
            readyAt = 0f;
        }

        public bool Cooperate(Transform target)
        {
            if (!CanCooperate)
            {
                game.ShowMessage((int)Stage >= (int)CompanionStage.Fading ? "林叙：别急，我在这里。" : "点点：再给我一点时间。");
                return false;
            }
            cooperationTarget = target;
            cooperateUntil = Time.time + 4f;
            readyAt = Time.time + 5f;
            EnemyAgent enemy = game.NearestEnemy(transform.position);
            if (enemy != null)
                enemy.Suppress(4f);
            game.ShowMessage((int)Stage >= (int)CompanionStage.Injured ? "点点：我配合你。左边交给你了。" : "点点：听到两下了。一起。");
            game.ReportCooperation();
            return true;
        }

        private void Update()
        {
            if (!game.IsGameplayActive || Stage == CompanionStage.Silent)
                return;

            Vector3 destination = cooperationTarget != null && Time.time < cooperateUntil
                ? cooperationTarget.position - player.transform.forward * 1.2f
                : player.transform.position - player.transform.forward * 1.8f + player.transform.right * 1.2f;
            Vector3 offset = destination - transform.position;
            offset.y = 0f;
            float speed = (int)Stage >= (int)CompanionStage.Fading ? 3.8f : (int)Stage >= (int)CompanionStage.Injured ? 4.3f : 5.7f;
            Vector3 motion = Vector3.zero;
            if (offset.sqrMagnitude > 1f)
            {
                Vector3 desired = offset.normalized;
                Vector3 origin = transform.position + Vector3.up * 0.8f;
                int worldMask = ~((1 << 8) | (1 << 9) | (1 << 10));
                if (Physics.SphereCast(origin, 0.25f, desired, out RaycastHit obstruction, 1f,
                        worldMask, QueryTriggerInteraction.Ignore))
                {
                    Vector3 tangent = Vector3.Cross(Vector3.up, obstruction.normal).normalized;
                    desired = Vector3.Dot(tangent, offset) >= 0f ? tangent : -tangent;
                }
                motion = desired * Mathf.Min(speed, offset.magnitude * 2f);
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(desired),
                    9f * Time.deltaTime);
            }
            if (controller.isGrounded && verticalSpeed < 0f)
                verticalSpeed = -2f;
            verticalSpeed -= 20f * Time.deltaTime;
            controller.Move((motion + Vector3.up * verticalSpeed) * Time.deltaTime);
        }
    }
}
