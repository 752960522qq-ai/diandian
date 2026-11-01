using System;

namespace Diandian
{
    [Serializable]
    public sealed class CheckpointData
    {
        public int version = 1;
        public string chapterId;
        public int chapterOrder;
        public int objectiveIndex;
        public int objectiveProgress;
        public string primaryWeaponId;
        public string sidearmWeaponId;
        public CompanionStage companionStage;
    }
}
