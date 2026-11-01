using System;

namespace Diandian
{
    public sealed class ObjectiveTracker
    {
        private ChapterDefinition chapter;

        public int CurrentIndex { get; private set; }
        public int Progress { get; private set; }
        public bool IsComplete => CurrentIndex == chapter.Objectives.Length;
        public ObjectiveData Current => IsComplete ? null : chapter.Objectives[CurrentIndex];
        public event Action Changed;
        public event Action Completed;

        public void Initialize(ChapterDefinition definition)
        {
            chapter = definition;
            CurrentIndex = 0;
            Progress = 0;
            Changed?.Invoke();
        }

        public void Restore(int index, int progress)
        {
            CurrentIndex = index;
            Progress = progress;
            Changed?.Invoke();
            if (IsComplete) Completed?.Invoke();
        }

        public void Report(ObjectiveKind kind, string targetId, int count = 1)
        {
            if (IsComplete || Current.Kind != kind || Current.Id != targetId) return;

            Progress += count;
            if (Progress >= Current.RequiredCount)
            {
                CurrentIndex++;
                Progress = 0;
            }

            Changed?.Invoke();
            if (IsComplete) Completed?.Invoke();
        }
    }
}
