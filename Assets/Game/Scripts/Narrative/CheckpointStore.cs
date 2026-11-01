using System.IO;
using UnityEngine;

namespace Diandian
{
    public static class CheckpointStore
    {
        public static string FilePath => Path.Combine(Application.persistentDataPath, "checkpoint.json");
        public static bool Exists => File.Exists(FilePath);

        public static CheckpointData Load()
        {
            return Exists ? JsonUtility.FromJson<CheckpointData>(File.ReadAllText(FilePath)) : null;
        }

        public static void Save(CheckpointData data)
        {
            Directory.CreateDirectory(Application.persistentDataPath);
            File.WriteAllText(FilePath, JsonUtility.ToJson(data, true));
        }

        public static void Delete()
        {
            File.Delete(FilePath);
        }
    }
}
