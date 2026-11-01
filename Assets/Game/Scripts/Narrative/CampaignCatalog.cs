using System;
using UnityEngine;

namespace Diandian
{
    public static class CampaignCatalog
    {
        public static ChapterDefinition[] Load()
        {
            var chapters = Resources.LoadAll<ChapterDefinition>("Story");
            Array.Sort(chapters, (left, right) => left.Order.CompareTo(right.Order));
            return chapters;
        }
    }
}
