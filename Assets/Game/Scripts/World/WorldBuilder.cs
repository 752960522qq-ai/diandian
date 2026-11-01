using System.Collections.Generic;
using UnityEngine;

namespace Diandian
{
    public sealed class WorldBuilder : MonoBehaviour
    {
        public Transform ObjectiveTarget { get; private set; }
        public Vector3 ObjectivePosition => ObjectiveTarget.position;

        private GameSession game;
        private int chapterIndex;
        private int activeObjective = -1;
        private readonly Dictionary<string, Material> materials = new Dictionary<string, Material>();
        private Transform companionVisual;
        private Transform weaponVisual;
        private WeaponController weaponController;
        private readonly List<Transform> supplyCrates = new List<Transform>();
        private float weaponKick;

        public void Build(GameSession session, int index)
        {
            game = session;
            chapterIndex = index;
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = 0.009f;
            RenderSettings.fogColor = new Color(0.10f, 0.16f, 0.20f);
            RenderSettings.ambientLight = new Color(0.40f, 0.48f, 0.54f);
            Material surface = Resources.Load<Material>("UI/PrototypeSurface");
            AddMaterial("road", surface, new Color(0.12f, 0.16f, 0.18f));
            AddMaterial("concrete", surface, new Color(0.28f, 0.34f, 0.36f));
            AddMaterial("building", surface, new Color(0.16f, 0.22f, 0.27f));
            AddMaterial("metal", surface, new Color(0.13f, 0.19f, 0.21f));
            AddMaterial("cyan", surface, new Color(0.19f, 0.84f, 0.82f), true);
            AddMaterial("amber", surface, new Color(1.0f, 0.63f, 0.27f), true);
            AddMaterial("player", surface, new Color(0.30f, 0.38f, 0.30f));
            AddMaterial("companion", surface, new Color(0.64f, 0.74f, 0.75f));
            AddMaterial("enemy", surface, new Color(0.29f, 0.27f, 0.26f));

            var sun = new GameObject("Dawn · directional light").AddComponent<Light>();
            sun.transform.SetParent(transform);
            sun.type = LightType.Directional;
            sun.transform.rotation = Quaternion.Euler(38f, -32f, 0f);
            sun.color = new Color(1f, 0.86f, 0.7f);
            sun.intensity = 1.25f;
            sun.shadows = LightShadows.Soft;

            Box("Urban maintenance corridor", new Vector3(0, -0.3f, 36), new Vector3(32, 0.6f, 106), "road");
            Box("Left boundary", new Vector3(-15.5f, 2, 36), new Vector3(1, 4, 106), "building");
            Box("Right boundary", new Vector3(15.5f, 2, 36), new Vector3(1, 4, 106), "building");
            Box("Start boundary", new Vector3(0, 2, -16), new Vector3(32, 4, 1), "building");
            Box("End boundary", new Vector3(0, 2, 88), new Vector3(32, 4, 1), "building");

            for (int zone = 0; zone < 6; zone++)
            {
                float z = zone * 16f;
                Box("Left sidewalk", new Vector3(-12, 0.12f, z), new Vector3(4, 0.24f, 15.8f), "concrete");
                Box("Right sidewalk", new Vector3(12, 0.12f, z), new Vector3(4, 0.24f, 15.8f), "concrete");
                Box("Lane marking", new Vector3(0, 0.012f, z), new Vector3(0.12f, 0.018f, 6), "amber", false);
                Box("Cover · left", new Vector3(-5.5f, 0.65f, z + 4), new Vector3(3.2f, 1.3f, 1.1f), "concrete");
                Box("Cover · right", new Vector3(5.5f, 0.65f, z + 9), new Vector3(3.2f, 1.3f, 1.1f), "metal");
                Box("Drain", new Vector3(-9, 0.02f, z + 2), new Vector3(0.6f, 0.03f, 3), "metal", false);
                Box("Service light", new Vector3(-13.7f, 2.6f, z), new Vector3(0.12f, 0.25f, 0.7f), "cyan", false);
                Box("Power conduit", new Vector3(14.5f, 2.7f, z), new Vector3(0.14f, 0.14f, 15), "metal", false);
                GameObject supply = Box("Supply crate · E", new Vector3(-9, 0.5f, z + 8),
                    new Vector3(1.1f, 1, 0.8f), "amber");
                supplyCrates.Add(supply.transform);
                for (int side = -1; side <= 1; side += 2)
                {
                    float height = 10 + (zone * 7 + index * 3) % 11;
                    Box("City silhouette", new Vector3(side * 21, height / 2, z),
                        new Vector3(10, height, 13), "building", false);
                    for (int floor = 1; floor < height / 3; floor++)
                        Box("Window strip", new Vector3(side * 15.9f, floor * 3, z),
                            new Vector3(0.08f, 0.45f, 8), floor % 3 == 0 ? "amber" : "cyan", false);
                }
            }
            BuildCampObjects();
        }

