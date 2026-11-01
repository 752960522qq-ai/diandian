using UnityEngine;

namespace Diandian
{
    public sealed class PlayerController : MonoBehaviour
    {
        public Health Health { get; private set; }
        public Transform AimOrigin { get; private set; }
        public bool IsAiming { get; private set; }

        private GameSession game;
        private Camera view;
        private CharacterController controller;
        private Vector2 moveInput;
        private bool sprinting;
        private bool crouching;
        private bool jumpRequested;
        private float verticalSpeed;
        private Transform bodyVisual;

        public void SetVisual(Transform visual) => bodyVisual = visual;

        public void Init(GameSession session, Camera camera, Health health)
        {
            game = session;
            view = camera;
            Health = health;
            gameObject.layer = 8;
            controller = gameObject.AddComponent<CharacterController>();
            controller.height = 1.8f;
            controller.radius = 0.32f;
            controller.center = Vector3.up * 0.9f;
            controller.stepOffset = 0.3f;
            controller.slopeLimit = 48f;
            AimOrigin = new GameObject("AimOrigin").transform;
            AimOrigin.SetParent(transform, false);
            AimOrigin.localPosition = Vector3.up * 1.5f;
        }

        public void SetInput(Vector2 movement, Vector2 look, bool sprint, bool crouch, bool jump, bool aiming)
        {
            moveInput = movement;
            sprinting = sprint;
            crouching = crouch;
            jumpRequested |= jump;
            IsAiming = aiming;
        }

        private void Update()
        {
            if (!game.IsGameplayActive || !Health.IsAlive)
            {
                jumpRequested = false;
                return;
            }

            float height = crouching ? 1.2f : 1.8f;
            if (height > controller.height && Physics.CheckSphere(transform.position + Vector3.up * 1.5f,
                    0.28f, ~((1 << 8) | (1 << 9)), QueryTriggerInteraction.Ignore))
                height = 1.2f;
            controller.height = height;
            controller.center = Vector3.up * (height * 0.5f);
            bodyVisual.localScale = new Vector3(1f, height / 1.8f, 1f);
            AimOrigin.localPosition = Vector3.up * (height - 0.3f);

            Vector3 forward = Vector3.ProjectOnPlane(view.transform.forward, Vector3.up).normalized;
            Vector3 right = Vector3.Cross(Vector3.up, forward);
            Vector3 direction = forward * moveInput.y + right * moveInput.x;
            direction = Vector3.ClampMagnitude(direction, 1f);
            float speed = height < 1.5f ? 2.2f : IsAiming ? 2.9f : sprinting ? 6.4f : 4.2f;
            if (controller.isGrounded && verticalSpeed < 0f)
                verticalSpeed = -2f;
            if (jumpRequested && controller.isGrounded && height > 1.5f)
                verticalSpeed = 6.2f;
            jumpRequested = false;
            verticalSpeed -= 20f * Time.deltaTime;
            controller.Move((direction * speed + Vector3.up * verticalSpeed) * Time.deltaTime);

            Vector3 facing = IsAiming ? forward : direction;
            if (facing.sqrMagnitude > 0.01f)
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(facing),
                    14f * Time.deltaTime);
        }
    }
}
