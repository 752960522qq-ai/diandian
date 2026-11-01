using System;
using UnityEngine;

namespace Diandian
{
    public sealed class GameHud : MonoBehaviour
    {
        private static readonly Color Ink = new Color(0.025f, 0.055f, 0.075f, 0.96f);
        private static readonly Color Panel = new Color(0.045f, 0.09f, 0.115f, 0.94f);
        private static readonly Color Line = new Color(0.21f, 0.35f, 0.39f, 0.8f);
        private static readonly Color Paper = new Color(0.94f, 0.94f, 0.88f);
        private static readonly Color Muted = new Color(0.59f, 0.7f, 0.71f);
        private static readonly Color Cyan = new Color(0.34f, 0.86f, 0.82f);
        private static readonly Color Amber = new Color(1f, 0.73f, 0.36f);
        private static readonly string[] CategoryNames = { "手枪", "步枪", "狙击枪", "冲锋枪", "霰弹枪", "重型武器" };

        private GameSession game;
        private GUIStyle small;
        private GUIStyle body;
        private GUIStyle heading;
        private GUIStyle large;
        private GUIStyle title;
        private GUIStyle button;
        private GUIStyle number;
        private GUIStyle right;
        private GUIStyle centered;
        private bool chapterPicker;
        private WeaponDefinition selectedWeapon;

        public void Init(GameSession session)
        {
            game = session;
            Font font = Resources.Load<Font>("UI/Chinese");
            small = Style(font, 17, Muted);
            body = Style(font, 23, Paper);
            heading = Style(font, 32, Paper);
            large = Style(font, 49, Paper);
            title = Style(font, 88, Paper);
            number = Style(font, 47, Cyan);
            right = Style(font, 19, Muted, TextAnchor.UpperRight);
            centered = Style(font, 19, Paper, TextAnchor.MiddleCenter);
            button = Style(font, 22, Paper, TextAnchor.MiddleCenter);
            button.normal.background = Texture2D.whiteTexture;
            button.normal.textColor = Paper;
            button.hover.background = Texture2D.whiteTexture;
            button.hover.textColor = Cyan;
            button.active.background = Texture2D.whiteTexture;
            button.active.textColor = Color.white;
            button.padding = new RectOffset(18, 18, 8, 8);
        }

        private static GUIStyle Style(Font font, int size, Color color, TextAnchor alignment = TextAnchor.UpperLeft)
        {
            var style = new GUIStyle { font = font, fontSize = size, wordWrap = true, alignment = alignment };
            style.normal.textColor = color;
            return style;
        }

        private void OnGUI()
        {
            float scale = Mathf.Min(Screen.width / 1600f, Screen.height / 900f);
            GUI.matrix = Matrix4x4.TRS(new Vector3((Screen.width - 1600f * scale) * 0.5f,
                (Screen.height - 900f * scale) * 0.5f, 0f), Quaternion.identity, Vector3.one * scale);

            if (game.Mode == GameMode.Menu)
            {
                DrawMenu();
                return;
            }

            if (game.Mode == GameMode.Ending)
            {
                DrawEnding();
                return;
            }

            DrawHud();
            switch (game.Mode)
            {
                case GameMode.Paused: DrawPause(); break;
                case GameMode.Armory: DrawArmory(); break;
                case GameMode.Dialogue: DrawDialogue(); break;
                case GameMode.Defeat: DrawDefeat(); break;
                case GameMode.ChapterComplete: DrawChapterComplete(); break;
            }
        }

