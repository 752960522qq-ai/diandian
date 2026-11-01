using UnityEngine;

namespace Diandian
{
    [RequireComponent(typeof(Camera))]
    public sealed class ThirdPersonCamera : MonoBehaviour
    {
        private const int CameraMask = ~((1 << 8) | (1 << 9));
        private const float LookSensitivity = 0.12f;

        private PlayerController player;
        private GameSession game;
        private Camera view;
        private Vector3 pivot;
        private float yaw;
        private float pitch = 14f;
        private bool aiming;

        public Ray AimRay => view.ViewportPointToRay(new Vector3(0.5f, 0.5f));

        public void Init(PlayerController player, GameSession game)
        {
            this.player = player;
            this.game = game;
            view = GetComponent<Camera>();
            view.nearClipPlane = 0.08f;
            view.fieldOfView = 60f;
            yaw = player.transform.eulerAngles.y;
            pivot = player.AimOrigin.position;
            PositionCamera(true);
        }

        public void SetLook(Vector2 delta, bool aiming)
        {
            if (!game.IsGameplayActive)
                return;

            this.aiming = aiming;
            yaw += delta.x * LookSensitivity;
            pitch = Mathf.Clamp(pitch - delta.y * LookSensitivity, -25f, 65f);
        }

        private void LateUpdate()
        {
            if (!game.IsGameplayActive)
                return;

            float blend = 1f - Mathf.Exp(-18f * Time.deltaTime);
            pivot = Vector3.Lerp(pivot, player.AimOrigin.position, blend);
            view.fieldOfView = Mathf.Lerp(view.fieldOfView, aiming ? 43f : 60f, blend);
            PositionCamera(false);
        }

        private void PositionCamera(bool immediate)
        {
            Quaternion rotation = Quaternion.Euler(pitch, yaw, 0f);
            float distance = aiming ? 2.1f : 3.8f;
            Vector3 offset = rotation * new Vector3(aiming ? 0.6f : 0.55f, 0.1f, -distance);
            float clearDistance = offset.magnitude;
            Vector3 direction = offset / clearDistance;

            if (Physics.SphereCast(pivot, 0.2f, direction, out RaycastHit obstruction,
                    clearDistance, CameraMask, QueryTriggerInteraction.Ignore))
            {
                clearDistance = Mathf.Max(0.15f, obstruction.distance - 0.08f);
            }

            Vector3 destination = pivot + direction * clearDistance;
            // Moving inward immediately keeps the camera outside newly encountered walls.
            float blend = immediate || clearDistance < Vector3.Distance(transform.position, pivot)
                ? 1f
                : 1f - Mathf.Exp(-20f * Time.deltaTime);
            transform.SetPositionAndRotation(Vector3.Lerp(transform.position, destination, blend), rotation);
        }
    }
}
