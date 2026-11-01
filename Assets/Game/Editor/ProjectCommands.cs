using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Diandian.Editor
{
    public static class ProjectCommands
    {
        private const string BootScene = "Assets/Game/Scenes/Boot.unity";

        [MenuItem("点点滴滴/打开启动场景")]
        public static void OpenBoot()
        {
            if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
                EditorSceneManager.OpenScene(BootScene);
        }

        [MenuItem("点点滴滴/运行框架原型")]
        public static void PlayPrototype()
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            EditorSceneManager.OpenScene(BootScene);
            EditorApplication.isPlaying = true;
        }

        [MenuItem("点点滴滴/导出 Windows x64")]
        public static void BuildWindows()
        {
            string folder = EditorUtility.SaveFolderPanel("选择构建目录", "", "DiandianDidi");
            if (folder.Length == 0) return;
            BuildReport report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { BootScene },
                locationPathName = System.IO.Path.Combine(folder, "DiandianDidi.exe"),
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            });
            Debug.Log("点点滴滴：" + report.summary.result + " · " + report.summary.totalSize + " bytes");
        }
    }
}