        private void DrawMenu()
        {
            Fill(new Rect(0, 0, 1600, 900), Ink);
            if (chapterPicker) { DrawChapterPicker(); return; }
            Fill(new Rect(1040, 0, 560, 900), new Color(0.055f, 0.12f, 0.14f));
            Fill(new Rect(1090, 142, 2, 540), Line);
            Fill(new Rect(1130, 185, 260, 365), new Color(0.1f, 0.2f, 0.22f));
            Fill(new Rect(1220, 290, 260, 365), new Color(0.075f, 0.155f, 0.18f));
            Fill(new Rect(1160, 485, 270, 2), Cyan);
            Label(105, 80, 800, 32, small, "DIANDIAN DIDI     /     第三人称叙事射击");
            Label(97, 165, 850, 130, title, "点点滴滴");
            Label(105, 310, 700, 55, heading, "刺瑰行动");
            Label(108, 395, 690, 90, body, "从一次并肩突围开始，\n把那些微不足道的小事留在身边。");
            if (Button(new Rect(108, 535, 360, 62), "开始新的旅程", true)) game.StartNewGame();
            GUI.enabled = game.HasSave;
            if (Button(new Rect(108, 612, 360, 55), "继续上次的进度")) game.ContinueGame();
            GUI.enabled = true;
            if (Button(new Rect(490, 535, 270, 62), "章节试演")) chapterPicker = true;
            if (Button(new Rect(490, 612, 270, 55), "退出游戏")) game.Quit();
            Label(108, 750, 800, 70, small, "Unity 6 · 框架原型\n12 章短流程 / 点点协作 / 六类 18 把枪械");
            Label(1118, 705, 350, 110, body, "“按下协作键，\n她就会来。”");
        }

        private void DrawChapterPicker()
        {
            Shade();
            Frame(new Rect(90, 65, 1420, 770));
            Label(130, 95, 1050, 50, heading, "章节试演");
            Label(130, 150, 1150, 40, small, "每章为可操作的短流程，展示任务与同伴状态；完整关卡与演出仍待制作。");
            for (int i = 0; i < game.Chapters.Length; i++)
            {
                ChapterDefinition chapter = game.Chapters[i];
                int column = i % 3;
                int row = i / 3;
                var rect = new Rect(130 + column * 445, 215 + row * 130, 420, 110);
                if (Button(rect, chapter.Title + "\n" + chapter.DayLabel))
                {
                    chapterPicker = false;
                    game.OpenChapter(i);
                }
            }
            if (Button(new Rect(1290, 100, 170, 45), "返回")) chapterPicker = false;
        }

        private void DrawHud()
        {
            Fill(new Rect(38, 32, 560, 127), Panel);
            Fill(new Rect(38, 32, 4, 127), Cyan);
            Label(59, 46, 500, 30, small, game.Chapter.DayLabel + "  /  " + game.Chapter.Title);
            string objective = game.Objectives.IsComplete ? "本章目标已完成" : game.Objectives.Current.Description;
            Label(59, 86, 500, 60, body, objective);
            if (!game.Objectives.IsComplete && game.Objectives.Current.RequiredCount > 1)
                Label(500, 121, 70, 30, right, game.Objectives.Progress + " / " + game.Objectives.Current.RequiredCount);

            Fill(new Rect(1210, 32, 352, 100), Panel);
            Label(1230, 48, 305, 30, small, "点点  /  同伴状态");
            Label(1230, 83, 305, 35, body, game.Companion.StatusLabel);

            Fill(new Rect(38, 745, 330, 116), Panel);
            Label(58, 763, 130, 30, small, "林叙");
            Label(190, 760, 150, 32, right, Mathf.CeilToInt(game.Player.Health.Current) + " / " + Mathf.CeilToInt(game.Player.Health.Maximum));
            Fill(new Rect(59, 808, 286, 9), new Color(0.16f, 0.24f, 0.26f));
            float health = game.Player.Health.Current / game.Player.Health.Maximum;
            Fill(new Rect(59, 808, 286 * Mathf.Clamp01(health), 9), health < 0.3f ? Amber : Cyan);
            Label(59, 833, 290, 25, small, "Shift 冲刺  ·  Ctrl 蹲下");

            Fill(new Rect(1208, 725, 354, 136), Panel);
            Label(1228, 741, 310, 35, body, game.Weapons.Current.DisplayName);
            Label(1225, 781, 126, 65, number, game.Weapons.Magazine.ToString("00"));
            Label(1360, 798, 170, 40, body, "/  " + game.Weapons.Reserve.ToString("000"));
            if (game.Weapons.IsReloading)
            {
                Fill(new Rect(1230, 849, 305, 4), Line);
                Fill(new Rect(1230, 849, 305 * game.Weapons.ReloadProgress, 4), Cyan);
                Label(1370, 837, 160, 24, right, "换弹中");
            }
            else Label(1230, 837, 300, 24, small, "R 换弹  ·  1 / 2 主副武器");

            if (game.Mode == GameMode.Playing)
            {
                DrawCrosshair();
                if (!string.IsNullOrEmpty(game.InteractionHint))
                {
                    Fill(new Rect(520, 594, 560, 55), Panel);
                    Label(535, 598, 530, 45, centered, game.InteractionHint);
                }
                Label(480, 856, 650, 30, centered, "E 交互   Q 协作   Tab 军械库   Esc 暂停");
            }

            if (!string.IsNullOrEmpty(game.Message) && game.Mode != GameMode.Dialogue)
            {
                Fill(new Rect(415, 690, 770, 85), Panel);
                Label(440, 708, 720, 55, body, game.Message);
            }
        }