        public Camera CreateCamera()
        {
            var camera = new GameObject("Shoulder Camera").AddComponent<Camera>();
            camera.transform.SetParent(transform);
            camera.tag = "MainCamera";
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = RenderSettings.fogColor;
            camera.farClipPlane = 220f;
            camera.allowHDR = true;
            camera.gameObject.AddComponent<AudioListener>();
            return camera;
        }

        public PlayerController CreatePlayer(Camera view)
        {
            GameObject actor = ActorRoot("林叙", new Vector3(0, 0.15f, 0));
            Health health = actor.AddComponent<Health>();
            health.Init(120, Faction.Resistance);
            PlayerController player = actor.AddComponent<PlayerController>();
            player.Init(game, view, health);
            player.SetVisual(BuildPerson(actor.transform, "player", 8));
            return player;
        }

        public CompanionAgent CreateCompanion(PlayerController player)
        {
            GameObject actor = ActorRoot("点点 · independent local deployment", new Vector3(2, 0.15f, -1));
            Health health = actor.AddComponent<Health>();
            health.Init(100, Faction.Resistance);
            CompanionAgent companion = actor.AddComponent<CompanionAgent>();
            companion.Init(game, player, health);
            companionVisual = BuildPerson(actor.transform, "companion", 9);
            return companion;
        }

        public Transform CreateWeaponVisual(PlayerController player)
        {
            var pivot = new GameObject("Geometric weapon placeholder").transform;
            pivot.SetParent(player.AimOrigin, false);
            pivot.localPosition = new Vector3(0.28f, -0.15f, 0.25f);
            var body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.name = "Receiver";
            body.transform.SetParent(pivot, false);
            body.transform.localScale = new Vector3(0.13f, 0.18f, 0.65f);
            body.GetComponent<Renderer>().sharedMaterial = materials["metal"];
            Destroy(body.GetComponent<Collider>());
            body.layer = 2;
            weaponVisual = body.transform;
            var muzzle = new GameObject("Muzzle").transform;
            muzzle.SetParent(pivot, false);
            muzzle.localPosition = Vector3.forward * 0.65f;
            return muzzle;
        }

        public void ActivateObjective(ObjectiveData objective, int index, int remainingEnemies)
        {
            if (index == activeObjective) return;
            activeObjective = index;
            if (ObjectiveTarget != null) Destroy(ObjectiveTarget.gameObject);
            float x = index % 2 == 0 ? -2.5f : 3f;
            Vector3 position = new Vector3(x, 0, 10f + index * 14f);
            if (objective.Id == "stay_here") position = game.Companion.transform.position;
            ObjectiveTarget = new GameObject("Objective · " + objective.Id).transform;
            ObjectiveTarget.SetParent(transform);
            ObjectiveTarget.position = position;
            MakeBeacon(ObjectiveTarget, objective.Kind);
            if (objective.Kind == ObjectiveKind.Eliminate)
            {
                for (int i = 0; i < remainingEnemies; i++)
                {
                    Vector3 spawn = position + new Vector3((i % 3 - 1) * 4f, 0.1f, 5 + i / 3 * 3);
                    CreateEnemy(spawn, i);
                }
            }
            if (objective.Kind == ObjectiveKind.Interact || objective.Kind == ObjectiveKind.Cooperate)
            {
                Box("Physical control panel", position + new Vector3(1.2f, 0.8f, 0),
                    new Vector3(0.55f, 1.6f, 0.45f), "metal");
                Box("Offline interface", position + new Vector3(1.2f, 1.25f, -0.25f),
                    new Vector3(0.34f, 0.3f, 0.04f), "cyan", false);
            }
            bool embodied = game.Chapter.Id != "prologue" && game.Chapter.Id != "epilogue" &&
                (game.Chapter.Id != "ch01" || index >= 2);
            companionVisual.gameObject.SetActive(embodied);
        }

        public void BindWeaponVisual(WeaponController weapons)
        {
            weaponController = weapons;
            weaponController.Fired += OnFired;
        }

        private void OnFired() => weaponKick = 1f;

        private void LateUpdate()
        {
            if (weaponController == null) return;
            weaponKick = Mathf.MoveTowards(weaponKick, 0, Time.deltaTime * 9);
            WeaponCategory category = weaponController.Current.Category;
            float length = category == WeaponCategory.Pistol ? 0.3f : category == WeaponCategory.Sniper ? 1f :
                category == WeaponCategory.Heavy ? 0.9f : 0.65f;
            weaponVisual.localScale = new Vector3(category == WeaponCategory.Heavy ? 0.22f : 0.13f, 0.18f, length);
            weaponVisual.localPosition = Vector3.back * weaponKick * 0.09f;
            weaponVisual.localRotation = Quaternion.Euler(-weaponKick * 9, 0, 0);
        }

