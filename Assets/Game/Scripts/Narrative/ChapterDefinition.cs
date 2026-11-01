using System;
using UnityEngine;

namespace Diandian
{
    public enum ObjectiveKind { Reach, Interact, Cooperate, Eliminate }
    public enum CompanionStage { Calibration, Trust, Injured, Reversal, Linked, Fading, Silent }

    [Serializable]
    public sealed class ObjectiveData
    {
        public string Id;
        public string Description;
        [TextArea] public string InteractionLine;
        public ObjectiveKind Kind;
        public int RequiredCount = 1;
    }

    [CreateAssetMenu(menuName = "Diandian/Chapter")]
    public sealed class ChapterDefinition : ScriptableObject
    {
        public string Id;
        public int Order;
        public string Title;
        public string DayLabel;
        [TextArea] public string Summary;
        [TextArea] public string[] OpeningLines;
        [TextArea] public string[] ClosingLines;
        public ObjectiveData[] Objectives;
        public CompanionStage Stage;
        public int EnemyCount;
        public string PrimaryWeaponId;
    }
}