        private void DrawCrosshair()
        {
            Color color = game.Weapons.Aiming ? Paper : Cyan;
            float gap = game.Weapons.Aiming ? 5 : 10;
            Fill(new Rect(800 - gap - 9, 449, 9, 2), color);
            Fill(new Rect(800 + gap, 449, 9, 2), color);
            Fill(new Rect(799, 450 - gap - 9, 2, 9), color);
            Fill(new Rect(799, 450 + gap, 2, 9), color);
            Fill(new Rect(799, 449, 2, 2), color);
        }

        private void DrawPause()
        {
            Shade();
            Frame(new Rect(500, 165, 600, 575));
            Label(545, 210, 500, 55, large, "稍等一会儿");
            Label(545, 280, 500, 55, small, "当前任务在这里等你。进度会在目标节点保存。");
            if (Button(new Rect(545, 365, 510, 58), "继续", true)) game.Resume();
            if (Button(new Rect(545, 438, 510, 58), "军械库")) game.OpenArmory();
            if (Button(new Rect(545, 511, 510, 58), "重试当前检查点")) game.RetryCheckpoint();
            if (Button(new Rect(545, 584, 510, 58), "返回主菜单")) game.ReturnToMenu();
            Label(545, 678, 510, 28, small, "WASD 移动  /  右键瞄准  /  左键射击");
        }

        private void DrawArmory()
        {
            Shade();
            Frame(new Rect(45, 40, 1510, 820));
            Label(78, 65, 600, 55, heading, "抵抗军军械库");
            Label(80, 124, 1210, 38, small, "手枪装备副武器槽，其余装备主武器槽。点击即可替换；弹药分别保留。");
            if (Button(new Rect(1320, 70, 195, 50), "返回游戏", true)) game.CloseArmory();

            for (int category = 0; category < CategoryNames.Length; category++)
            {
                float x = 80 + category * 242;
                Label(x, 191, 225, 38, body, CategoryNames[category]);
                Fill(new Rect(x, 232, 220, 2), Line);
                int row = 0;
                foreach (WeaponDefinition definition in game.WeaponDefinitions)
                {
                    if ((int)definition.Category != category) continue;
                    bool equipped = definition.Id == game.Weapons.PrimaryId || definition.Id == game.Weapons.SidearmId;
                    var rect = new Rect(x, 251 + row * 109, 220, 96);
                    if (Button(rect, definition.DisplayName + (equipped ? "\n已装备" : "\n" + definition.MagazineSize + " 发弹匣"), equipped))
                    {
                        selectedWeapon = definition;
                        game.Weapons.Equip(definition.Id);
                        game.ShowMessage("已装备：" + definition.DisplayName);
                    }
                    if (rect.Contains(Event.current.mousePosition)) selectedWeapon = definition;
                    row++;
                }
            }

            Fill(new Rect(80, 713, 1435, 1), Line);
            Label(80, 732, 1400, 37, body, "主武器：" + WeaponName(game.Weapons.PrimaryId) + "    /    副武器：" + WeaponName(game.Weapons.SidearmId));
            if (selectedWeapon != null)
                Label(80, 784, 1400, 36, small, selectedWeapon.DisplayName + "    伤害 " + selectedWeapon.Damage.ToString("0") +
                    "    射速 " + selectedWeapon.ShotsPerSecond.ToString("0.#") + "/秒    换弹 " + selectedWeapon.ReloadSeconds.ToString("0.#") +
                    " 秒    " + (selectedWeapon.Explosive ? "爆炸投射物" : selectedWeapon.Pellets > 1 ? "多弹丸散射" : "直射") + "    ·    数值为游戏平衡参数");
        }