        public bool NearSupply(Vector3 position)
        {
            foreach (Transform crate in supplyCrates)
                if (crate.gameObject.activeSelf && (crate.position - position).sqrMagnitude < 7f) return true;
            return false;
        }

        public void UseSupply(Vector3 position)
        {
            foreach (Transform crate in supplyCrates)
                if (crate.gameObject.activeSelf && (crate.position - position).sqrMagnitude < 7f)
                {
                    crate.gameObject.SetActive(false);
                    return;
                }
        }

        private void CreateEnemy(Vector3 position, int number)
        {
            GameObject actor = ActorRoot("定序终端 · " + number, position);
            actor.layer = 10;
            actor.AddComponent<Health>();
            BuildPerson(actor.transform, "enemy", 10);
            EnemyKind kind = number == 0 && chapterIndex >= 3 ? EnemyKind.Heavy :
                number % 3 == 1 ? EnemyKind.Observer : number % 3 == 2 ? EnemyKind.Relay : EnemyKind.Patrol;
            EnemyAgent enemy = actor.AddComponent<EnemyAgent>();
            enemy.Init(game, game.Player, kind);
            game.RegisterEnemy(enemy);
        }

        private Transform BuildPerson(Transform actor, string material, int layer)
        {
            Transform visual = new GameObject("Prototype body · replace with rigged model").transform;
            visual.SetParent(actor, false);
            GameObject body = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.transform.SetParent(visual, false);
            body.transform.localPosition = Vector3.up * 0.9f;
            body.transform.localScale = new Vector3(0.56f, 0.75f, 0.44f);
            body.GetComponent<Renderer>().sharedMaterial = materials[material];
            Destroy(body.GetComponent<Collider>());
            body.layer = layer;
            GameObject visor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            visor.transform.SetParent(visual, false);
            visor.transform.localPosition = new Vector3(0, 1.48f, 0.23f);
            visor.transform.localScale = new Vector3(0.32f, 0.09f, 0.05f);
            visor.GetComponent<Renderer>().sharedMaterial = materials[material == "enemy" ? "amber" : "cyan"];
            Destroy(visor.GetComponent<Collider>());
            visor.layer = layer;
            return visual;
        }

        private GameObject ActorRoot(string name, Vector3 position)
        {
            GameObject actor = new GameObject(name);
            actor.transform.SetParent(transform);
            actor.transform.position = position;
            return actor;
        }

        private void BuildCampObjects()
        {
            Box("Workbench", new Vector3(-9, 0.6f, -4), new Vector3(3, 1.2f, 1.4f), "metal");
            Box("Memory whiteboard", new Vector3(-11, 1.7f, -6), new Vector3(3, 1.8f, 0.14f), "companion");
            for (int i = 0; i < 2; i++)
            {
                Box("Two chairs · " + i, new Vector3(6 + i * 1.8f, 0.5f, -3), new Vector3(0.8f, 1, 0.8f), "concrete");
                Box("Chair back", new Vector3(6 + i * 1.8f, 1.0f, -3.4f), new Vector3(0.8f, 0.8f, 0.15f), "concrete");
            }
        }

        private void MakeBeacon(Transform target, ObjectiveKind kind)
        {
            var beam = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            beam.name = "Current objective beacon";
            beam.transform.SetParent(target, false);
            beam.transform.localPosition = Vector3.up * 2;
            beam.transform.localScale = new Vector3(0.12f, 2, 0.12f);
            beam.GetComponent<Renderer>().sharedMaterial = materials[kind == ObjectiveKind.Eliminate ? "amber" : "cyan"];
            Destroy(beam.GetComponent<Collider>());
            var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ring.name = "Interaction radius";
            ring.transform.SetParent(target, false);
            ring.transform.localPosition = Vector3.up * 0.025f;
            ring.transform.localScale = new Vector3(2, 0.02f, 2);
            ring.GetComponent<Renderer>().sharedMaterial = materials[kind == ObjectiveKind.Eliminate ? "amber" : "cyan"];
            Destroy(ring.GetComponent<Collider>());
        }

        private void AddMaterial(string key, Material template, Color color, bool emissive = false)
        {
            Material material = new Material(template) { color = color, name = key };
            if (emissive)
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", color * 1.25f);
            }
            materials.Add(key, material);
        }

        private GameObject Box(string name, Vector3 position, Vector3 size, string material, bool collision = true)
        {
            GameObject box = GameObject.CreatePrimitive(PrimitiveType.Cube);
            box.name = name;
            box.transform.SetParent(transform);
            box.transform.position = position;
            box.transform.localScale = size;
            box.GetComponent<Renderer>().sharedMaterial = materials[material];
            if (!collision) Destroy(box.GetComponent<Collider>());
            return box;
        }

        private void OnDestroy()
        {
            foreach (Material material in materials.Values) Destroy(material);
        }
    }
}
