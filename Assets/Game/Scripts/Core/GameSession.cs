using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Diandian
{
    [DefaultExecutionOrder(-50)]
    public sealed class GameSession : MonoBehaviour
    {
        public GameMode Mode { get; private set; }
        public ChapterDefinition Chapter => Chapters[chapterIndex];
        public ObjectiveTracker Objectives { get; private set; }
        public PlayerController Player { get; private set; }
        public CompanionAgent Companion { get; private set; }
        public WeaponController Weapons { get; private set; }
        public WeaponDefinition[] WeaponDefinitions { get; private set; }
        public ChapterDefinition[] Chapters { get; private set; }
        public bool IsGameplayActive => Mode == GameMode.Playing;
        public bool HasSave => CheckpointStore.Exists;
        public string Message => Time.unscaledTime < messageUntil ? message : "";
        public string DialogueLine => dialogueLines[dialogueIndex];
        public string InteractionHint { get; private set; } = "";

        private readonly List<EnemyAgent> enemies = new List<EnemyAgent>();
        private int chapterIndex;
        private WorldBuilder world;
        private ThirdPersonCamera shoulderCamera;
        private string message = "";
        private float messageUntil;
        private string[] dialogueLines = Array.Empty<string>();
        private int dialogueIndex;
        private Action dialogueFinished;
        private AudioSource sound;
        private AudioClip shotSound;

        public void Initialize()
        {
            WeaponDefinitions = Resources.LoadAll<WeaponDefinition>("Weapons");
            Array.Sort(WeaponDefinitions, (a, b) => a.Order.CompareTo(b.Order));
            Chapters = CampaignCatalog.Load();
            sound = gameObject.AddComponent<AudioSource>();
            shotSound = CreateShotSound();
            gameObject.AddComponent<GameHud>().Init(this);
            Physics.IgnoreLayerCollision(8, 9);
            BuildChapter(0, 0, 0);
            SetMode(GameMode.Menu);
        }

        private void Update()
        {
            Keyboard keyboard = Keyboard.current;
            Mouse mouse = Mouse.current;
            if (keyboard.escapeKey.wasPressedThisFrame)
            {
                if (Mode == GameMode.Playing) SetMode(GameMode.Paused);
                else if (Mode == GameMode.Paused || Mode == GameMode.Armory) Resume();
            }
            if (!IsGameplayActive) return;
            if (keyboard.tabKey.wasPressedThisFrame) { OpenArmory(); return; }

            Vector2 movement = new Vector2(
                (keyboard.dKey.isPressed ? 1 : 0) - (keyboard.aKey.isPressed ? 1 : 0),
                (keyboard.wKey.isPressed ? 1 : 0) - (keyboard.sKey.isPressed ? 1 : 0));
            bool aiming = mouse.rightButton.isPressed;
            Vector2 look = mouse.delta.ReadValue();
            shoulderCamera.SetLook(look, aiming);
            Player.SetInput(movement, look, keyboard.leftShiftKey.isPressed,
                keyboard.leftCtrlKey.isPressed, keyboard.spaceKey.wasPressedThisFrame, aiming);
            if (keyboard.digit1Key.wasPressedThisFrame) Weapons.SwitchSlot(0);
            if (keyboard.digit2Key.wasPressedThisFrame) Weapons.SwitchSlot(1);
            Weapons.UpdateInput(mouse.leftButton.isPressed, mouse.leftButton.wasPressedThisFrame,
                keyboard.rKey.wasPressedThisFrame, aiming);
            Weapons.Tick();

            UpdateObjectiveInput(keyboard);
            if (keyboard.f5Key.wasPressedThisFrame)
            {
                SaveCheckpoint();
                ShowMessage("检查点已保存。继续游戏会从当前任务段开始。");
            }
        }

        private void UpdateObjectiveInput(Keyboard keyboard)
        {
            InteractionHint = "";
            if (Objectives.IsComplete) return;
            ObjectiveData objective = Objectives.Current;
            float distance = Vector3.Distance(Player.transform.position, world.ObjectivePosition);
            if (world.NearSupply(Player.transform.position) && distance >= 4f)
            {
                InteractionHint = "E  ·  使用补给箱，补充弹药与生命";
                if (keyboard.eKey.wasPressedThisFrame)
                {
                    world.UseSupply(Player.transform.position);
                    Weapons.Refill();
                    Player.Health.Restore();
                }
            }
            if (objective.Kind == ObjectiveKind.Reach && distance < 2.5f)
            {
                CompleteInteraction(objective);
                return;
            }
            if (distance < 4f)
            {
                if (objective.Kind == ObjectiveKind.Interact)
                {
                    InteractionHint = "E  ·  " + objective.Description;
                    if (keyboard.eKey.wasPressedThisFrame) CompleteInteraction(objective);
                }
                else if (objective.Kind == ObjectiveKind.Cooperate)
                    InteractionHint = "Q  ·  两拍提示，一起处理";
            }
            else if (objective.Kind != ObjectiveKind.Eliminate && InteractionHint.Length == 0)
                InteractionHint = "前往青色标记  ·  " + Mathf.CeilToInt(distance) + " m";

            if (keyboard.qKey.wasPressedThisFrame)
                Companion.Cooperate(distance < 4f ? world.ObjectiveTarget : Player.transform);
        }

        private void CompleteInteraction(ObjectiveData objective)
        {
            if (!string.IsNullOrEmpty(objective.InteractionLine)) ShowMessage(objective.InteractionLine);
            Objectives.Report(objective.Kind, objective.Id);
        }

        public void ReportCooperation()
        {
            if (Objectives.IsComplete) return;
            if (Objectives.Current.Kind == ObjectiveKind.Cooperate &&
                Vector3.Distance(Player.transform.position, world.ObjectivePosition) < 4f)
                CompleteInteraction(Objectives.Current);
        }

        public void EnemyDefeated(EnemyAgent enemy)
        {
            enemies.Remove(enemy);
            if (!Objectives.IsComplete)
            {
                ObjectiveData objective = Objectives.Current;
                if (objective.Kind == ObjectiveKind.Eliminate && Objectives.Progress + 1 >= objective.RequiredCount)
                    ShowMessage(objective.InteractionLine);
                Objectives.Report(ObjectiveKind.Eliminate, "hostile");
            }
        }

        public EnemyAgent NearestEnemy(Vector3 position)
        {
            EnemyAgent nearest = null;
            float nearestDistance = 28f * 28f;
            foreach (EnemyAgent enemy in enemies)
            {
                if (!enemy.Health.IsAlive) continue;
                float distance = (enemy.transform.position - position).sqrMagnitude;
                if (distance < nearestDistance) { nearest = enemy; nearestDistance = distance; }
            }
            return nearest;
        }

        public void RegisterEnemy(EnemyAgent enemy) => enemies.Add(enemy);

        public void StartNewGame() => StartChapter(0);

        public void OpenChapter(int index) => StartChapter(index);

        private void StartChapter(int index)
        {
            BuildChapter(index, 0, 0);
            SaveCheckpoint();
            BeginDialogue(Chapter.OpeningLines, () => SetMode(GameMode.Playing));
        }

        public void ContinueGame()
        {
            CheckpointData data = CheckpointStore.Load();
            int index = Array.FindIndex(Chapters, chapter => chapter.Id == data.chapterId);
            BuildChapter(index, data.objectiveIndex, data.objectiveProgress);
            Weapons.RestoreLoadout(data.primaryWeaponId, data.sidearmWeaponId);
            Companion.SetStage(data.companionStage);
            SetMode(Objectives.IsComplete ? GameMode.ChapterComplete : GameMode.Playing);
            ShowMessage("已回到检查点。当前任务段的敌人与补给已重置。");
        }

        public void RetryCheckpoint() => ContinueGame();

        public void NextChapter()
        {
            if (chapterIndex + 1 < Chapters.Length) StartChapter(chapterIndex + 1);
            else SetMode(GameMode.Ending);
        }

        public void Resume() => SetMode(GameMode.Playing);
        public void OpenArmory() => SetMode(GameMode.Armory);
        public void CloseArmory()
        {
            SaveCheckpoint();
            SetMode(GameMode.Playing);
        }
        public void ReturnToMenu() => SetMode(GameMode.Menu);
        public void Quit() => Application.Quit();

        public void ShowMessage(string text)
        {
            message = text;
            messageUntil = Time.unscaledTime + 5f;
        }

        public void PlayShot(float pitch)
        {
            sound.pitch = pitch;
            sound.PlayOneShot(shotSound, 0.14f);
        }

        private void BuildChapter(int index, int objectiveIndex, int progress)
        {
            if (world != null)
            {
                world.gameObject.SetActive(false);
                Destroy(world.gameObject);
            }
            enemies.Clear();
            chapterIndex = index;
            Objectives = new ObjectiveTracker();
            Objectives.Initialize(Chapter);
            Objectives.Restore(objectiveIndex, progress);
            world = new GameObject("Chapter · " + Chapter.Title).AddComponent<WorldBuilder>();
            world.Build(this, chapterIndex);
            Camera view = world.CreateCamera();
            Player = world.CreatePlayer(view);
            Companion = world.CreateCompanion(Player);
            Companion.SetStage(Chapter.Stage);
            Weapons = Player.gameObject.AddComponent<WeaponController>();
            Weapons.Initialize(this, view, world.CreateWeaponVisual(Player), WeaponDefinitions);
            Weapons.Equip(Chapter.PrimaryWeaponId);
            world.BindWeaponVisual(Weapons);
            shoulderCamera = view.gameObject.AddComponent<ThirdPersonCamera>();
            shoulderCamera.Init(Player, this);
            Player.Health.Died += OnPlayerDied;
            Objectives.Changed += OnObjectiveChanged;
            Objectives.Completed += OnChapterCompleted;
            ActivateObjective();
            if (objectiveIndex > 0 && !Objectives.IsComplete)
            {
                Player.transform.position = world.ObjectivePosition - Vector3.forward * 5f;
                Companion.transform.position = Player.transform.position + Vector3.right * 2f;
                shoulderCamera.Init(Player, this);
            }
            ShowMessage("林叙与点点 · " + Chapter.DayLabel);
        }

        private void ActivateObjective()
        {
            if (Objectives.IsComplete) return;
            world.ActivateObjective(Objectives.Current, Objectives.CurrentIndex,
                Objectives.Current.RequiredCount - Objectives.Progress);
            if (Chapter.Id == "ch10")
                Companion.SetStage(Objectives.CurrentIndex >= Chapter.Objectives.Length - 1
                    ? CompanionStage.Silent : CompanionStage.Fading);
        }

        private void OnObjectiveChanged()
        {
            if (!Objectives.IsComplete) ActivateObjective();
            SaveCheckpoint();
        }

        private void OnChapterCompleted()
        {
            InteractionHint = "";
            BeginDialogue(Chapter.ClosingLines, () => SetMode(GameMode.ChapterComplete));
        }

        private void OnPlayerDied(Health health)
        {
            SetMode(GameMode.Defeat);
        }

        private void BeginDialogue(string[] lines, Action completed)
        {
            dialogueLines = lines;
            dialogueIndex = 0;
            dialogueFinished = completed;
            if (lines.Length == 0) { completed(); return; }
            SetMode(GameMode.Dialogue);
        }

        public void ContinueDialogue()
        {
            dialogueIndex++;
            if (dialogueIndex == dialogueLines.Length) dialogueFinished();
        }

        private void SaveCheckpoint()
        {
            CheckpointStore.Save(new CheckpointData
            {
                chapterId = Chapter.Id,
                chapterOrder = chapterIndex,
                objectiveIndex = Objectives.CurrentIndex,
                objectiveProgress = Objectives.Progress,
                primaryWeaponId = Weapons.PrimaryId,
                sidearmWeaponId = Weapons.SidearmId,
                companionStage = Companion.Stage
            });
        }

        private void SetMode(GameMode mode)
        {
            Mode = mode;
            bool playing = IsGameplayActive;
            Time.timeScale = playing ? 1f : 0f;
            Cursor.lockState = playing ? CursorLockMode.Locked : CursorLockMode.None;
            Cursor.visible = !playing;
        }

        private static AudioClip CreateShotSound()
        {
            const int count = 4410;
            float[] samples = new float[count];
            var random = new System.Random(27);
            for (int i = 0; i < count; i++)
            {
                float t = (float)i / count;
                samples[i] = (float)(random.NextDouble() * 2 - 1) * Mathf.Exp(-t * 18f)
                    + Mathf.Sin(t * 210f) * Mathf.Exp(-t * 28f) * 0.5f;
            }
            AudioClip clip = AudioClip.Create("Prototype shot", count, 1, 44100, false);
            clip.SetData(samples, 0);
            return clip;
        }

        private void OnDestroy()
        {
            Time.timeScale = 1f;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }
    }
}