        private string WeaponName(string id)
        {
            foreach (WeaponDefinition definition in game.WeaponDefinitions)
                if (definition.Id == id) return definition.DisplayName;
            return id;
        }

        private void DrawDialogue()
        {
            Fill(new Rect(0, 620, 1600, 280), new Color(0.02f, 0.035f, 0.045f, 0.97f));
            Fill(new Rect(120, 658, 4, 157), Cyan);
            Label(150, 664, 1210, 112, heading, game.DialogueLine);
            if (Button(new Rect(1195, 807, 270, 55), "继续  →", true)) game.ContinueDialogue();
            Label(150, 819, 960, 35, small, "让她把话说完。");
        }

        private void DrawDefeat()
        {
            Shade();
            Frame(new Rect(430, 260, 740, 350));
            Label(480, 300, 650, 70, large, "再试一次");
            Label(480, 390, 640, 60, body, "从当前检查点重新开始。点点的剧情状态由章节决定。");
            if (Button(new Rect(480, 500, 300, 60), "重试", true)) game.RetryCheckpoint();
            if (Button(new Rect(805, 500, 310, 60), "返回主菜单")) game.ReturnToMenu();
        }

        private void DrawChapterComplete()
        {
            Shade();
            Frame(new Rect(350, 205, 900, 480));
            Label(400, 250, 810, 35, small, game.Chapter.DayLabel);
            Label(400, 300, 810, 75, large, game.Chapter.Title);
            Label(400, 399, 790, 105, body, game.Chapter.Summary);
            if (Button(new Rect(400, 565, 400, 65), "继续往前走", true)) game.NextChapter();
            if (Button(new Rect(825, 565, 370, 65), "返回主菜单")) game.ReturnToMenu();
        }

        private void DrawEnding()
        {
            Fill(new Rect(0, 0, 1600, 900), Ink);
            Fill(new Rect(390, 275, 820, 1), Line);
            Label(390, 170, 900, 90, large, "点点滴滴");
            Label(390, 335, 830, 150, heading, "两把椅子和她的名字，\n都还留在游戏里。");
            Label(390, 510, 830, 80, body, "那些一起经历过的事，已经发生过了。");
            if (Button(new Rect(390, 675, 380, 65), "回到主菜单", true)) game.ReturnToMenu();
            Label(390, 785, 830, 35, small, "框架短流程结束 · 继续制作关卡、人物与演出");
        }

        private static void Fill(Rect rect, Color color)
        {
            Color previous = GUI.color;
            GUI.color = color;
            GUI.DrawTexture(rect, Texture2D.whiteTexture);
            GUI.color = previous;
        }

        private static void Frame(Rect rect)
        {
            Fill(rect, Ink);
            Fill(new Rect(rect.x, rect.y, rect.width, 2), Cyan);
            Fill(new Rect(rect.x, rect.yMax - 1, rect.width, 1), Line);
        }

        private static void Shade() => Fill(new Rect(0, 0, 1600, 900), new Color(0f, 0.01f, 0.02f, 0.72f));

        private static void Label(float x, float y, float width, float height, GUIStyle style, string text)
        {
            GUI.Label(new Rect(x, y, width, height), text, style);
        }

        private bool Button(Rect rect, string text, bool emphasis = false)
        {
            bool hovering = rect.Contains(Event.current.mousePosition);
            Color previous = GUI.backgroundColor;
            GUI.backgroundColor = !GUI.enabled ? new Color(0.1f, 0.14f, 0.16f) :
                hovering ? new Color(0.14f, 0.29f, 0.31f) : emphasis ? new Color(0.1f, 0.23f, 0.25f) : new Color(0.08f, 0.14f, 0.17f);
            bool clicked = GUI.Button(rect, text, button);
            GUI.backgroundColor = previous;
            Fill(new Rect(rect.x, rect.yMax - 1, rect.width, 1), emphasis ? Cyan : Line);
            return clicked;
        }
    }
}
